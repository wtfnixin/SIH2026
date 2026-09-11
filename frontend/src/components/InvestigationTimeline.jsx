import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Filter,
  Search,
  Users,
  AlertTriangle,
  FileText,
  Network,
  HelpCircle,
  TrendingUp,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  FileDown,
  X,
  ExternalLink,
  Phone,
  Car,
  MapPin,
  Landmark,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function InvestigationTimeline({ onNavigateGraph, initialEntity = null }) {
  const { authFetch } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caseId, setCaseId] = useState('CASE-2026-101');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [searchEntity, setSearchEntity] = useState(initialEntity || '');
  const [multiEntities, setMultiEntities] = useState([]);
  
  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [explainabilityData, setExplainabilityData] = useState(null);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [briefData, setBriefData] = useState(null);
  const [showBriefModal, setShowBriefModal] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [selectedEventType, searchEntity, multiEntities]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/timeline?case_id=${encodeURIComponent(caseId)}`;
      if (selectedEventType !== 'ALL') {
        url += `&event_type=${encodeURIComponent(selectedEventType)}`;
      }
      if (searchEntity.trim()) {
        url += `&entity_id=${encodeURIComponent(searchEntity.trim())}`;
      }

      const res = await authFetch(url);
      const data = await res.json();
      setEvents(data.events || []);

      // Fetch analytics
      const analyticsRes = await authFetch(`/api/v1/timeline/analytics${searchEntity ? `?entity_id=${encodeURIComponent(searchEntity)}` : ''}`);
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchExplainability = async (entityId) => {
    try {
      const res = await authFetch(`/api/v1/timeline/explain/${encodeURIComponent(entityId)}`);
      const data = await res.json();
      setExplainabilityData(data);
      setShowExplainModal(true);
    } catch (err) {
      console.error('Explainability error:', err);
    }
  };

  const handleGenerateBrief = async () => {
    try {
      const url = `/api/v1/timeline/brief?case_id=${encodeURIComponent(caseId)}${searchEntity ? `&entity_id=${encodeURIComponent(searchEntity)}` : ''}`;
      const res = await authFetch(url);
      const data = await res.json();
      setBriefData(data);
      setShowBriefModal(true);
    } catch (err) {
      console.error('Brief generation error:', err);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'CALL':
      case 'MESSAGE':
        return <Phone size={15} className="text-cyan-400" />;
      case 'TRANSACTION':
        return <Landmark size={15} className="text-emerald-400" />;
      case 'VEHICLE_MOVEMENT':
        return <Car size={15} className="text-amber-400" />;
      case 'LOCATION':
      case 'SURVEILLANCE':
        return <MapPin size={15} className="text-rose-400" />;
      case 'CRIME':
      case 'ARREST':
        return <ShieldAlert size={15} className="text-purple-400" />;
      default:
        return <Clock size={15} className="text-slate-400" />;
    }
  };

  return (
    <div className="timeline-container" style={{ padding: '24px', background: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={24} color="#38bdf8" />
            <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.6px', margin: 0 }}>INVESTIGATION CHRONOLOGY & TIMELINE RECONSTRUCTION</h1>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
            TIME-AWARE RECONSTRUCTION • EVIDENCE TRACEABILITY • TEMPORAL ANOMALY DETECTION
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {searchEntity && (
            <button
              onClick={() => handleFetchExplainability(searchEntity)}
              style={{
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                color: '#facc15',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <HelpCircle size={14} />
              <span>WHY FLAGGED?</span>
            </button>
          )}

          <button
            onClick={handleGenerateBrief}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
            }}
          >
            <FileText size={14} />
            <span>GENERATE INVESTIGATION BRIEF</span>
          </button>
        </div>
      </div>

      {/* Analytics & Metrics Strip */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '14px 18px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>TEMPORAL CORRELATION SCORE</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>
              {analytics.temporal_correlation_score} <span style={{ fontSize: '12px', color: '#64748b' }}>/ 100</span>
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '14px 18px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>RECORDED EVENTS</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>
              {events.length}
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '14px 18px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>ACTIVITY BURSTS DETECTED</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#facc15', marginTop: '4px' }}>
              {analytics.activity_bursts?.length || 0}
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '14px 18px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>INVESTIGATION ACTIVITY GAPS</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f87171', marginTop: '4px' }}>
              {analytics.activity_gaps?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filter & Controls Bar */}
      <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '14px 18px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#030712', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px' }}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Filter timeline by officer/suspect name, phone (+91...), or vehicle plate..."
            value={searchEntity}
            onChange={(e) => setSearchEntity(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#f8fafc', outline: 'none', width: '100%', fontSize: '12px' }}
          />
          {searchEntity && <X size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchEntity('')} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="#94a3b8" />
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{ background: '#030712', border: '1px solid #334155', color: '#f8fafc', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
          >
            <option value="ALL">All Event Types</option>
            <option value="CALL">Calls & Messages</option>
            <option value="TRANSACTION">Financial Transfers</option>
            <option value="VEHICLE_MOVEMENT">Vehicle Movements</option>
            <option value="LOCATION">Surveillance & Location</option>
            <option value="CRIME">Crime & FIR Events</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream UI */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
          RECONSTRUCTING CHRONOLOGICAL EVIDENCE STREAM...
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: '#0f172a', borderRadius: '8px', border: '1px dashed #334155' }}>
          No timeline events matching the current search parameters.
        </div>
      ) : (
        <div className="timeline-feed" style={{ position: 'relative', paddingLeft: '30px' }}>
          {/* Vertical Timeline Axis Line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '12px', width: '2px', background: 'linear-gradient(180deg, #38bdf8, #818cf8, transparent)' }} />

          {events.map((ev, idx) => (
            <div
              key={ev.event_id}
              style={{
                position: 'relative',
                marginBottom: '20px',
                background: '#0f172a',
                border: selectedEvent?.event_id === ev.event_id ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.15)',
                borderRadius: '8px',
                padding: '16px 20px',
                boxShadow: selectedEvent?.event_id === ev.event_id ? '0 0 20px rgba(56, 189, 248, 0.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedEvent(ev)}
            >
              {/* Timeline Marker Node */}
              <div
                style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '20px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#090d16',
                  border: '2px solid #38bdf8',
                  boxShadow: '0 0 10px #38bdf8'
                }}
              />

              {/* Event Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getEventIcon(ev.event_type)}
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>{ev.title}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {ev.event_type}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                  {new Date(ev.timestamp_start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>

              {/* Event Body Description */}
              <p style={{ fontSize: '12.5px', color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                {ev.description}
              </p>

              {/* Participants & Source Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '10px', fontSize: '11px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>PARTICIPANTS:</span>
                  {ev.participants.map((p, i) => (
                    <span key={i} style={{ background: '#1e293b', color: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
                      {p.entity_id} <span style={{ color: '#64748b', fontSize: '9.5px' }}>({p.role})</span>
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    EVIDENCE: {ev.source_id}
                  </span>

                  {onNavigateGraph && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateGraph(ev.participants[0]?.entity_id);
                      }}
                      style={{ background: 'transparent', border: '1px solid #334155', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10.5px' }}
                    >
                      View in Graph ➔
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explainability Side Drawer */}
      {showExplainModal && explainabilityData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '480px', background: '#0b0f19', borderLeft: '1px solid rgba(56, 189, 248, 0.3)', height: '100%', padding: '28px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#facc15', margin: 0 }}>EXPLAINABILITY & EVIDENCE REASONING</h2>
              <X size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setShowExplainModal(false)} />
            </div>

            <div style={{ background: '#0f172a', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>TARGET ENTITY</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>{explainabilityData.entity_id}</div>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Investigation Priority Score:</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#facc15' }}>{explainabilityData.investigation_priority_score} / 100</span>
              </div>
            </div>

            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '10px' }}>WHY WAS THIS TARGET SURFACED?</h3>
            <ul style={{ paddingLeft: '20px', fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.6' }}>
              {explainabilityData.why_flagged.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>{reason}</li>
              ))}
            </ul>

            <div style={{ background: '#030712', border: '1px solid #1e293b', padding: '12px', borderRadius: '6px', marginTop: '20px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
              Notice: {explainabilityData.score_explanation}
            </div>
          </div>
        </div>
      )}

      {/* Investigation Brief Modal */}
      {showBriefModal && briefData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '680px', background: '#0b0f19', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '28px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8', margin: 0 }}>OFFICIAL INVESTIGATION BRIEF</h2>
                <div style={{ fontSize: '10px', color: '#eab308', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>{briefData.classification}</div>
              </div>
              <X size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setShowBriefModal(false)} />
            </div>

            <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
              <p><strong>Case Reference:</strong> {briefData.case_id}</p>
              <p><strong>Generated At:</strong> {new Date(briefData.generated_at).toLocaleString()}</p>
              <p><strong>Executive Summary:</strong> {briefData.executive_summary}</p>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', marginBottom: '8px' }}>KEY PARTICIPATING ENTITIES</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {briefData.key_entities.map((ent, idx) => (
                  <span key={idx} style={{ background: '#1e293b', color: '#f8fafc', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', border: '1px solid #334155' }}>
                    {ent}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '8px' }}>ANALYST AUDIT NOTES</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>{briefData.analyst_notes}</div>
            </div>

            <button
              onClick={() => window.print()}
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
            >
              PRINT / EXPORT OFFICIAL BRIEF
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
