import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, PhoneOff, Car } from 'lucide-react';

export default function ThreatAlertsFeed({ alerts, onSelectEntity }) {
  const [activeTab, setActiveTab] = useState('all');

  const structuring = alerts?.financial_structuring || [];
  const burners = alerts?.burner_phones || [];
  const colocations = alerts?.anpr_colocations || [];

  return (
    <div className="glass-card" style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column' }}>
      <div className="widget-header">
        <span className="widget-title">
          <ShieldAlert size={16} color="#f43f5e" />
          Real-Time Threat Feeds
        </span>
        <span style={{
          fontSize: '10px',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(244, 63, 94, 0.2)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.4)'
        }}>
          {alerts?.total_alerts || 0} ALERTS
        </span>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '8px', marginBottom: '12px' }}>
        {['all', 'structuring', 'burners'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              color: activeTab === tab ? '#22d3ee' : '#64748b',
              boxShadow: activeTab === tab ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none'
            }}
          >
            {tab === 'all' ? 'All' : tab === 'structuring' ? `Hawala (${structuring.length})` : `Burners (${burners.length})`}
          </button>
        ))}
      </div>

      {/* Alerts Scrollable Feed */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(activeTab === 'all' || activeTab === 'structuring') && structuring.map(a => (
          <div
            key={a.alert_id}
            onClick={() => onSelectEntity(a.sender_suspect)}
            style={{
              padding: '12px',
              background: 'rgba(153, 27, 27, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> HAWALA SMURFING
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>
                ₹{a.total_structured_amount.toLocaleString()}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 600 }}>
              {a.sender_suspect} ➔ {a.receiver_suspect}
            </p>
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
              {a.transfer_count} transfers under ₹10,000 threshold
            </p>
          </div>
        ))}

        {(activeTab === 'all' || activeTab === 'burners') && burners.map(b => (
          <div
            key={b.alert_id}
            onClick={() => onSelectEntity(b.phone_number)}
            style={{
              padding: '12px',
              background: 'rgba(146, 64, 14, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PhoneOff size={12} /> BURNER SIM CARD
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>
                {b.total_calls_made} Calls
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#f1f5f9', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
              {b.phone_number}
            </p>
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
              {b.registered_owner}
            </p>
          </div>
        ))}

        {(activeTab === 'all' || activeTab === 'colocations') && colocations.map(c => (
          <div
            key={c.alert_id}
            onClick={() => onSelectEntity(c.vehicle_1)}
            style={{
              padding: '12px',
              background: 'rgba(6, 78, 59, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Car size={12} /> ANPR CONVOY SIGHTING
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>
                {c.sighting_frequency} Events
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#f1f5f9', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
              {c.vehicle_1} & {c.vehicle_2}
            </p>
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
              Location: {c.co_location_point}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
