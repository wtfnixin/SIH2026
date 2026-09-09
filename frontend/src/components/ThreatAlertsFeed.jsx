import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  PhoneOff, 
  Car, 
  Search, 
  Filter, 
  MapPin, 
  ExternalLink, 
  ArrowRight, 
  Activity,
  DollarSign,
  Radio,
  Clock
} from 'lucide-react';

// Default realistic sample threat alerts if DB is empty or fresh
const DEFAULT_SAMPLE_STRUCTURING = [
  {
    alert_id: 'HWL-8902',
    sender_suspect: 'Vikrant_Sharma',
    receiver_suspect: 'Rajesh_Verma',
    total_structured_amount: 875000,
    transfer_count: 89,
    timestamp: '2 mins ago',
    severity: 'CRITICAL',
    details: 'Multi-hop transactions split under ₹10,000 RBI reporting threshold'
  },
  {
    alert_id: 'HWL-7741',
    sender_suspect: 'Imran_Siddiqui',
    receiver_suspect: 'Deepak_Rawat',
    total_structured_amount: 450000,
    transfer_count: 47,
    timestamp: '14 mins ago',
    severity: 'HIGH',
    details: 'Rapid cyclic UPI micro-bursts routed via 3 intermediary shell wallets'
  },
  {
    alert_id: 'HWL-6619',
    sender_suspect: 'Sunil_Bhardwaj',
    receiver_suspect: 'Arjun_Nair',
    total_structured_amount: 620000,
    transfer_count: 63,
    timestamp: '38 mins ago',
    severity: 'HIGH',
    details: 'Coordinated smurfing deposits across 5 different NCR banking terminals'
  }
];

const DEFAULT_SAMPLE_BURNERS = [
  {
    alert_id: 'BRN-1044',
    phone_number: '+91-98765-43210',
    registered_owner: 'Fake KYC / Roaming SIM',
    total_calls_made: 142,
    active_duration: '48h',
    timestamp: '6 mins ago',
    severity: 'CRITICAL',
    details: 'High-frequency burst calls exclusively to known syndicate operators'
  },
  {
    alert_id: 'BRN-2098',
    phone_number: '+91-98111-22334',
    registered_owner: 'Alias: Kabir Sheikh',
    total_calls_made: 88,
    active_duration: '24h',
    timestamp: '22 mins ago',
    severity: 'HIGH',
    details: 'Zero incoming voice, 88 outgoing calls with cell tower triangulation shifts'
  },
  {
    alert_id: 'BRN-3312',
    phone_number: '+91-97234-88990',
    registered_owner: 'Forged Aadhaar ID',
    total_calls_made: 56,
    active_duration: '72h',
    timestamp: '1 hour ago',
    severity: 'MODERATE',
    details: 'Burner SIM swapped across 3 distinct IMEI devices within 48 hours'
  }
];

const DEFAULT_SAMPLE_COLOCATIONS = [
  {
    alert_id: 'ANPR-552',
    vehicle_1: 'DL-01-AB-1234',
    vehicle_2: 'HR-26-CD-5678',
    co_location_point: 'Delhi-Jaipur Highway Toll Plaza',
    sighting_frequency: 18,
    timestamp: 'Just now',
    severity: 'CRITICAL',
    details: 'Tandem convoy transit detected across 4 consecutive ANPR camera gantries'
  },
  {
    alert_id: 'ANPR-819',
    vehicle_1: 'UP-16-EF-9012',
    vehicle_2: 'DL-04-GH-3456',
    co_location_point: 'Noida Sector 62 Junction',
    sighting_frequency: 11,
    timestamp: '19 mins ago',
    severity: 'HIGH',
    details: 'Simultaneous nocturnal checkpoint passes within 90-second intervals'
  },
  {
    alert_id: 'ANPR-933',
    vehicle_1: 'HR-51-JK-7890',
    vehicle_2: 'RJ-14-LM-2345',
    co_location_point: 'Gurugram IFFCO Chowk Bypass',
    sighting_frequency: 9,
    timestamp: '45 mins ago',
    severity: 'MODERATE',
    details: 'Repetitive rendezvous pattern matched with Hawala transaction timestamps'
  }
];

export default function ThreatAlertsFeed({ alerts, onSelectEntity, onFocusEntity }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Extract raw backend arrays, supporting both nested and flat structures
  const rawStructuring = alerts?.alerts?.financial_structuring || alerts?.financial_structuring || [];
  const rawBurners = alerts?.alerts?.burner_phones || alerts?.burner_phones || [];
  const rawColocations = alerts?.alerts?.anpr_colocations || alerts?.anpr_colocations || [];

  // Use realistic demo fallbacks if DB returns empty
  const structuring = rawStructuring.length > 0 ? rawStructuring : DEFAULT_SAMPLE_STRUCTURING;
  const burners = rawBurners.length > 0 ? rawBurners : DEFAULT_SAMPLE_BURNERS;
  const colocations = rawColocations.length > 0 ? rawColocations : DEFAULT_SAMPLE_COLOCATIONS;

  const totalCount = structuring.length + burners.length + colocations.length;

  // Calculate KPI metrics
  const totalSmurfedAmount = useMemo(() => {
    return structuring.reduce((acc, item) => acc + (Number(item.total_structured_amount) || 0), 0);
  }, [structuring]);

  // Handle entity click (Dossier + Focus on Map)
  const handleInspect = (entityId) => {
    if (onSelectEntity) onSelectEntity(entityId);
    if (onFocusEntity) onFocusEntity(entityId);
  };

  // Filtered lists
  const filteredStructuring = useMemo(() => {
    return structuring.filter(item => {
      const matchesSearch = !searchQuery || 
        item.sender_suspect?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.receiver_suspect?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.alert_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [structuring, searchQuery, severityFilter]);

  const filteredBurners = useMemo(() => {
    return burners.filter(item => {
      const matchesSearch = !searchQuery || 
        item.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.registered_owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.alert_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [burners, searchQuery, severityFilter]);

  const filteredColocations = useMemo(() => {
    return colocations.filter(item => {
      const matchesSearch = !searchQuery || 
        item.vehicle_1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vehicle_2?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.co_location_point?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.alert_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [colocations, searchQuery, severityFilter]);

  const totalFilteredCount = 
    (activeTab === 'all' || activeTab === 'structuring' ? filteredStructuring.length : 0) +
    (activeTab === 'all' || activeTab === 'burners' ? filteredBurners.length : 0) +
    (activeTab === 'all' || activeTab === 'colocations' ? filteredColocations.length : 0);

  return (
    <div className="threat-feed-main-container glass-card">
      {/* Top Threat Feed Header */}
      <div className="threat-header-bar">
        <div className="threat-header-left">
          <div className="threat-icon-badge">
            <ShieldAlert size={20} color="#f43f5e" />
          </div>
          <div>
            <div className="threat-title-row">
              <h2 className="threat-main-title">REAL-TIME THREAT INTELLIGENCE MATRIX</h2>
              <span className="live-status-chip">
                <span className="live-pulse-dot" /> LIVE SURVEILLANCE
              </span>
            </div>
            <p className="threat-subtitle">
              Automated pattern detection across financial smurfing, burner SIM clusters, and ANPR convoy surveillance
            </p>
          </div>
        </div>

        <div className="threat-header-right">
          <div className="total-alert-count-box">
            <span className="count-number">{totalCount}</span>
            <span className="count-label">ACTIVE THREATS</span>
          </div>
        </div>
      </div>

      {/* KPI Analytics Metric Cards */}
      <div className="threat-kpi-grid">
        <div className="threat-kpi-card kpi-hawala">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Hawala Smurfing Tracked</span>
            <div className="kpi-value-row">
              <span className="kpi-value">₹{totalSmurfedAmount.toLocaleString('en-IN')}</span>
              <span className="kpi-badge-count">{structuring.length} Rings</span>
            </div>
          </div>
        </div>

        <div className="threat-kpi-card kpi-burners">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <PhoneOff size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Burner SIM Anomalies</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{burners.length} Active Lines</span>
              <span className="kpi-badge-count" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                High Churn
              </span>
            </div>
          </div>
        </div>

        <div className="threat-kpi-card kpi-convoys">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}>
            <Car size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">ANPR Convoy Sightings</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{colocations.length} Tandem Pairs</span>
              <span className="kpi-badge-count" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                Co-located
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Categories, Severity, and Live Search */}
      <div className="threat-controls-row">
        {/* Category Tabs */}
        <div className="threat-category-tabs">
          <button
            onClick={() => setActiveTab('all')}
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          >
            All Threats ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('structuring')}
            className={`tab-btn ${activeTab === 'structuring' ? 'active' : ''}`}
          >
            <AlertTriangle size={13} /> Hawala ({structuring.length})
          </button>
          <button
            onClick={() => setActiveTab('burners')}
            className={`tab-btn ${activeTab === 'burners' ? 'active' : ''}`}
          >
            <PhoneOff size={13} /> Burners ({burners.length})
          </button>
          <button
            onClick={() => setActiveTab('colocations')}
            className={`tab-btn ${activeTab === 'colocations' ? 'active' : ''}`}
          >
            <Car size={13} /> Convoys ({colocations.length})
          </button>
        </div>

        {/* Search & Severity Filter */}
        <div className="threat-filter-tools">
          <div className="threat-search-input-box">
            <Search size={14} className="search-icon-dim" />
            <input
              type="text"
              placeholder="Filter by suspect, phone, plate, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="threat-search-field"
            />
          </div>

          <div className="threat-severity-select-wrap">
            <Filter size={13} color="#94a3b8" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="threat-severity-select"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Severity</option>
              <option value="MODERATE">Moderate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Threat Feed Cards Grid */}
      <div className="threat-cards-scroll-area">
        {totalFilteredCount === 0 ? (
          <div className="empty-threat-state">
            <ShieldAlert size={36} color="#64748b" />
            <p className="empty-title">No Threats Match Current Filters</p>
            <p className="empty-sub">Try adjusting your search keywords or switching category tabs.</p>
          </div>
        ) : (
          <div className="threat-cards-grid">
            {/* Financial Hawala Smurfing Cards */}
            {(activeTab === 'all' || activeTab === 'structuring') &&
              filteredStructuring.map((a) => (
                <div key={a.alert_id} className="threat-intel-card card-hawala">
                  <div className="card-top-bar">
                    <div className="card-badge hawala-badge">
                      <AlertTriangle size={13} />
                      <span>HAWALA SMURFING RING</span>
                    </div>
                    <span className={`severity-tag ${a.severity ? a.severity.toLowerCase() : 'critical'}`}>
                      {a.severity || 'CRITICAL'}
                    </span>
                  </div>

                  <div className="card-main-info">
                    <div className="card-money-headline">
                      <span className="money-amount">
                        ₹{(a.total_structured_amount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="money-sub">
                        {a.transfer_count || 45} micro-transfers
                      </span>
                    </div>

                    <div className="flow-route-box">
                      <div className="entity-flow-item" onClick={() => handleInspect(a.sender_suspect)}>
                        <span className="entity-role">SENDER</span>
                        <span className="entity-id-link">{a.sender_suspect}</span>
                      </div>
                      <ArrowRight size={14} className="route-arrow" />
                      <div className="entity-flow-item" onClick={() => handleInspect(a.receiver_suspect)}>
                        <span className="entity-role">RECEIVER</span>
                        <span className="entity-id-link">{a.receiver_suspect}</span>
                      </div>
                    </div>

                    <p className="card-intel-notes">
                      {a.details || 'Structured transfers kept below ₹10,000 threshold across multiple banking nodes.'}
                    </p>
                  </div>

                  <div className="card-bottom-actions">
                    <span className="card-timestamp">
                      <Clock size={11} /> {a.timestamp || '5 mins ago'}
                    </span>
                    <div className="card-action-btn-group">
                      <button
                        onClick={() => handleInspect(a.sender_suspect)}
                        className="action-link-btn"
                        title="Open Full Criminal Dossier"
                      >
                        <ExternalLink size={12} /> Dossier
                      </button>
                      <button
                        onClick={() => {
                          if (onFocusEntity) onFocusEntity(a.sender_suspect);
                          if (onSelectEntity) onSelectEntity(a.sender_suspect);
                        }}
                        className="action-link-btn highlight"
                        title="Locate in Network Map"
                      >
                        <MapPin size={12} /> Focus Map
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Burner Phone Cards */}
            {(activeTab === 'all' || activeTab === 'burners') &&
              filteredBurners.map((b) => (
                <div key={b.alert_id} className="threat-intel-card card-burner">
                  <div className="card-top-bar">
                    <div className="card-badge burner-badge">
                      <PhoneOff size={13} />
                      <span>DISPOSABLE BURNER SIM</span>
                    </div>
                    <span className={`severity-tag ${b.severity ? b.severity.toLowerCase() : 'high'}`}>
                      {b.severity || 'HIGH'}
                    </span>
                  </div>

                  <div className="card-main-info">
                    <div className="phone-number-headline">
                      <span className="phone-id">{b.phone_number}</span>
                      <span className="call-volume-tag">
                        {b.total_calls_made || 0} Outgoing Calls
                      </span>
                    </div>

                    <div className="owner-status-box">
                      <span className="owner-label">REGISTERED SUBSCRIBER:</span>
                      <span className="owner-value">{b.registered_owner || 'Unknown / Forged Identity'}</span>
                    </div>

                    <p className="card-intel-notes">
                      {b.details || 'Anomalous call-burst pattern with near-zero incoming calls and short IMEI lifespan.'}
                    </p>
                  </div>

                  <div className="card-bottom-actions">
                    <span className="card-timestamp">
                      <Clock size={11} /> {b.timestamp || '18 mins ago'}
                    </span>
                    <div className="card-action-btn-group">
                      <button
                        onClick={() => handleInspect(b.phone_number)}
                        className="action-link-btn"
                        title="Open Suspect Dossier"
                      >
                        <ExternalLink size={12} /> Dossier
                      </button>
                      <button
                        onClick={() => {
                          if (onFocusEntity) onFocusEntity(b.phone_number);
                          if (onSelectEntity) onSelectEntity(b.phone_number);
                        }}
                        className="action-link-btn highlight"
                        title="Locate in Network Map"
                      >
                        <MapPin size={12} /> Focus Map
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* ANPR Convoy Sighting Cards */}
            {(activeTab === 'all' || activeTab === 'colocations') &&
              filteredColocations.map((c) => (
                <div key={c.alert_id} className="threat-intel-card card-convoy">
                  <div className="card-top-bar">
                    <div className="card-badge convoy-badge">
                      <Car size={13} />
                      <span>ANPR CONVOY SIGHTING</span>
                    </div>
                    <span className={`severity-tag ${c.severity ? c.severity.toLowerCase() : 'high'}`}>
                      {c.severity || 'HIGH'}
                    </span>
                  </div>

                  <div className="card-main-info">
                    <div className="convoy-vehicles-headline">
                      <div className="vehicle-tag" onClick={() => handleInspect(c.vehicle_1)}>
                        {c.vehicle_1}
                      </div>
                      <span className="convoy-tandem-sign">&</span>
                      <div className="vehicle-tag" onClick={() => handleInspect(c.vehicle_2)}>
                        {c.vehicle_2}
                      </div>
                    </div>

                    <div className="location-sighting-box">
                      <div className="location-row">
                        <MapPin size={13} color="#ffffff" />
                        <span className="location-name">{c.co_location_point || 'Surveillance Toll Checkpoint'}</span>
                      </div>
                      <span className="frequency-badge">
                        {c.sighting_frequency || 12} Tandem Sightings
                      </span>
                    </div>

                    <p className="card-intel-notes">
                      {c.details || 'Consecutive passage through automatic number plate recognition gantries in convoy formation.'}
                    </p>
                  </div>

                  <div className="card-bottom-actions">
                    <span className="card-timestamp">
                      <Clock size={11} /> {c.timestamp || 'Just now'}
                    </span>
                    <div className="card-action-btn-group">
                      <button
                        onClick={() => handleInspect(c.vehicle_1)}
                        className="action-link-btn"
                        title="Open Vehicle Dossier"
                      >
                        <ExternalLink size={12} /> Dossier
                      </button>
                      <button
                        onClick={() => {
                          if (onFocusEntity) onFocusEntity(c.vehicle_1);
                          if (onSelectEntity) onSelectEntity(c.vehicle_1);
                        }}
                        className="action-link-btn highlight"
                        title="Locate in Network Map"
                      >
                        <MapPin size={12} /> Focus Map
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
