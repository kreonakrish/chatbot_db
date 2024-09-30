import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Rnd } from "react-rnd";
import './Chatbot.css';

// PopoutWindow component for pop-out functionality using React Portals
const PopoutWindow = ({ children, onClose }) => {
  const newWindow = useRef(null);
  const containerEl = useRef(document.createElement('div'));

  useEffect(() => {
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

// Chatbot component with minimize functionality and resizing
const Chatbot = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', content: 'Welcome to CARIBot!' }]);
  const [userMessage, setUserMessage] = useState('');
  const messageEndRef = useRef(null);
  const [size, setSize] = useState({ width: 320, height: 400 });
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: window.innerHeight - 450 });

  // Function to auto-scroll to the bottom of the chat
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Auto scroll to the bottom whenever messages change
    scrollToBottom();
  }, [messages]);

  const toggleMaximize = () => {
    if (isMaximized) {
      setSize({ width: 320, height: 400 });
      setPosition({ x: window.innerWidth - 350, y: window.innerHeight - 450 });
    } else {
      setSize({ width: '100vw', height: '100vh' });
      setPosition({ x: 0, y: 0 });
    }
    setIsMaximized(!isMaximized);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const togglePopout = () => {
    setIsPoppedOut(!isPoppedOut);
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessage = { sender: 'user', content: userMessage };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setUserMessage(''); 

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: userMessage }),
      });

      const data = await response.json();
      setMessages((prevMessages) => [...prevMessages, { sender: 'bot', content: data.botResponse }]);
    } catch (error) {
      console.error('Error sending message to backend:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Render minimized chatbox icon
  if (isMinimized) {
    return (
      <div className="chatbot-minimized" onClick={toggleMinimize} style={{ bottom: 20, right: 20, position: 'fixed' }}>
        <span>💬 Open CARIBot</span>
      </div>
    );
  }

  return (
    <>
      <div className="main-page">
        {!isPoppedOut ? (
          <Rnd
            className={`chatbot-container ${isMaximized ? 'maximized' : ''}`}
            size={size}
            position={position}
            onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
            onResizeStop={(e, direction, ref, delta, newPosition) => {
              setSize({
                width: ref.style.width,
                height: ref.style.height
              });
              setPosition(newPosition);
            }}
            minWidth={200}
            minHeight={200}
            bounds="window"
            enableResizing={{
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }}
            dragHandleClassName="chatbot-header"  // Dragging happens only from the header
          >
            <div className="chatbot-header">
              <div className="chatbot-title">
                <img src={require('./assets/chase_image.png')} alt="Chase Logo" className="chase-logo" />
                <h1>CARIBot</h1>
              </div>
              <div className="chatbot-controls">
                <button className="control-btn minimize-btn" onClick={toggleMinimize}>_</button>
                <button className="control-btn maximize-btn" onClick={toggleMaximize}>
                  {isMaximized ? '❒' : '⤢'}
                </button>
                <button className="control-btn popout-btn" onClick={togglePopout}>⧉</button>
              </div>
            </div>
            <div className="chatbot-body">
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
                  onKeyPress={handleKeyPress}  // Handle Enter key
                  placeholder="Type your message..."
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </div>
          </Rnd>
        ) : (
          <PopoutWindow onClose={() => setIsPoppedOut(false)}>
            <Rnd
              className={`chatbot-container ${isMaximized ? 'maximized' : ''}`}
              size={size}
              position={position}
              onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
              onResizeStop={(e, direction, ref, delta, newPosition) => {
                setSize({
                  width: ref.style.width,
                  height: ref.style.height
                });
                setPosition(newPosition);
              }}
              minWidth={200}
              minHeight={200}
              bounds="window"
              enableResizing={{
                top: true,
                right: true,
                bottom: true,
                left: true,
                topRight: true,
                bottomRight: true,
                bottomLeft: true,
                topLeft: true,
              }}
              dragHandleClassName="chatbot-header"  // Dragging happens only from the header
            >
              <div className="chatbot-header">
                <div className="chatbot-title">
                  <img src={require('./assets/chase_image.png')} alt="Chase Logo" className="chase-logo" />
                  <h1>CARIBot</h1>
                </div>
                <div className="chatbot-controls">
                  <button className="control-btn minimize-btn" onClick={toggleMinimize}>_</button>
                  <button className="control-btn maximize-btn" onClick={toggleMaximize}>
                    {isMaximized ? '❒' : '⤢'}
                  </button>
                  <button className="control-btn popout-btn" onClick={togglePopout}>⧉</button>
                </div>
              </div>
              <div className="chatbot-body">
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
                    onKeyPress={handleKeyPress}  // Handle Enter key
                    placeholder="Type your message..."
                  />
                  <button onClick={handleSendMessage}>Send</button>
                </div>
              </div>
            </Rnd>
          </PopoutWindow>
        )}
      </div>
    </>
  );
};

export default Chatbot;
