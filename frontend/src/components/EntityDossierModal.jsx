import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Phone, Car, MapPin, FileText, Share2, ShieldAlert, ArrowUpRight, ArrowDownLeft, DollarSign, Network } from 'lucide-react';

export default function EntityDossierModal({ entityId, onClose, onViewOnGraph }) {
  const { authFetch } = useAuth();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    authFetch(`/api/v1/entities/dossier/${encodeURIComponent(entityId)}`)
      .then(res => res.json())
      .then(data => {
        setDossier(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Dossier fetch error:', err);
        setLoading(false);
      });
  }, [entityId, authFetch]);

  if (!entityId) return null;

  const getThreatClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'threat-badge-critical';
      case 'HIGH RISK': return 'threat-badge-high';
      case 'ELEVATED': return 'threat-badge-elevated';
      default: return 'threat-badge-monitored';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window forensic-modal-window" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <User size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="modal-title">{entityId}</h2>
                {dossier && (
                  <span className={`threat-badge ${getThreatClass(dossier.threat_level)}`}>
                    {dossier.threat_level}
                  </span>
                )}
              </div>
              <p className="modal-subtitle">
                {dossier?.entity_type || 'PERSON'} • {dossier?.status || 'SURVEILLANCE DOSSIER'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onViewOnGraph && (
              <button
                onClick={() => onViewOnGraph(entityId)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="View this suspect on interactive network graph"
              >
                <Network size={13} />
                <span>View on Graph</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="modal-close-btn"
              title="Close Dossier"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '10px', color: '#a1a1aa' }}>
              <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}>Querying Neo4j Intelligence Graph...</span>
            </div>
          ) : (
            <>
              {/* Dynamic KPI Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                  <span style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Total Links</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{dossier?.total_connections || 0}</span>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                  <span style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>FIR Cases</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{dossier?.summary?.fir_count || 0}</span>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                  <span style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Vehicles</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{dossier?.summary?.vehicle_count || 0}</span>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                  <span style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Associates</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{dossier?.summary?.associate_count || 0}</span>
                </div>
              </div>

              {/* Linked FIRs Section */}
              {dossier?.firs && dossier.firs.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} />
                    <span>Linked Police First Information Reports ({dossier.firs.length})</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                    {dossier.firs.map((fir, i) => (
                      <div key={i} style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{fir.fir_no}</div>
                        <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>{fir.police_station}</div>
                        <div style={{ fontSize: '9px', color: '#71717a', marginTop: '4px' }}>Date: {fir.incident_date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Trail */}
              {dossier?.transactions && dossier.transactions.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} />
                    <span>Financial Intercepts & Transfers ({dossier.transactions.length})</span>
                  </h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <table className="dossier-tx-table">
                      <thead>
                        <tr>
                          <th>TX ID</th>
                          <th>Direction</th>
                          <th>Counterparty</th>
                          <th>Amount</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dossier.transactions.slice(0, 10).map((tx, idx) => (
                          <tr key={idx}>
                            <td style={{ color: '#ffffff' }}>{tx.transaction_id}</td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {tx.direction === 'Outgoing' ? <ArrowUpRight size={11} color="#fca5a5" /> : <ArrowDownLeft size={11} color="#93c5fd" />}
                                {tx.direction}
                              </span>
                            </td>
                            <td>{tx.counterparty}</td>
                            <td style={{ color: tx.is_structured ? '#f87171' : '#ffffff', fontWeight: 700 }}>
                              ₹{tx.amount.toLocaleString()}
                            </td>
                            <td>
                              {tx.is_structured ? (
                                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                                  STRUCTURED
                                </span>
                              ) : tx.mode}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Connected Evidence Network */}
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={14} />
                  <span>Graph Connections & Relational Evidence ({dossier?.connected_evidence?.length || 0})</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {dossier?.connected_evidence?.map((conn, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '11px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {conn.connected_type === 'Phone' && <Phone size={13} color="#fbbf24" />}
                        {conn.connected_type === 'Vehicle' && <Car size={13} color="#60a5fa" />}
                        {conn.connected_type === 'Location' && <MapPin size={13} color="#c084fc" />}
                        {conn.connected_type === 'FIR' && <FileText size={13} color="#f87171" />}
                        {conn.connected_type === 'Person' && <User size={13} color="#ffffff" />}
                        <span style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>{conn.connected_entity}</span>
                        <span style={{ fontSize: '10px', color: '#71717a' }}>({conn.connected_type})</span>
                      </div>
                      <span style={{ padding: '2px 8px', fontSize: '9px', fontWeight: 700, background: 'rgba(255, 255, 255, 0.06)', color: '#d4d4d8', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        {conn.relationship}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
