import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Search, 
  Upload, 
  RefreshCw, 
  Sun,
  Moon,
  ArrowLeft,
  Crown, 
  AlertTriangle, 
  PhoneOff, 
  Car, 
  User, 
  Users,
  X, 
  CheckCircle, 
  Share2, 
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  UploadCloud,
  Layers,
  Activity,
  Database,
  CreditCard,
  FileText,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Landmark,
  Scan,
  IndianRupee,
  Briefcase,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Filter,
  ChevronDown
} from 'lucide-react';
import ThreatAlertsFeed from './components/ThreatAlertsFeed';
import FileUploadModal from './components/FileUploadModal';
import GraphWindow from './components/GraphWindow';
import SyndicateLeaderboard from './components/SyndicateLeaderboard';
import AuditLoggerPanel from './components/AuditLoggerPanel';
import AICopilotDrawer from './components/AICopilotDrawer';
import TargetedGraphCanvas from './components/TargetedGraphCanvas';
import GeospatialMapCanvas from './components/GeospatialMapCanvas';

export default function App() {
  // Theme state: 'dark' or 'light'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('sih_theme');
    if (saved) return saved;
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sih_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [networkData, setNetworkData] = useState({ elements: [] });
  const [alertsData, setAlertsData] = useState(null);
  const [kingpins, setKingpins] = useState([]);
  const [criminals, setCriminals] = useState([]);
  const [totalCriminals, setTotalCriminals] = useState(0);
  const [criminalFilter, setCriminalFilter] = useState('all');
  const [criminalSearch, setCriminalSearch] = useState('');
  
  // Dossier Workspace State
  const [selectedDossierEntity, setSelectedDossierEntity] = useState(null);
  const [dossierData, setDossierData] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierSearch, setDossierSearch] = useState('');
  const [dossierActiveTab, setDossierActiveTab] = useState('overview');

  // Global search & modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [focusedEntityId, setFocusedEntityId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('threats');
  const [previousView, setPreviousView] = useState('threats');
  const [threatCategory, setThreatCategory] = useState('all');
  const [isThreatDropdownOpen, setIsThreatDropdownOpen] = useState(true);
  const [targetedGraphEntity, setTargetedGraphEntity] = useState(null);
  const [isFloatingMapOpen, setIsFloatingMapOpen] = useState(false);
  const [floatingMapEntity, setFloatingMapEntity] = useState(null);
  const [isFloatingMapMinimized, setIsFloatingMapMinimized] = useState(false);

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8000/api/v1/graph/network?limit=150').then(res => res.json()),
      fetch('http://localhost:8000/api/v1/analytics/alerts').then(res => res.json()),
      fetch('http://localhost:8000/api/v1/graph/kingpins?top_n=10').then(res => res.json()),
      fetch('http://localhost:8000/api/v1/entities/criminals?limit=250').then(res => res.json())
    ])
      .then(([net, al, kp, crim]) => {
        setNetworkData(net);
        setAlertsData(al);
        setKingpins(kp || []);
        const crimList = crim?.criminals || [];
        setCriminals(crimList);
        setTotalCriminals(crim?.total || crimList.length);
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

  // Fetch single dossier when selectedDossierEntity changes
  useEffect(() => {
    if (!selectedDossierEntity) return;
    setDossierActiveTab('overview');
    setLoadingDossier(true);
    fetch(`http://localhost:8000/api/v1/entities/dossier/${encodeURIComponent(selectedDossierEntity)}`)
      .then(res => res.json())
      .then(data => {
        setDossierData(data);
        setLoadingDossier(false);
      })
      .catch(err => {
        console.error("Dossier fetch error:", err);
        setLoadingDossier(false);
      });
  }, [selectedDossierEntity]);

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

  // Global Ctrl+K Shortcut to focus Search Bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escape key closes floating map or full graph view
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isFloatingMapOpen) {
          setIsFloatingMapOpen(false);
        } else if (activeView === 'graph_canvas' || activeView === 'topology') {
          setActiveView(previousView || 'threats');
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFloatingMapOpen, activeView, previousView]);

  const openFloatingGraph = (entityId) => {
    const target = entityId || (criminals.length > 0 ? criminals[0].entity_id : 'Rahul Sharma');
    setFloatingMapEntity(target);
    setFocusedEntityId(target);
    setIsFloatingMapOpen(true);
    setIsFloatingMapMinimized(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const openTargetedGraph = (entityId) => {
    openFloatingGraph(entityId);
  };

  const openDossier = (entityId) => {
    setSelectedEntityId(null);
    setFocusedEntityId(null);
    setTargetedGraphEntity(null);
    setSelectedDossierEntity(entityId);
    setDossierSearch('');
    setActiveView('dossiers');
    setSearchResults([]);
    setSearchQuery('');
    setLoadingDossier(true);
    fetch(`http://localhost:8000/api/v1/entities/dossier/${encodeURIComponent(entityId)}`)
      .then(res => res.json())
      .then(data => {
        setDossierData(data);
        setLoadingDossier(false);
      })
      .catch(err => {
        console.error("Dossier fetch error:", err);
        setLoadingDossier(false);
      });
  };

  const handleSelectSearchResult = (entityId) => {
    openDossier(entityId);
  };

  const getThreatClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'threat-badge-critical';
      case 'HIGH RISK': return 'threat-badge-high';
      case 'ELEVATED': return 'threat-badge-elevated';
      default: return 'threat-badge-monitored';
    }
  };

  const getThreatBadgePillClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'threat-pill-critical';
      case 'HIGH RISK': return 'threat-pill-high';
      case 'ELEVATED': return 'threat-pill-elevated';
      default: return 'threat-pill-monitored';
    }
  };

  // Filtered criminals for the Criminal Database view
  const filteredCriminals = criminals.filter(c => {
    if (criminalFilter === 'fir' && (!c.fir_count || c.fir_count === 0)) return false;
    if (criminalFilter === 'high_risk' && c.threat_level !== 'CRITICAL' && c.threat_level !== 'HIGH RISK') return false;
    if (criminalFilter === 'vehicles' && (!c.vehicle_count || c.vehicle_count === 0)) return false;

    if (criminalSearch.trim()) {
      const q = criminalSearch.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchFir = c.firs?.some(f => f.toLowerCase().includes(q));
      const matchVeh = c.vehicles?.some(v => v.toLowerCase().includes(q));
      const matchLoc = c.locations?.some(l => l.toLowerCase().includes(q));
      return matchName || matchFir || matchVeh || matchLoc;
    }
    return true;
  });

  // Filtered suspects for the Dossier Workspace left selector
  const filteredDossierSuspects = criminals.filter(c => {
    if (!dossierSearch.trim()) return true;
    const q = dossierSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.firs?.some(f => f.toLowerCase().includes(q)) ||
      c.vehicles?.some(v => v.toLowerCase().includes(q))
    );
  });

  const displayedDossierSuspects = [...filteredDossierSuspects];
  if (
    selectedDossierEntity &&
    !displayedDossierSuspects.some(c => c.entity_id === selectedDossierEntity || c.name === selectedDossierEntity)
  ) {
    displayedDossierSuspects.unshift({
      entity_id: selectedDossierEntity,
      name: dossierData?.entity_id || selectedDossierEntity,
      connection_count: dossierData?.total_connections || 0,
      fir_count: dossierData?.summary?.fir_count || 0,
      threat_level: dossierData?.threat_level || 'MONITORED'
    });
  }

  return (
    <div className="app-container">
      
      {/* Top Cyber Command Bar */}
      <header className="command-header">
        <div className="header-brand">
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="brand-logo">
            <img 
              src="/Emblem_of_India_no_text.svg" 
              alt="Government of India Emblem" 
              className="emblem-logo-img"
            />
          </div>
          <div>
            <h1 className="brand-title">CRIMINAL NETWORK INTELLIGENCE SYSTEM</h1>
            <p className="brand-subtitle">National Cyber Crime Coordination Centre (I4C) • Executive Command Center</p>
          </div>
        </div>

        {/* Global Suspect Search Bar */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                openDossier(searchResults[0].entity_id);
              }
            }}
            placeholder="Search suspect name, phone (+91...), or vehicle plate (Ctrl+K)..."
            className="search-input"
          />

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '42px',
              left: 0,
              right: 0,
              background: '#0c0c0e',
              border: '1px solid #27272a',
              borderRadius: '6px',
              padding: '6px',
              zIndex: 100,
              boxShadow: '0 12px 30px rgba(0,0,0,0.8)'
            }}>
              {searchResults.map(r => (
                <div
                  key={r.entity_id}
                  onClick={() => openDossier(r.entity_id)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#27272a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title={`Open ${r.entity_id} in Suspect Dossiers section`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={13} color="#a1a1aa" />
                    <span style={{ fontWeight: 600, color: '#fafafa' }}>{r.entity_id}</span>
                    <span style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: '#18181b',
                      color: '#a1a1aa',
                      border: '1px solid #27272a',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {r.type}
                    </span>
                  </div>

                  <div className="search-item-actions">
                    <button
                      className="search-quick-btn search-btn-dossier"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDossier(r.entity_id);
                      }}
                      title="Open in Suspect Dossiers Section"
                    >
                      <FileText size={11} />
                      <span>Dossier</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            id="theme-toggle-btn"
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button className="btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Upload size={14} />
            <span>Upload Evidence</span>
          </button>
          <button className="btn-secondary" onClick={fetchAllData} title="Refresh Live Feeds">
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className={`dashboard-grid ${isSidebarCollapsed ? 'sidebar-hidden' : ''}`}>
        
        {/* Navigation Sidebar */}
        {!isSidebarCollapsed && (
          <aside className="standard-sidebar">
            <div className="sidebar-scrollable-content">
              
              {/* SECTION: THREAT INTELLIGENCE */}
              <div className="sidebar-group">
                <div className="sidebar-group-title">
                  <span>THREAT INTELLIGENCE</span>
                  <span className="sidebar-item-badge">{alertsData?.total_alerts || 0}</span>
                </div>
                <div className="sidebar-nav-list">
                  {/* Parent Dropdown: Live Threat Feed */}
                  <div
                    className={`sidebar-nav-item ${
                      activeView === 'threats' && threatCategory === 'all'
                        ? 'active'
                        : activeView === 'threats'
                        ? 'active-parent'
                        : ''
                    }`}
                    onClick={() => {
                      setActiveView('threats');
                      if (activeView === 'threats' && threatCategory === 'all') {
                        setIsThreatDropdownOpen(!isThreatDropdownOpen);
                      } else {
                        setThreatCategory('all');
                        setIsThreatDropdownOpen(true);
                      }
                    }}
                  >
                    <div className="sidebar-item-left">
                      <ShieldAlert size={15} />
                      <span>Live Threat Feed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="sidebar-item-badge">{alertsData?.total_alerts || 0}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsThreatDropdownOpen(!isThreatDropdownOpen);
                        }}
                        className="sidebar-chevron-btn"
                        title={isThreatDropdownOpen ? "Collapse threat categories" : "Expand threat categories"}
                      >
                        <ChevronDown
                          size={13}
                          style={{
                            transform: isThreatDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            display: 'block'
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Dropdown Sub-Items: Threat Categories */}
                  {isThreatDropdownOpen && (
                    <div className="sidebar-sub-nav-list">
                      <div
                        className={`sidebar-sub-nav-item ${activeView === 'threats' && threatCategory === 'structuring' ? 'active' : ''}`}
                        onClick={() => {
                          setActiveView('threats');
                          setThreatCategory('structuring');
                        }}
                      >
                        <div className="sidebar-item-left">
                          <CreditCard size={13} />
                          <span>Hawala & Smurfing</span>
                        </div>
                        <span className="sidebar-item-badge">{alertsData?.breakdown?.financial_structuring_count || 0}</span>
                      </div>

                      <div
                        className={`sidebar-sub-nav-item ${activeView === 'threats' && threatCategory === 'burners' ? 'active' : ''}`}
                        onClick={() => {
                          setActiveView('threats');
                          setThreatCategory('burners');
                        }}
                      >
                        <div className="sidebar-item-left">
                          <PhoneOff size={13} />
                          <span>Burner SIM Lines</span>
                        </div>
                        <span className="sidebar-item-badge">{alertsData?.breakdown?.burner_phone_count || 0}</span>
                      </div>

                      <div
                        className={`sidebar-sub-nav-item ${activeView === 'threats' && threatCategory === 'colocations' ? 'active' : ''}`}
                        onClick={() => {
                          setActiveView('threats');
                          setThreatCategory('colocations');
                        }}
                      >
                        <div className="sidebar-item-left">
                          <Car size={13} />
                          <span>ANPR Toll Convoys</span>
                        </div>
                        <span className="sidebar-item-badge">{alertsData?.breakdown?.anpr_colocation_count || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: GEOSPATIAL ANPR SURVEILLANCE */}
              <div className="sidebar-group">
                <div className="sidebar-group-title">
                  <span>SPATIAL SURVEILLANCE</span>
                  <span className="sidebar-item-badge">GIS</span>
                </div>
                <div className="sidebar-nav-list">
                  <div
                    className={`sidebar-nav-item ${activeView === 'geo_map' ? 'active' : ''}`}
                    onClick={() => setActiveView('geo_map')}
                    title="View Interactive ANPR Spatial Map & Vehicle Trajectories"
                  >
                    <div className="sidebar-item-left">
                      <MapPin size={15} color="#06b6d4" />
                      <span>ANPR Movement Map</span>
                    </div>
                    <span className="sidebar-item-badge" style={{ background: 'rgba(6, 182, 212, 0.14)', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                      LIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: SUSPECT DOSSIERS */}
              <div className="sidebar-group">
                <div className="sidebar-group-title">
                  <span>SUSPECT DOSSIERS</span>
                  <span className="sidebar-item-badge">360°</span>
                </div>
                <div className="sidebar-nav-list">
                  <div
                    className={`sidebar-nav-item ${activeView === 'dossiers' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView('dossiers');
                    }}
                    title="View suspect forensic dossiers workspace"
                  >
                    <div className="sidebar-item-left">
                      <FileText size={15} />
                      <span>Suspect Dossiers</span>
                    </div>
                    <span className="sidebar-item-badge">{totalCriminals || criminals.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* SECTION: CRIME SYNDICATES */}
              <div className="sidebar-group">
                <div className="sidebar-group-title">
                  <span>CRIME SYNDICATES</span>
                  <span className="sidebar-item-badge">TOP</span>
                </div>
                <div className="sidebar-nav-list">
                  <div
                    className={`sidebar-nav-item ${activeView === 'syndicates' ? 'active' : ''}`}
                    onClick={() => setActiveView('syndicates')}
                    title="View Top Syndicate Bosses & PageRank Hierarchy"
                  >
                    <div className="sidebar-item-left">
                      <Crown size={15} color="#fbbf24" />
                      <span>Syndicate Bosses</span>
                    </div>
                    <span className="sidebar-item-badge" style={{ background: 'rgba(251, 191, 36, 0.14)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.25)' }}>
                      {kingpins.length > 0 ? `Top ${kingpins.length}` : 'Ranked'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Footer: System Status */}
            <div className="sidebar-footer">
              <div className="sidebar-status-pill">
                <div className="status-indicator-dot" />
                <span className="status-text">NEO4J & POSTGRES ONLINE</span>
              </div>
            </div>
          </aside>
        )}

        {/* Main Stage: Dynamic View Switcher */}
        <div className="main-threat-stage">
          
          {/* VIEW: EXECUTIVE COMMAND CENTER (DEFAULT LANDING VIEW) */}
          {activeView === 'threats' && (
            <div className="executive-dashboard-wrapper">
              {/* Full-Width Live Threat Intelligence Feed */}
              <div className="executive-threats-container">
                <ThreatAlertsFeed
                  alerts={alertsData}
                  onSelectEntity={(id) => openDossier(id)}
                  onFocusEntity={(id) => setFocusedEntityId(id)}
                  onInvestigateGraph={(id) => openTargetedGraph(id)}
                  activeTab={threatCategory}
                  onTabChange={(tab) => setThreatCategory(tab)}
                />
              </div>

              {/* Evidence Ingestion Audit Logger (Full-Width Bottom Panel) */}
              <AuditLoggerPanel onOpenUpload={() => setIsUploadOpen(true)} />
            </div>
          )}

          {/* VIEW: TOP SYNDICATE BOSSES & CENTRALITY HIERARCHY */}
          {activeView === 'syndicates' && (
            <div className="syndicates-view-wrapper">
              <SyndicateLeaderboard
                kingpins={kingpins}
                onInspectDossier={(id) => openDossier(id)}
                onInvestigateGraph={(id) => openTargetedGraph(id)}
                isFullPage={true}
              />
            </div>
          )}

          {/* VIEW: TARGETED GRAPH INVESTIGATION CANVAS */}
          {activeView === 'graph_canvas' && (
            <TargetedGraphCanvas
              targetEntity={targetedGraphEntity || (criminals.length > 0 ? criminals[0].entity_id : 'Rahul Sharma')}
              onBackToDashboard={() => setActiveView(previousView || 'threats')}
              onOpenDossier={(id) => openDossier(id)}
            />
          )}

          {/* VIEW: GEOSPATIAL ANPR MOVEMENT & CONVOY MAP */}
          {activeView === 'geo_map' && (
            <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
              <GeospatialMapCanvas
                onSelectEntity={(id) => setFocusedEntityId(id)}
                onOpenDossier={(id) => openDossier(id)}
                initialVehiclePlate="MH-12-PQ-9981"
              />
            </div>
          )}

          {/* VIEW: CRIMINAL DATABASE (100% DYNAMIC FROM NEO4J) */}
          {activeView === 'criminals' && (
            <div className="criminal-db-wrapper glass-card">
              {/* Dynamic Controls Bar */}
              <div className="criminal-controls-bar">
                <div className="criminal-search-box">
                  <Search size={15} color="#a1a1aa" />
                  <input
                    type="text"
                    placeholder="Search suspects by name, FIR case no, or vehicle plate..."
                    value={criminalSearch}
                    onChange={(e) => setCriminalSearch(e.target.value)}
                  />
                  {criminalSearch && (
                    <button onClick={() => setCriminalSearch('')} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="criminal-filter-group">
                  <button
                    className={`criminal-filter-btn ${criminalFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setCriminalFilter('all')}
                  >
                    All ({criminals.length})
                  </button>
                  <button
                    className={`criminal-filter-btn ${criminalFilter === 'fir' ? 'active' : ''}`}
                    onClick={() => setCriminalFilter('fir')}
                  >
                    FIR-Linked ({criminals.filter(c => c.fir_count > 0).length})
                  </button>
                  <button
                    className={`criminal-filter-btn ${criminalFilter === 'high_risk' ? 'active' : ''}`}
                    onClick={() => setCriminalFilter('high_risk')}
                  >
                    High Risk / Critical ({criminals.filter(c => c.threat_level === 'CRITICAL' || c.threat_level === 'HIGH RISK').length})
                  </button>
                  <button
                    className={`criminal-filter-btn ${criminalFilter === 'vehicles' ? 'active' : ''}`}
                    onClick={() => setCriminalFilter('vehicles')}
                  >
                    Vehicle Owners ({criminals.filter(c => c.vehicle_count > 0).length})
                  </button>
                </div>
              </div>

              {/* KPI Metrics Row */}
              <div className="criminal-kpi-row">
                <div className="criminal-kpi-card">
                  <span className="criminal-kpi-label">Tracked In Database</span>
                  <span className="criminal-kpi-value">{totalCriminals}</span>
                </div>
                <div className="criminal-kpi-card">
                  <span className="criminal-kpi-label">Active Surveillance</span>
                  <span className="criminal-kpi-value">{criminals.filter(c => c.status === 'UNDER ACTIVE SURVEILLANCE').length}</span>
                </div>
                <div className="criminal-kpi-card">
                  <span className="criminal-kpi-label">FIR Named Suspects</span>
                  <span className="criminal-kpi-value">{criminals.filter(c => c.fir_count > 0).length}</span>
                </div>
                <div className="criminal-kpi-card">
                  <span className="criminal-kpi-label">Graph Interconnects</span>
                  <span className="criminal-kpi-value">{criminals.reduce((acc, c) => acc + (c.connection_count || 0), 0)}</span>
                </div>
              </div>

              {/* Suspects Card Grid */}
              <div className="criminal-cards-scroll-area">
                <div className="criminal-cards-grid">
                  {filteredCriminals.map((c, idx) => (
                    <div key={idx} className="criminal-card">
                      <div className="criminal-card-header">
                        <span className={`threat-badge ${getThreatClass(c.threat_level)}`}>
                          {c.threat_level}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#a1a1aa', fontWeight: 700 }}>
                          Risk: {c.threat_score}/100
                        </span>
                      </div>

                      <div>
                        <h3 className="criminal-card-name">{c.name}</h3>
                        <p className="criminal-card-meta">
                          {c.entity_type} • <strong style={{ color: '#ffffff' }}>{c.connection_count}</strong> Direct Network Relationships
                        </p>
                      </div>

                      {/* Evidence Pills */}
                      <div className="criminal-evidence-pills">
                        {c.firs && c.firs.map((f, i) => (
                          <span key={i} className="evidence-pill" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                            <FileText size={11} />
                            {f}
                          </span>
                        ))}
                        {c.vehicles && c.vehicles.map((v, i) => (
                          <span key={i} className="evidence-pill" style={{ borderColor: 'rgba(96, 165, 250, 0.3)', color: '#93c5fd' }}>
                            <Car size={11} />
                            {v}
                          </span>
                        ))}
                        {c.locations && c.locations.slice(0, 1).map((loc, i) => (
                          <span key={i} className="evidence-pill" style={{ borderColor: 'rgba(192, 132, 252, 0.3)', color: '#d8b4fe' }}>
                            <MapPin size={11} />
                            {loc}
                          </span>
                        ))}
                      </div>

                      <div className="criminal-card-status-bar">
                        <span>Surveillance:</span>
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>{c.status}</span>
                      </div>

                      <div className="criminal-card-actions">
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: '7px 12px', fontSize: '11px', justifyContent: 'center' }}
                          onClick={() => {
                            setSelectedDossierEntity(c.entity_id);
                            setActiveView('dossiers');
                          }}
                        >
                          <User size={13} />
                          <span>Open Dossier</span>
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '7px 12px', fontSize: '11px' }}
                          onClick={() => openTargetedGraph(c.entity_id)}
                          title="View on network graph"
                        >
                          <Network size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SUSPECT DOSSIERS WORKSPACE (DEDICATED FULL VIEW) */}
          {activeView === 'dossiers' && (
            <div className="dossier-workspace-layout">
              
              {/* Middle: Dossier Detail Pane (or Search Landing when no suspect selected) */}
              <div className="dossier-detail-pane">
                {loadingDossier ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#a1a1aa' }}>
                    <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}>Loading Intelligence Dossier...</span>
                  </div>
                ) : (dossierData && selectedDossierEntity) ? (
                  <div className="dossier-profile-card">
                    {/* Top Header Row: Avatar, Name, Threat Badge, Crime Category, Action Buttons */}
                    <div className="dossier-profile-header">
                      <div className="dossier-profile-header-left">
                        <div className="dossier-avatar-circle">
                          <User size={30} className="dossier-avatar-icon" />
                        </div>
                        <div className="dossier-profile-identity">
                          <div className="dossier-name-row">
                            <h2 className="dossier-entity-name">{dossierData.entity_id}</h2>
                            <span className={`threat-badge-pill ${getThreatBadgePillClass(dossierData.threat_level)}`}>
                              {dossierData.threat_level || 'CRITICAL'}
                            </span>
                          </div>
                          <div className="dossier-category-row">
                            <IndianRupee size={14} className="dossier-category-icon" />
                            <span className="dossier-category-text">{dossierData.crime_category || 'Financial Smuggling'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="dossier-profile-header-right">
                        <button
                          className="btn-investigate-network"
                          onClick={() => openTargetedGraph(dossierData.entity_id)}
                          title="Investigate Network"
                        >
                          <Network size={16} />
                          <span>Investigate Network</span>
                        </button>
                        <button
                          className="btn-dossier-search-dir"
                          onClick={() => {
                            setSelectedDossierEntity(null);
                            setDossierData(null);
                          }}
                          title="Search Directory"
                        >
                          <Search size={14} />
                          <span>Search Directory</span>
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Meta Row: Phone, Location, Last Seen with Dividers */}
                    <div className="dossier-meta-strip">
                      <div className="dossier-meta-item">
                        <Phone size={18} className="dossier-meta-icon" />
                        <div className="dossier-meta-content">
                          <span className="dossier-meta-label">Phone</span>
                          <span className="dossier-meta-val">{dossierData.phone || '+91 98765 43210'}</span>
                        </div>
                      </div>

                      <div className="dossier-meta-divider" />

                      <div className="dossier-meta-item">
                        <MapPin size={18} className="dossier-meta-icon" />
                        <div className="dossier-meta-content">
                          <span className="dossier-meta-label">Location</span>
                          <span className="dossier-meta-val">{dossierData.location || 'Delhi, DL'}</span>
                        </div>
                      </div>

                      <div className="dossier-meta-divider" />

                      <div className="dossier-meta-item">
                        <Clock size={18} className="dossier-meta-icon" />
                        <div className="dossier-meta-content">
                          <span className="dossier-meta-label">Last Seen</span>
                          <span className="dossier-meta-val">{dossierData.last_seen || '2h ago'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sectioned Navigation Tabs */}
                    <div className="dossier-tabs-nav">
                      <button
                        className={`dossier-tab-btn ${dossierActiveTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setDossierActiveTab('overview')}
                      >
                        Overview
                      </button>
                      <button
                        className={`dossier-tab-btn ${dossierActiveTab === 'connections' ? 'active' : ''}`}
                        onClick={() => setDossierActiveTab('connections')}
                      >
                        Connections {dossierData.total_connections ? `(${dossierData.total_connections})` : ''}
                      </button>
                      <button
                        className={`dossier-tab-btn ${dossierActiveTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setDossierActiveTab('activity')}
                      >
                        Recent Activity {dossierData.transactions?.length ? `(${dossierData.transactions.length})` : ''}
                      </button>
                      <button
                        className={`dossier-tab-btn ${dossierActiveTab === 'cases' ? 'active' : ''}`}
                        onClick={() => setDossierActiveTab('cases')}
                      >
                        Linked Cases {dossierData.firs?.length ? `(${dossierData.firs.length})` : ''}
                      </button>
                    </div>

                    {/* TAB 1: OVERVIEW (EXACT LAYOUT FROM DESIGN REFERENCE) */}
                    {dossierActiveTab === 'overview' && (
                      <div className="dossier-tab-content">
                        {/* Key Details Card */}
                        <div className="dossier-key-details-card">
                          <h3 className="dossier-card-heading">Key Details</h3>

                          <div className="dossier-key-details-grid">
                            {/* Left Column */}
                            <div className="dossier-details-col">
                              <div className="dossier-field-group">
                                <span className="dossier-field-label">Age</span>
                                <span className="dossier-field-value">{dossierData.age || 32}</span>
                              </div>

                              <div className="dossier-field-group">
                                <span className="dossier-field-label">Occupation</span>
                                <span className="dossier-field-value">{dossierData.occupation || 'Businessman'}</span>
                              </div>

                              <div className="dossier-field-group">
                                <span className="dossier-field-label">Known Aliases</span>
                                <span className="dossier-field-value">{dossierData.aliases || 'Rohit S., R. Gupta'}</span>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="dossier-details-col">
                              <div className="dossier-field-group-row">
                                <div className="dossier-field-row-icon">
                                  <Car size={18} />
                                </div>
                                <div className="dossier-field-group">
                                  <span className="dossier-field-label">Associated Vehicles</span>
                                  <span className="dossier-field-value font-mono">
                                    {dossierData.vehicles && dossierData.vehicles.length > 0
                                      ? dossierData.vehicles.map(v => v.registration_number).join(', ')
                                      : (dossierData.properties?.registration_number || 'DL 3C AB 1234')}
                                  </span>
                                </div>
                              </div>

                              <div className="dossier-field-group-row">
                                <div className="dossier-field-row-icon">
                                  <Landmark size={18} />
                                </div>
                                <div className="dossier-field-group">
                                  <span className="dossier-field-label">Associated Accounts</span>
                                  <span className="dossier-field-value">
                                    {dossierData.flagged_accounts_count || 3} (Flagged)
                                  </span>
                                </div>
                              </div>

                              <div className="dossier-field-group-row">
                                <div className="dossier-field-row-icon">
                                  <Scan size={18} />
                                </div>
                                <div className="dossier-field-group">
                                  <span className="dossier-field-label">Risk Score</span>
                                  <div style={{ marginTop: '3px' }}>
                                    <span className="dossier-risk-badge">
                                      {dossierData.threat_score || 92} / 100
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Overview KPI Highlights */}
                        <div className="dossier-kpi-highlights">
                          <div className="dossier-kpi-card">
                            <span className="dossier-kpi-sub">Total Network Nodes</span>
                            <span className="dossier-kpi-val">{dossierData.total_connections}</span>
                            <span className="dossier-kpi-desc">Cross-entity links</span>
                          </div>
                          <div className="dossier-kpi-card">
                            <span className="dossier-kpi-sub">Registered FIRs</span>
                            <span className="dossier-kpi-val">{dossierData.summary?.fir_count || dossierData.firs?.length || 0}</span>
                            <span className="dossier-kpi-desc">Police station cases</span>
                          </div>
                          <div className="dossier-kpi-card">
                            <span className="dossier-kpi-sub">Tracked Hawala Volume</span>
                            <span className="dossier-kpi-val">₹{(dossierData.summary?.total_financial_volume || 0).toLocaleString()}</span>
                            <span className="dossier-kpi-desc">{dossierData.transactions?.length || 0} transaction intercepts</span>
                          </div>
                          <div className="dossier-kpi-card">
                            <span className="dossier-kpi-sub">Direct Associates</span>
                            <span className="dossier-kpi-val">{dossierData.summary?.associate_count || dossierData.associates?.length || 0}</span>
                            <span className="dossier-kpi-desc">Identified syndicate links</span>
                          </div>
                        </div>

                        {/* Linked Police Cases in Overview */}
                        {dossierData.firs && dossierData.firs.length > 0 && (
                          <div className="dossier-section-block" style={{ marginTop: '8px' }}>
                            <div className="dossier-block-header">
                              <FileText size={16} />
                              <span>Linked Police First Information Reports ({dossierData.firs.length})</span>
                            </div>
                            <div className="dossier-fir-files-list">
                              {dossierData.firs.map((fir, i) => (
                                <div key={i} className="dossier-fir-file-card">
                                  <div className="fir-file-header">
                                    <div className="fir-file-icon-box">
                                      <FileText size={20} className="fir-file-icon" />
                                    </div>
                                    <div className="fir-file-title-block">
                                      <div className="fir-file-name-row">
                                        <span className="fir-file-name">{fir.fir_no}</span>
                                        <span className="fir-status-pill">
                                          <ShieldAlert size={11} />
                                          <span>ACTIVE INVESTIGATION</span>
                                        </span>
                                      </div>
                                      <span className="fir-file-subtitle">Official State Police Crime Incident Report</span>
                                    </div>
                                  </div>

                                  <div className="fir-file-details-grid">
                                    <div className="fir-detail-pill">
                                      <Landmark size={14} className="fir-detail-icon" />
                                      <div className="fir-detail-text">
                                        <span className="fir-detail-label">Police Station</span>
                                        <span className="fir-detail-value">{fir.police_station || 'Jurisdiction Central PS'}</span>
                                      </div>
                                    </div>

                                    <div className="fir-detail-pill">
                                      <Calendar size={14} className="fir-detail-icon" />
                                      <div className="fir-detail-text">
                                        <span className="fir-detail-label">Incident Date</span>
                                        <span className="fir-detail-value font-mono">
                                          {fir.incident_date ? fir.incident_date.replace(/T.*$/, '') : 'Recorded'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="fir-detail-pill">
                                      <FileText size={14} className="fir-detail-icon" />
                                      <div className="fir-detail-text">
                                        <span className="fir-detail-label">Case Source</span>
                                        <span className="fir-detail-value">{fir.source_file || 'E-FIR Repository'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="fir-file-actions-row">
                                    <div className="fir-file-tag">
                                      <span>STATE CRIMINAL DATABASE • CCTNS RECORD</span>
                                    </div>
                                    <button
                                      className="btn-fir-graph-view"
                                      onClick={() => openTargetedGraph(fir.fir_no)}
                                      title="Investigate FIR Case Network on Graph"
                                    >
                                      <Network size={13} />
                                      <span>Investigate Case Graph</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: CONNECTIONS */}
                    {dossierActiveTab === 'connections' && (
                      <div className="dossier-tab-content">
                        {/* Known Associates */}
                        <div className="dossier-section-block">
                          <div className="dossier-block-header">
                            <Users size={16} />
                            <span>Known Associates & Co-conspirators ({dossierData.associates?.length || 0})</span>
                          </div>
                          {dossierData.associates && dossierData.associates.length > 0 ? (
                            <div className="dossier-associates-grid">
                              {dossierData.associates.map((assoc, idx) => (
                                <div key={idx} className="dossier-associate-card">
                                  <div className="associate-card-top">
                                    <div className="associate-avatar">
                                      <User size={16} />
                                    </div>
                                    <div>
                                      <div className="associate-name">{assoc.name}</div>
                                      <div className="associate-interactions">{assoc.interaction_count} documented interactions</div>
                                    </div>
                                  </div>
                                  <div className="associate-tags">
                                    {assoc.relationships?.map((rel, rIdx) => (
                                      <span key={rIdx} className="associate-tag">{rel}</span>
                                    ))}
                                  </div>
                                  <div className="associate-actions">
                                    <button
                                      className="btn-assoc-action"
                                      onClick={() => setSelectedDossierEntity(assoc.name)}
                                    >
                                      Open Dossier
                                    </button>
                                    <button
                                      className="btn-assoc-action outline"
                                      onClick={() => openTargetedGraph(assoc.name)}
                                    >
                                      <Network size={12} />
                                      Graph
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="dossier-empty-state">
                              <Users size={24} color="#94a3b8" />
                              <p>No direct person-to-person associate links recorded.</p>
                            </div>
                          )}
                        </div>

                        {/* All Linked Evidence */}
                        <div className="dossier-section-block" style={{ marginTop: '20px' }}>
                          <div className="dossier-block-header">
                            <Share2 size={16} />
                            <span>All Linked Evidence & Graph Relational Entities ({dossierData.connected_evidence?.length || 0})</span>
                          </div>
                          <div className="dossier-connections-list">
                            {dossierData.connected_evidence?.map((conn, idx) => (
                              <div key={idx} className="dossier-conn-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {conn.connected_type === 'Phone' && <Phone size={14} color="#f59e0b" />}
                                  {conn.connected_type === 'Vehicle' && <Car size={14} color="#38bdf8" />}
                                  {conn.connected_type === 'Location' && <MapPin size={14} color="#a855f7" />}
                                  {conn.connected_type === 'FIR' && <FileText size={14} color="#ef4444" />}
                                  {conn.connected_type === 'Person' && <User size={14} color="#3b82f6" />}
                                  <span className="font-mono font-bold" style={{ fontSize: '12px' }}>{conn.connected_entity}</span>
                                  <span className="conn-type-badge">({conn.connected_type})</span>
                                </div>
                                <span className="conn-rel-badge">
                                  {conn.relationship}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: RECENT ACTIVITY */}
                    {dossierActiveTab === 'activity' && (
                      <div className="dossier-tab-content">
                        <div className="dossier-section-block">
                          <div className="dossier-block-header">
                            <IndianRupee size={16} />
                            <span>Financial Intelligence Trail & Hawala Intercepts ({dossierData.transactions?.length || 0})</span>
                          </div>
                          {dossierData.transactions && dossierData.transactions.length > 0 ? (
                            <div className="dossier-table-wrap">
                              <table className="dossier-tx-table">
                                <thead>
                                  <tr>
                                    <th>TX ID</th>
                                    <th>Direction</th>
                                    <th>Counterparty</th>
                                    <th>Amount</th>
                                    <th>Mode</th>
                                    <th>Timestamp</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dossierData.transactions.map((tx, idx) => (
                                    <tr key={idx}>
                                      <td className="font-mono">{tx.transaction_id}</td>
                                      <td>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          {tx.direction === 'Outgoing'
                                            ? <ArrowUpRight size={13} color="#ef4444" />
                                            : <ArrowDownLeft size={13} color="#10b981" />}
                                          {tx.direction}
                                        </span>
                                      </td>
                                      <td className="font-bold">{tx.counterparty}</td>
                                      <td style={{ color: tx.is_structured ? '#ef4444' : 'inherit', fontWeight: 700 }}>
                                        ₹{tx.amount.toLocaleString()}
                                      </td>
                                      <td>
                                        {tx.is_structured ? (
                                          <span className="structured-tx-badge">
                                            STRUCTURED
                                          </span>
                                        ) : tx.mode}
                                      </td>
                                      <td style={{ color: 'var(--muted-foreground)' }}>{tx.timestamp}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="dossier-empty-state">
                              <DollarSign size={24} color="#94a3b8" />
                              <p>No financial intercepts or Hawala transactions flagged for this profile.</p>
                            </div>
                          )}
                        </div>

                        {/* Sighting Timeline */}
                        {dossierData.locations && dossierData.locations.length > 0 && (
                          <div className="dossier-section-block" style={{ marginTop: '20px' }}>
                            <div className="dossier-block-header">
                              <MapPin size={16} />
                              <span>Surveillance Sightings & Geo Observations ({dossierData.locations.length})</span>
                            </div>
                            <div className="dossier-sighting-grid">
                              {dossierData.locations.map((loc, i) => (
                                <div key={i} className="dossier-sighting-card">
                                  <div className="sighting-card-top">
                                    <div className="sighting-icon-box">
                                      <MapPin size={16} />
                                    </div>
                                    <div className="sighting-info-block">
                                      <span className="sighting-location-name">{loc.name}</span>
                                      <span className="sighting-source-tag">{loc.observed_by || 'Field Observation'}</span>
                                    </div>
                                  </div>
                                  <div className="sighting-meta-row">
                                    <span className="sighting-report-text">Report ID: {loc.report_id || 'ANPR-GEO-LOG'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: LINKED CASES */}
                    {dossierActiveTab === 'cases' && (
                      <div className="dossier-tab-content">
                        <div className="dossier-section-block">
                          <div className="dossier-block-header">
                            <FileText size={16} />
                            <span>Linked Police First Information Reports ({dossierData.firs?.length || 0})</span>
                          </div>
                          {dossierData.firs && dossierData.firs.length > 0 ? (
                            <div className="dossier-fir-files-list">
                              {dossierData.firs.map((fir, i) => (
                                <div key={i} className="dossier-fir-file-card">
                                  <div className="fir-file-header">
                                    <div className="fir-file-icon-box">
                                      <FileText size={20} className="fir-file-icon" />
                                    </div>
                                    <div className="fir-file-title-block">
                                      <div className="fir-file-name-row">
                                        <span className="fir-file-name">{fir.fir_no}</span>
                                        <span className="fir-status-pill">
                                          <ShieldAlert size={11} />
                                          <span>ACTIVE INVESTIGATION</span>
                                        </span>
                                      </div>
                                      <span className="fir-file-subtitle">Official State Police Crime Incident Report</span>
                                    </div>
                                  </div>

                                  <div className="fir-file-details-grid">
                                    <div className="fir-detail-pill">
                                      <Landmark size={14} className="fir-detail-icon" />
                                      <div className="fir-detail-text">
                                        <span className="fir-detail-label">Police Station</span>
                                        <span className="fir-detail-value">{fir.police_station || 'Jurisdiction Central PS'}</span>
                                      </div>
                                    </div>

                                    <div className="fir-detail-pill">
                                      <Calendar size={14} className="fir-detail-icon" />
                                      <div className="fir-detail-text">
                                        <span className="fir-detail-label">Incident Date</span>
                                        <span className="fir-detail-value font-mono">
                                          {fir.incident_date ? fir.incident_date.replace(/T.*$/, '') : 'Recorded'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="fir-detail-pill">
                                      <FileText size={14} className="fir-detail-icon" />
                                      <div className="fir-detail-text">
                                        <span className="fir-detail-label">Case Source</span>
                                        <span className="fir-detail-value">{fir.source_file || 'E-FIR Repository'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="fir-file-actions-row">
                                    <div className="fir-file-tag">
                                      <span>STATE CRIMINAL DATABASE • CCTNS RECORD</span>
                                    </div>
                                    <button
                                      className="btn-fir-graph-view"
                                      onClick={() => openTargetedGraph(fir.fir_no)}
                                      title="Investigate FIR Case Network on Graph"
                                    >
                                      <Network size={13} />
                                      <span>Investigate Case Graph</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="dossier-empty-state">
                              <ShieldCheck size={28} color="#10b981" />
                              <p>No formal FIR cases currently filed in jurisdiction.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Initial State when section opened: Search Section in the Middle */
                  <div className="dossier-search-landing-container">
                    <div className="dossier-search-hero-card">
                      <div className="search-hero-icon-wrap">
                        <Search size={26} color="#38bdf8" />
                      </div>
                      <h3 className="search-hero-title">INTELLIGENCE DOSSIER LOOKUP</h3>
                      <p className="search-hero-subtitle">
                        Search and filter the active criminal database by name, alias, vehicle plate, or police FIR case number.
                      </p>

                      <div className="dossier-hero-search-box">
                        <Search size={15} color="#71717a" />
                        <input
                          type="text"
                          placeholder="Search suspect name, case FIR, or vehicle plate..."
                          value={dossierSearch}
                          onChange={(e) => setDossierSearch(e.target.value)}
                          autoFocus
                        />
                        {dossierSearch && (
                          <button
                            onClick={() => setDossierSearch('')}
                            style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
                            title="Clear search"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Matching Results in Center when searching */}
                      {dossierSearch.trim() ? (
                        <div className="dossier-hero-results">
                          <div className="hero-results-header">
                            <span>MATCHING SUSPECTS ({displayedDossierSuspects.length})</span>
                          </div>
                          <div className="hero-results-grid">
                            {displayedDossierSuspects.map((s, idx) => (
                              <div
                                key={idx}
                                className="hero-result-card"
                                onClick={() => setSelectedDossierEntity(s.entity_id)}
                              >
                                <div className="hero-card-left">
                                  <div className="hero-card-avatar">
                                    <User size={15} />
                                  </div>
                                  <div>
                                    <div className="hero-card-name">{s.name}</div>
                                    <div className="hero-card-sub">
                                      {s.connection_count} links • {s.fir_count || 0} FIRs
                                    </div>
                                  </div>
                                </div>
                                <span className={`threat-badge ${getThreatClass(s.threat_level)}`} style={{ fontSize: '8px', padding: '2px 6px' }}>
                                  {s.threat_level}
                                </span>
                              </div>
                            ))}
                            {displayedDossierSuspects.length === 0 && (
                              <div className="hero-no-results">
                                No suspects found matching "{dossierSearch}".
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="dossier-quick-tags-section">
                          <span className="quick-tags-label">QUICK ACCESS DIRECTORY:</span>
                          <div className="quick-tags-list">
                            {criminals.slice(0, 8).map((c, i) => (
                              <button
                                key={i}
                                className="quick-suspect-chip"
                                onClick={() => setSelectedDossierEntity(c.entity_id)}
                              >
                                <User size={11} color="#a1a1aa" />
                                <span>{c.name}</span>
                                <span className="chip-badge">{c.threat_level}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Suspect Search Directory Pane */}
              <div className="dossier-selector-pane">
                <div className="dossier-selector-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '0.6px' }}>
                      SUSPECT DIRECTORY
                    </span>
                    <span className="sidebar-item-badge">{displayedDossierSuspects.length}</span>
                  </div>
                  <div className="criminal-search-box" style={{ maxWidth: '100%' }}>
                    <Search size={14} color="#71717a" />
                    <input
                      type="text"
                      placeholder="Filter suspects..."
                      value={dossierSearch}
                      onChange={(e) => setDossierSearch(e.target.value)}
                    />
                    {dossierSearch && (
                      <button
                        onClick={() => setDossierSearch('')}
                        style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
                        title="Clear filter"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="dossier-selector-list">
                  {displayedDossierSuspects.map((s, idx) => (
                    <div
                      key={idx}
                      className={`dossier-selector-item ${selectedDossierEntity === s.entity_id ? 'active' : ''}`}
                      onClick={() => setSelectedDossierEntity(s.entity_id)}
                    >
                      <div>
                        <div className="dossier-item-name">{s.name}</div>
                        <div className="dossier-item-sub">
                          {s.connection_count} links • {s.fir_count} FIRs
                        </div>
                      </div>
                      <span className={`threat-badge ${getThreatClass(s.threat_level)}`} style={{ fontSize: '8px', padding: '2px 6px' }}>
                        {s.threat_level}
                      </span>
                    </div>
                  ))}
                  {displayedDossierSuspects.length === 0 && (
                    <div style={{ padding: '16px 12px', fontSize: '11px', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                      No suspects match your filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: TOPOLOGY */}
          {activeView === 'topology' && (() => {
            // Redirect: topology view now uses the floating GraphWindow (maximizable)
            // Auto-open and go back to previous view
            if (!isFloatingMapOpen) {
              setTimeout(() => {
                setIsFloatingMapOpen(true);
                setIsFloatingMapMinimized(false);
                setActiveView(previousView || 'threats');
              }, 0);
            }
            return null;
          })()}
        </div>
      </div>

      {/* Portable Floating Network Graph Window */}
      {isFloatingMapOpen && (
        <GraphWindow
          isOpen={isFloatingMapOpen}
          onClose={() => setIsFloatingMapOpen(false)}
          targetEntity={floatingMapEntity || focusedEntityId}
          onOpenDossier={(id) => openDossier(id)}
          isMinimized={isFloatingMapMinimized}
          setIsMinimized={setIsFloatingMapMinimized}
        />
      )}

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchAllData}
      />

      {/* AI Intelligence Copilot Floating Drawer */}
      <AICopilotDrawer
        onSelectEntity={(id) => openDossier(id)}
        onAction={(action) => {
          if (action.type === 'NAVIGATE_GRAPH' && action.target_id) {
            openTargetedGraph(action.target_id);
          } else if (action.type === 'NAVIGATE_MAP') {
            setActiveView('geo_map');
          }
        }}
      />
    </div>
  );
}
