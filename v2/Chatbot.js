import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Chatbot.css';

// PopoutWindow component for pop-out functionality using React Portals
const PopoutWindow = ({ children, onClose }) => {
  const newWindow = useRef(null);
  const containerEl = useRef(document.createElement('div'));

  useEffect(() => {
    // Open a new window
    newWindow.current = window.open('', '', 'width=600,height=400,left=200,top=200');
    newWindow.current.document.body.appendChild(containerEl.current);

    const handleWindowClose = () => {
      if (onClose) onClose();
      newWindow.current.close();
    };

    newWindow.current.addEventListener('beforeunload', handleWindowClose);

    return () => {
      newWindow.current.removeEventListener('beforeunload', handleWindowClose);
      newWindow.current.close();
    };
  }, [onClose]);

  return ReactDOM.createPortal(children, containerEl.current);
};

// Chatbot component with message recall using UP and DOWN keys
const Chatbot = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', content: 'Welcome to CARIBot!' }]);
  const [userMessage, setUserMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState([]); // Store user message history
  const [historyIndex, setHistoryIndex] = useState(-1); // Track the history index
  const messageEndRef = useRef(null);

  // Function to auto-scroll to the bottom of the chat
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Auto scroll to the bottom whenever messages change
    scrollToBottom();
  }, [messages]);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const togglePopout = () => {
    setIsPoppedOut(!isPoppedOut);
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    // Display the user's message immediately
    const newMessage = { sender: 'user', content: userMessage };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    
    // Save to message history and reset history index
    setMessageHistory((prevHistory) => [...prevHistory, userMessage]);
    setHistoryIndex(-1); // Reset index when a new message is sent

    setUserMessage(''); // Clear the input after sending

    try {
      // Send the message to the backend
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: userMessage }),
      });

      const data = await response.json();
      // Add bot response to the chat
      setMessages((prevMessages) => [...prevMessages, { sender: 'bot', content: data.botResponse }]);
    } catch (error) {
      console.error('Error sending message to backend:', error);
    }
  };

  // Handle Enter key to send the message and UP/DOWN keys for message recall
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    } else if (e.key === 'ArrowUp') {
      handleRecallMessage('up');
    } else if (e.key === 'ArrowDown') {
      handleRecallMessage('down');
    }
  };

  // Function to handle message recall with UP and DOWN arrow keys
  const handleRecallMessage = (direction) => {
    if (direction === 'up') {
      if (historyIndex < messageHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setUserMessage(messageHistory[messageHistory.length - 1 - newIndex]);
      }
    } else if (direction === 'down') {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setUserMessage(messageHistory[messageHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setUserMessage('');
      }
    }
  };

  return (
    <>
      <div className="main-page">
        {!isPoppedOut ? (
          <div className={`chatbot-container ${isMaximized ? 'maximized' : ''}`}>
            <div className="chatbot-header">
              <div className="chatbot-title">
                <img src={require('./assets/chase_image.png')} alt="Chase Logo" className="chase-logo" />
                <h1>CARIBot</h1>
              </div>
              <div className="chatbot-controls">
                <button className="control-btn minimize-btn" onClick={() => window.alert('Minimize clicked!')}>_</button>
                <button className="control-btn maximize-btn" onClick={toggleMaximize}>
                  {isMaximized ? '⤢' : '❒'}
                </button>
                <button className="control-btn popout-btn" onClick={togglePopout}>⧉</button>
              </div>
            </div>
            <div className="chatbot-messages">
              {messages.map((msg, index) => (
                <p key={index} className={msg.sender === 'bot' ? 'bot-message' : 'user-message'}>
                  {msg.content}
                </p>
              ))}
              <div ref={messageEndRef} /> {/* This empty div is used for scrolling to the bottom */}
            </div>
            <div className="chatbot-footer">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyPress}  // Handle Enter, UP, and DOWN keys
                placeholder="Type your message..."
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        ) : (
          <PopoutWindow onClose={() => setIsPoppedOut(false)}>
            <div className={`chatbot-container ${isMaximized ? 'maximized' : ''}`}>
              <div className="chatbot-header">
                <div className="chatbot-title">
                  <img src={require('./assets/chase_image.png')} alt="Chase Logo" className="chase-logo" />
                  <h1>CARIBot</h1>
                </div>
                <div className="chatbot-controls">
                  <button className="control-btn minimize-btn" onClick={() => window.alert('Minimize clicked!')}>_</button>
                  <button className="control-btn maximize-btn" onClick={toggleMaximize}>
                    {isMaximized ? '⤢' : '❒'}
                  </button>
                  <button className="control-btn popout-btn" onClick={togglePopout}>⧉</button>
                </div>
              </div>
              <div className="chatbot-messages">
                {messages.map((msg, index) => (
                  <p key={index} className={msg.sender === 'bot' ? 'bot-message' : 'user-message'}>
                    {msg.content}
                  </p>
                ))}
                <div ref={messageEndRef} /> {/* This empty div is used for scrolling to the bottom */}
              </div>
              <div className="chatbot-footer">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={handleKeyPress}  // Handle Enter, UP, and DOWN keys
                  placeholder="Type your message..."
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </div>
          </PopoutWindow>
        )}
      </div>
    </>
  );
};

export default Chatbot;
