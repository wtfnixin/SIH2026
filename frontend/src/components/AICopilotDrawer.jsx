import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, ArrowRight, CornerDownLeft, Maximize2 } from 'lucide-react';

export default function AICopilotDrawer({
  onNavigateGraph,
  onSelectEntity,
  onAction,
  onOpenFullScreen,
  chatHistory: propChatHistory,
  setChatHistory: propSetChatHistory
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [internalChatHistory, setInternalChatHistory] = useState([
    {
      sender: 'ai',
      text: "👋 Welcome Officer! I am Sathi, your AI Cyber Intelligence Copilot. Ask me to search suspects, analyze Hawala rings, or locate burner SIMs. I will guide you and open their network graph automatically.",
      multipleMatches: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const chatHistory = propChatHistory || internalChatHistory;
  const setChatHistory = propSetChatHistory || setInternalChatHistory;

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = (customText = null, targetIdOverride = null) => {
    const textToSend = customText || inputMsg;
    if (!textToSend.trim() && !targetIdOverride) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!targetIdOverride) {
      setChatHistory(prev => [...prev, { sender: 'user', text: textToSend, timestamp: timeStr }]);
      setInputMsg('');
    }

    setLoading(true);

    fetch('http://localhost:8000/api/v1/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: textToSend,
        selected_target_id: targetIdOverride
      })
    })
      .then(res => res.json())
      .then(data => {
        const aiTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'ai',
            text: data.response,
            multipleMatches: data.multiple_matches || [],
            uiAction: data.ui_action || null,
            timestamp: aiTimeStr
          }
        ]);
        setLoading(false);

        // Execute automated UI action navigation if returned!
        if (data.ui_action && data.ui_action.type === 'NAVIGATE_GRAPH' && data.ui_action.target_id) {
          if (onNavigateGraph) {
            onNavigateGraph(data.ui_action.target_id);
          }
          if (onAction) {
            onAction(data.ui_action);
          }
        }
      })
      .catch(err => {
        console.error('Copilot API error:', err);
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'ai',
            text: "⚠️ System Offline: Unable to reach Copilot backend service.",
            multipleMatches: [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
      });
  };

  const suggestionChips = [
    "Search Vikrant Sharma",
    "Show Hawala Smurfing Ring",
    "Lookup +91-98765-43210",
    "Find Hebbal Syndicate"
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Sathi - AI Intel Copilot"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(6, 182, 212, 0.45)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(6, 182, 212, 0.65)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(6, 182, 212, 0.45)';
          }}
          className="copilot-toggle-btn"
        >
          <Bot size={22} />
        </button>
      )}

      {/* Copilot Drawer Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '420px',
          height: '600px',
          maxHeight: '85vh',
          maxWidth: '90vw',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(30, 41, 59, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.2)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22d3ee'
              }}>
                <Bot size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '0.04em' }}>
                  SATHI · AI COPILOT
                </h3>
                <p style={{ fontSize: '10px', color: '#34d399', margin: 0, fontWeight: 600 }}>
                  ● LIVE GRAPH SEARCH & NAVIGATION
                </p>
              </div>
            </div>

            {/* Header Action Buttons: Full Screen & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenFullScreen) onOpenFullScreen();
                }}
                title="Expand Sathi to Full Screen"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: '#22d3ee',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                  e.currentTarget.style.borderColor = '#22d3ee';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                }}
              >
                <Maximize2 size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.18s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips (Zero scrollbar) */}
          <div
            className="copilot-chips-container"
            style={{
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  color: '#22d3ee',
                  fontSize: '11px',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.22)';
                  e.currentTarget.style.borderColor = '#22d3ee';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)';
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div style={{
            flex: 1,
            padding: '14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  background: msg.sender === 'user' 
                    ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' 
                    : 'rgba(30, 41, 59, 0.8)',
                  color: '#f8fafc',
                  border: msg.sender === 'user' 
                    ? 'none' 
                    : '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                  {/* Render Disambiguation Candidate Cards if Multiple Matches Returned */}
                  {msg.multipleMatches && msg.multipleMatches.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700, margin: '0 0 4px 0' }}>
                        SELECT TARGET TO OPEN GRAPH:
                      </p>
                      {msg.multipleMatches.map((cand, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => handleSendMessage(`Selected target ${cand.entity_id}`, cand.entity_id)}
                          style={{
                            padding: '8px 10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(6, 182, 212, 0.4)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.2s'
                          }}
                          className="candidate-card"
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '12px' }}>
                              {cand.entity_id}
                            </span>
                            <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
                              {cand.details}
                            </p>
                          </div>
                          <button style={{
                            background: '#06b6d4',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}>
                            Target <ArrowRight size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22d3ee', fontSize: '12px' }}>
                <Sparkles size={14} className="spin-anim" />
                <span>Sathi is analyzing graph data & navigating...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div style={{
            padding: '12px',
            background: 'rgba(30, 41, 59, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Sathi: suspect name, phone, plate..."
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              style={{
                background: '#06b6d4',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
