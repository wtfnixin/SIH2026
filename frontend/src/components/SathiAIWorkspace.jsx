import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ArrowRight,
  Search,
  ShieldCheck,
  Network,
  FileText,
  Car,
  RefreshCw,
  ArrowLeft,
  Zap,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Separator,
  ScrollArea
} from './ui';

export default function SathiAIWorkspace({
  theme = 'light',
  onToggleTheme,
  onNavigateGraph,
  onOpenDossier,
  onOpenGeoMap,
  onBackToDashboard
}) {
  const [workspaceTheme, setWorkspaceTheme] = useState(theme || 'light');

  useEffect(() => {
    if (theme) {
      setWorkspaceTheme(theme);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = workspaceTheme === 'light' ? 'dark' : 'light';
    setWorkspaceTheme(nextTheme);
    if (onToggleTheme) {
      onToggleTheme();
    }
  };

  const isLight = workspaceTheme === 'light';
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: "Namaste Officer. Sathi is online and synchronized with the investigation graph and ANPR feeds. How can I assist your case today?",
      multipleMatches: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleSendMessage = (customText = null, targetIdOverride = null) => {
    const textToSend = customText || inputMsg;
    if (!textToSend.trim() && !targetIdOverride) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!targetIdOverride) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'user', text: textToSend, timestamp: timeStr }
      ]);
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

        if (data.ui_action && data.ui_action.type === 'NAVIGATE_GRAPH' && data.ui_action.target_id) {
          if (onNavigateGraph) {
            onNavigateGraph(data.ui_action.target_id);
          }
        }
      })
      .catch(err => {
        console.error('Sathi Copilot error:', err);
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'ai',
            text: "Backend service unreachable. Please ensure the server container is active.",
            multipleMatches: [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
      });
  };

  const quickPrompts = [
    { label: 'Vikrant Sharma', tag: 'Suspect', query: 'Search Vikrant Sharma' },
    { label: 'Hawala Smurfing Ring', tag: 'Hawala', query: 'Show Hawala Smurfing Ring' },
    { label: '+91-98765-43210', tag: 'SIM / Tower', query: 'Lookup +91-98765-43210' },
    { label: 'Hebbal Syndicate', tag: 'Syndicate', query: 'Find Hebbal Syndicate' },
    { label: 'Plate MH-12-PQ-9981', tag: 'ANPR', query: 'Track vehicle plate MH-12-PQ-9981' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: isLight ? '#f8fafc' : '#030712',
      color: isLight ? '#0f172a' : '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.2s ease, color 0.2s ease'
    }}>
      {/* ── TOP HEADER (SHADCN CARD) ── */}
      <Card
        className="sathi-header-card"
        style={{
          margin: '14px 20px 0 20px',
          padding: '12px 20px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBackToDashboard && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onBackToDashboard}
              title="Return to Main Dashboard"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </Button>
          )}

          <div style={{
            width: 40,
            height: 40,
            borderRadius: '14px',
            background: isLight
              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.25) 100%)',
            border: `1px solid ${isLight ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isLight ? '0 2px 8px rgba(6, 182, 212, 0.15)' : '0 4px 14px rgba(6, 182, 212, 0.2)'
          }}>
            <Bot size={21} color={isLight ? '#0284c7' : '#22d3ee'} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '16px',
                fontWeight: 800,
                color: isLight ? '#0f172a' : '#f8fafc',
                letterSpacing: '0.02em'
              }}>
                Sathi
              </span>
              <Badge variant="success">
                ACTIVE
              </Badge>
            </div>
            <p style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', margin: '2px 0 0 0' }}>
              AI Cyber Intelligence Copilot
            </p>
          </div>
        </div>

        {/* Header Action Buttons (Shadcn Buttons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleTheme}
            title={`Switch to ${isLight ? 'Dark' : 'White'} Theme`}
          >
            {isLight ? <Moon size={13} color="#0284c7" /> : <Sun size={13} color="#38bdf8" />}
            <span>{isLight ? 'Dark Theme' : 'White Theme'}</span>
          </Button>

          {onOpenGeoMap && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenGeoMap}
              title="Open ANPR Movement Map"
            >
              <Car size={13} color={isLight ? '#0284c7' : '#06b6d4'} />
              <span>ANPR Map</span>
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setChatHistory([
              {
                sender: 'ai',
                text: "Chat reset. Ready for your investigation query, Officer.",
                multipleMatches: [],
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ])}
            title="Reset Chat History"
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </Button>
        </div>
      </Card>

      {/* ── WORKSPACE BODY WITH SHADCN CARDS & CURVED EDGES ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        padding: '14px 20px 20px 20px',
        gap: '16px',
        overflow: 'hidden'
      }}>
        {/* Main Chat Panel (Shadcn Card) */}
        <Card
          className="sathi-chat-panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderRadius: '24px',
            overflow: 'hidden',
            padding: 0
          }}
        >
          {/* Messages Scroll Area */}
          <ScrollArea
            style={{
              flex: 1,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatHistory.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '100%'
                    }}
                  >
                    <div style={{
                      fontSize: '10px',
                      color: isLight ? '#94a3b8' : '#64748b',
                      fontWeight: 600,
                      marginBottom: '4px',
                      padding: '0 4px'
                    }}>
                      {isUser ? 'You' : 'Sathi'} · {msg.timestamp}
                    </div>

                    <div style={{
                      maxWidth: isUser ? '72%' : '84%',
                      padding: '12px 18px',
                      borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      background: isUser
                        ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                        : isLight
                        ? '#f1f5f9'
                        : 'rgba(15, 23, 42, 0.88)',
                      color: isUser ? '#ffffff' : isLight ? '#0f172a' : '#f8fafc',
                      border: isUser
                        ? 'none'
                        : isLight
                        ? '1px solid #e2e8f0'
                        : '1px solid rgba(56, 189, 248, 0.2)',
                      boxShadow: isUser
                        ? '0 6px 20px rgba(2, 132, 199, 0.3)'
                        : isLight
                        ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                        : '0 6px 20px rgba(0, 0, 0, 0.4)'
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                      {/* Disambiguation Matches */}
                      {msg.multipleMatches && msg.multipleMatches.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ fontSize: '10.5px', color: isLight ? '#b45309' : '#fbbf24', fontWeight: 800 }}>
                            Select Target:
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                            {msg.multipleMatches.map((cand, cIdx) => (
                              <div
                                key={cIdx}
                                onClick={() => handleSendMessage(`Selected target ${cand.entity_id}`, cand.entity_id)}
                                style={{
                                  padding: '8px 12px',
                                  background: isLight ? '#ffffff' : 'rgba(2, 6, 23, 0.85)',
                                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(6, 182, 212, 0.3)'}`,
                                  borderRadius: '14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.18s'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = '#0284c7';
                                  e.currentTarget.style.background = isLight ? '#f0f9ff' : 'rgba(6, 182, 212, 0.12)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = isLight ? '#cbd5e1' : 'rgba(6, 182, 212, 0.3)';
                                  e.currentTarget.style.background = isLight ? '#ffffff' : 'rgba(2, 6, 23, 0.85)';
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 800, color: isLight ? '#0284c7' : '#38bdf8', fontSize: '12px' }}>
                                    {cand.entity_id}
                                  </div>
                                  <div style={{ fontSize: '9.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                                    {cand.details}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  style={{ padding: '3px 8px', fontSize: '9.5px', borderRadius: '8px' }}
                                >
                                  Focus <ArrowRight size={10} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Entity Action Buttons */}
                      {msg.uiAction && msg.uiAction.target_id && (
                        <div style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          {onNavigateGraph && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onNavigateGraph(msg.uiAction.target_id)}
                              style={{
                                background: isLight ? '#e0f2fe' : 'rgba(6, 182, 212, 0.15)',
                                borderColor: isLight ? '#7dd3fc' : 'rgba(6, 182, 212, 0.4)',
                                color: isLight ? '#0369a1' : '#38bdf8'
                              }}
                            >
                              <Network size={12} />
                              <span>View Graph</span>
                            </Button>
                          )}
                          {onOpenDossier && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onOpenDossier(msg.uiAction.target_id)}
                              style={{
                                background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.15)',
                                borderColor: isLight ? '#86efac' : 'rgba(16, 185, 129, 0.4)',
                                color: isLight ? '#15803d' : '#34d399'
                              }}
                            >
                              <FileText size={12} />
                              <span>Open Dossier</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: isLight ? '#0284c7' : '#38bdf8',
                  fontSize: '12px',
                  padding: '10px 16px',
                  background: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.8)',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(56, 189, 248, 0.25)'}`,
                  borderRadius: '16px',
                  maxWidth: '300px'
                }}>
                  <Sparkles size={14} className="spin-anim" />
                  <span>Analyzing intelligence...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Prompts Carousel (Curved chips) */}
          <div
            className="copilot-chips-container"
            style={{
              padding: '10px 20px',
              background: isLight ? '#f8fafc' : 'rgba(8, 14, 26, 0.8)',
              borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}`,
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(6, 182, 212, 0.08)',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(6, 182, 212, 0.25)'}`,
                  color: isLight ? '#0284c7' : '#22d3ee',
                  fontSize: '11px',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isLight ? '#f0f9ff' : 'rgba(6, 182, 212, 0.2)';
                  e.currentTarget.style.borderColor = '#0284c7';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isLight ? '#ffffff' : 'rgba(6, 182, 212, 0.08)';
                  e.currentTarget.style.borderColor = isLight ? '#cbd5e1' : 'rgba(6, 182, 212, 0.25)';
                }}
              >
                <Zap size={11} color={isLight ? '#0284c7' : '#38bdf8'} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Input Dock (Shadcn Input & Button) */}
          <div style={{
            padding: '12px 20px 16px 20px',
            background: isLight ? '#ffffff' : 'rgba(8, 14, 26, 0.95)',
            borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(56, 189, 248, 0.15)'}`,
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <div style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search
                size={14}
                color={isLight ? '#0284c7' : '#38bdf8'}
                style={{ position: 'absolute', left: '14px', pointerEvents: 'none', zIndex: 1 }}
              />
              <Input
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask Sathi a query, suspect name, phone, or plate..."
                style={{
                  paddingLeft: '38px',
                  borderRadius: '16px',
                  height: '42px'
                }}
              />
            </div>

            <Button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMsg.trim()}
              size="default"
              style={{
                borderRadius: '14px',
                height: '42px',
                padding: '0 20px'
              }}
            >
              <span>Send</span>
              <Send size={13} />
            </Button>
          </div>
        </Card>

        {/* Right Side: Quick Action Playbooks Panel (Shadcn Card) */}
        <Card
          className="sathi-actions-panel"
          style={{
            width: '290px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 18px',
            overflowY: 'auto',
            gap: '16px'
          }}
        >
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: isLight ? '#0284c7' : '#38bdf8',
              letterSpacing: '0.08em',
              marginBottom: '4px'
            }}>
              QUICK ACTIONS
            </div>
            <CardDescription style={{ fontSize: '11.5px', margin: 0 }}>
              Launch targeted intelligence investigations.
            </CardDescription>
          </div>

          {/* Clean Action Cards (Curved Shadcn Cards) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {quickPrompts.map((p, idx) => (
              <div
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                style={{
                  background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(56, 189, 248, 0.2)'}`,
                  borderRadius: '16px',
                  padding: '11px 13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#0284c7';
                  e.currentTarget.style.background = isLight ? '#f0f9ff' : 'rgba(6, 182, 212, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isLight ? '#e2e8f0' : 'rgba(56, 189, 248, 0.2)';
                  e.currentTarget.style.background = isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.85)';
                }}
              >
                <div>
                  <Badge variant="cyan" style={{ fontSize: '8.5px', padding: '2px 7px' }}>
                    {p.tag}
                  </Badge>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isLight ? '#0f172a' : '#f1f5f9',
                    marginTop: '4px'
                  }}>
                    {p.label}
                  </div>
                </div>
                <ArrowRight size={13} color={isLight ? '#94a3b8' : '#64748b'} />
              </div>
            ))}
          </div>

          {/* Subtle Audit Status at Bottom (Curved Badge / Alert Card) */}
          <div style={{
            marginTop: 'auto',
            background: isLight ? '#f0fdf4' : 'rgba(6, 182, 212, 0.05)',
            border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(6, 182, 212, 0.18)'}`,
            borderRadius: '14px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} color="#10b981" />
            <span style={{ fontSize: '10.5px', color: isLight ? '#15803d' : '#94a3b8', fontWeight: 600 }}>
              Audit Logged & Verified
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
