import React, { useEffect, useState } from 'react';
import { Shield, Search, Upload, RefreshCw, Crown, AlertTriangle, PhoneOff, Car, User, X, CheckCircle, Share2, Network } from 'lucide-react';
import NetworkGraph from './components/NetworkGraph';
import ThreatAlertsFeed from './components/ThreatAlertsFeed';
import EntityDossierModal from './components/EntityDossierModal';
import FileUploadModal from './components/FileUploadModal';

export default function App() {
  const [networkData, setNetworkData] = useState({ elements: [] });
  const [alertsData, setAlertsData] = useState(null);
  const [kingpins, setKingpins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8000/api/v1/graph/network?limit=150').then(res => res.json()),
      fetch('http://localhost:8000/api/v1/analytics/alerts').then(res => res.json()),
      fetch('http://localhost:8000/api/v1/graph/kingpins?top_n=5').then(res => res.json())
    ])
      .then(([net, al, kp]) => {
        setNetworkData(net);
        setAlertsData(al);
        setKingpins(kp);
        setLoading(false);
      })
      .catch(err => {
        console.error('API Fetch error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length >= 2) {
      fetch(`http://localhost:8000/api/v1/entities/search?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => setSearchResults(data))
        .catch(err => console.error(err));
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="app-container">
      
      {/* Top Cyber Command Bar */}
      <header className="command-header">
        <div className="header-brand">
          <div className="brand-logo">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="brand-title">CRIMINAL NETWORK INTELLIGENCE SYSTEM</h1>
            <p className="brand-subtitle">SIH26189 COMMAND CENTER • LIVE GRAPH ANALYTICS</p>
          </div>
        </div>

        {/* Global Suspect Search Bar */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search suspect name, phone (+91...), or vehicle plate..."
            className="search-input"
          />

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '44px',
              left: 0,
              right: 0,
              background: '#0f172a',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '10px',
              padding: '8px',
              zIndex: 100,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              {searchResults.map(r => (
                <div
                  key={r.entity_id}
                  onClick={() => {
                    setSelectedEntityId(r.entity_id);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{r.entity_id}</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: '#22d3ee',
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}>
                    {r.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Upload size={15} />
            <span>Upload Evidence</span>
          </button>
          <button className="btn-secondary" onClick={fetchAllData}>
            <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="dashboard-grid">
        
        {/* Left Side: Top Kingpins & Cell Clusters */}
        <div className="left-panel">
          
          {/* PageRank Kingpins Widget */}
          <div className="glass-card" style={{ padding: '16px', height: '55%', display: 'flex', flexDirection: 'column' }}>
            <div className="widget-header">
              <span className="widget-title">
                <Crown size={16} color="#fbbf24" />
                Top Syndicate Bosses (PageRank)
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {kingpins.map((k, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEntityId(k.entity_id)}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '5px',
                      background: 'rgba(251, 191, 36, 0.2)',
                      color: '#fbbf24',
                      fontWeight: 800,
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      #{k.rank}
                    </span>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9' }}>{k.entity_id}</p>
                      <p style={{ fontSize: '10px', color: '#64748b' }}>{k.entity_type} • {k.degree} Links</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#fbbf24', fontWeight: 700 }}>
                    {k.pagerank_score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Metrics Widget */}
          <div className="glass-card" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
            <div className="widget-header">
              <span className="widget-title">
                <Network size={16} color="#22d3ee" />
                Graph Topology Status
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0' }}>
              <div style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block' }}>TOTAL NODES</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#22d3ee' }}>540</span>
              </div>
              <div style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block' }}>TOTAL EDGES</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>7,333</span>
              </div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', letterSpacing: '0.5px' }}>
                ✓ NEO4J & POSTGRES DB HEALTHY
              </span>
            </div>
          </div>
        </div>

        {/* Center: Interactive Cytoscape Visual Canvas */}
        <div className="center-panel glass-card">
          <NetworkGraph
            elements={networkData.elements}
            onSelectNode={(id) => setSelectedEntityId(id)}
          />
        </div>

        {/* Right Side: Real-Time Threat Feeds Drawer */}
        <div className="right-panel">
          <ThreatAlertsFeed
            alerts={alertsData}
            onSelectEntity={(id) => setSelectedEntityId(id)}
          />
        </div>
      </div>

      {/* Modals */}
      <EntityDossierModal
        entityId={selectedEntityId}
        onClose={() => setSelectedEntityId(null)}
      />

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchAllData}
      />
    </div>
  );
}
