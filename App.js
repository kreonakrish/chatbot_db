import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaCommentDots } from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';
import './App.css';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [popupWindow, setPopupWindow] = useState(null); // Track the pop-out window
  const chatHistoryRef = useRef(null); // Ref for auto-scrolling

  // Scroll to the bottom of the chat after every message
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (userInput.trim() === '') return;

    const newChatHistory = [...chatHistory, { sender: 'user', text: userInput }];
    setChatHistory(newChatHistory);
    setUserInput('');

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        userInput: userInput,
      });
      setChatHistory([
        ...newChatHistory,
        { sender: 'bot', text: response.data.botResponse },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Function to pop out the chat UI into a new window
  const handlePopOut = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
      return;
    }

    const newWindow = window.open(
      '',
      '_blank',
      'width=400,height=600,resizable,scrollbars=yes'
    );

    newWindow.document.write('<div id="popup-root"></div>');
    setPopupWindow(newWindow);

    const popupRoot = newWindow.document.getElementById('popup-root');
    if (popupRoot) {
      const popupChat = (
        <ChatWindow
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          userInput={userInput}
          setUserInput={setUserInput}
          handleSendMessage={handleSendMessage}
        />
      );
      newWindow.document.title = 'Chatbot';
      ReactDOM.render(popupChat, popupRoot);
    }

    newWindow.onbeforeunload = () => {
      setPopupWindow(null);
    };
  };

  return (
    <div className="App">
      <motion.div
        className="chat-icon"
        onClick={() => setIsOpen(!isOpen)}
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        <FaCommentDots size={30} />
      </motion.div>

      {isOpen && !isMinimized && (
        <ChatWindow
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          userInput={userInput}
          setUserInput={setUserInput}
          handleSendMessage={handleSendMessage}
          onMinimize={() => setIsMinimized(true)}
          onPopOut={handlePopOut}
          onClose={() => setIsOpen(false)}
        />
      )}

      {isMinimized && (
        <motion.div
          className="minimized-chat"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <button className="maximize-button" onClick={() => setIsMinimized(false)}>
            ↑
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Chat window component, shared between the main and pop-out window
function ChatWindow({
  chatHistory,
  setChatHistory,
  userInput,
  setUserInput,
  handleSendMessage,
  onMinimize,
  onPopOut,
  onClose
}) {
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <motion.div
      className="chat-container"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <div className="chat-header">
        <h3>Chatbot</h3>
        <div className="header-buttons">
          {/* Minimize button */}
          <button className="minimize-button" onClick={onMinimize}>
            –
          </button>

          {/* Pop-out button */}
          <button className="pop-out-button" onClick={onPopOut}>
            ↗
          </button>

          {/* Close button */}
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <div className="chat-history" ref={chatHistoryRef}>
        {chatHistory.map((chat, index) => (
          <div key={index} className={`chat-message ${chat.sender}`}>
            {chat.text}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </motion.div>
  );
}

export default App;
