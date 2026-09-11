import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Camera,
  ShieldAlert,
  Car,
  Play,
  Pause,
  RotateCcw,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Compass,
  Layers,
  Crosshair,
  Radio,
  DollarSign,
  PhoneCall,
  CreditCard,
  Building,
  Activity,
  X
} from 'lucide-react';

/* ──────────────────────────────────────────
   CUSTOM LEAFLET ICONS (CLEAN, SHARP, THEMED SVG)
────────────────────────────────────────── */
const createGantryIcon = (count) => {
  const size = 28;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:rgba(15, 23, 42, 0.94);
        border:1.5px solid rgba(56, 189, 248, 0.8);
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0, 0, 0, 0.6);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;position:relative;
        transition:transform 0.15s ease, border-color 0.15s ease;
      ">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1px;">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
        <div style="font-size:8px;font-weight:700;color:#f1f5f9;font-family:monospace;letter-spacing:0.02em;line-height:1;">${count}</div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createCellTowerIcon = (pings) => {
  const size = 28;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:rgba(25, 20, 10, 0.94);
        border:1.5px solid rgba(251, 191, 36, 0.85);
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0, 0, 0, 0.6);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;
      ">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
        </svg>
        <div style="font-size:8px;font-weight:700;color:#fef3c7;font-family:monospace;line-height:1;">${pings}</div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createFinancialIcon = () => {
  const size = 28;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:rgba(10, 26, 20, 0.94);
        border:1.5px solid rgba(52, 211, 153, 0.85);
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0, 0, 0, 0.6);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;
      ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createConvoyIcon = () => {
  const size = 30;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:rgba(30, 10, 15, 0.94);
        border:1.5px solid rgba(248, 113, 113, 0.85);
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0, 0, 0, 0.6);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createMultiSourceIcon = (seq, sourceType, isCurrent) => {
  const s = isCurrent ? 26 : 20;
  let bg = '#0369a1';
  let border = '#38bdf8';
  if (sourceType === 'CDR') {
    bg = isCurrent ? '#d97706' : '#b45309';
    border = '#fbbf24';
  } else if (sourceType === 'FINANCIAL') {
    bg = isCurrent ? '#059669' : '#047857';
    border = '#34d399';
  } else {
    bg = isCurrent ? '#0284c7' : '#0369a1';
    border = '#38bdf8';
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${s}px;height:${s}px;
        background:${bg};
        border:1.5px solid ${border};
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0, 0, 0, 0.6);
        display:flex;align-items:center;justify-content:center;
        color:#ffffff;font-weight:800;font-size:${isCurrent ? 11 : 9}px;font-family:monospace;
      ">${seq}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, sizeAnchor(s)]
  });
};

const sizeAnchor = (s) => s / 2;

/* ──────────────────────────────────────────
   MAP SUB-COMPONENTS & CONTROLLERS
────────────────────────────────────────── */
function MapController({ flyTarget }) {
  const map = useMap();
  const lastTargetIdRef = useRef(null);

  useEffect(() => {
    // Invalidate size on mount & window resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!flyTarget || flyTarget.id === lastTargetIdRef.current) return;
    lastTargetIdRef.current = flyTarget.id;

    if (flyTarget.bounds && flyTarget.bounds.length > 0) {
      try {
        map.fitBounds(flyTarget.bounds, { padding: [50, 50], maxZoom: 15, duration: 1.2 });
      } catch (e) {
        if (flyTarget.center) {
          map.flyTo(flyTarget.center, flyTarget.zoom || 12, { duration: 1.2, easeLinearity: 0.25 });
        }
      }
    } else if (flyTarget.center && flyTarget.center.length === 2 && !isNaN(flyTarget.center[0]) && !isNaN(flyTarget.center[1])) {
      map.flyTo(flyTarget.center, flyTarget.zoom || 12, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [flyTarget, map]);

  return null;
}

function ZoomWatcher({ onTelemetryChange }) {
  useMapEvents({
    zoomend: (e) => {
      const z = e.target.getZoom();
      const c = e.target.getCenter();
      if (c) onTelemetryChange?.(z, [c.lat, c.lng]);
    },
    moveend: (e) => {
      const z = e.target.getZoom();
      const c = e.target.getCenter();
      if (c) onTelemetryChange?.(z, [c.lat, c.lng]);
    }
  });
  return null;
}

/* Tactical Map Navigation Controls */
function TacticalMapControls({ onRecenter }) {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const mapContainer = map.getContainer().parentElement;
    if (!document.fullscreenElement) {
      mapContainer?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const btnStyle = {
    width: 32,
    height: 32,
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    color: '#38bdf8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    transition: 'all 0.15s ease'
  };

  return (
    <div style={{
      position: 'absolute',
      right: 16,
      top: 76,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      <button style={btnStyle} onClick={() => map.zoomIn(1)} title="Zoom In">
        <Plus size={15} />
      </button>
      <button style={btnStyle} onClick={() => map.zoomOut(1)} title="Zoom Out">
        <Minus size={15} />
      </button>
      <button
        style={btnStyle}
        onClick={() => onRecenter?.()}
        title="Recenter Target or Region"
      >
        <Crosshair size={15} />
      </button>
      <button style={btnStyle} onClick={toggleFullscreen} title="Toggle Fullscreen">
        <Layers size={14} />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────── */
export default function GeospatialMapCanvas({ onSelectEntity, onOpenDossier, initialVehiclePlate = null }) {
  const [regions, setRegions] = useState([
    { id: 'delhi', name: 'Delhi-NCR', state: 'Delhi / UP / HR', center: [28.6139, 77.2090], zoom: 11, pincodes: ['110001', '110006', '110014', '201301', '122002', '121001'] },
    { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', center: [12.9716, 77.5946], zoom: 11, pincodes: ['560001', '560034', '560066', '560100', '560024', '560038'] },
    { id: 'mumbai', name: 'Mumbai Metropolitan', state: 'Maharashtra', center: [19.0760, 72.8777], zoom: 11, pincodes: ['400001', '400050', '400051', '400076', '410206'] },
    { id: 'hyderabad', name: 'Hyderabad Cyberabad', state: 'Telangana', center: [17.3850, 78.4867], zoom: 11, pincodes: ['500081', '500032', '500003', '500072'] },
    { id: 'kolkata', name: 'Kolkata Metro', state: 'West Bengal', center: [22.5726, 88.3639], zoom: 11, pincodes: ['700001', '700091', '700016', '700053'] },
    { id: 'chennai', name: 'Chennai Corridor', state: 'Tamil Nadu', center: [13.0827, 80.2707], zoom: 11, pincodes: ['600001', '600034', '600096', '600100'] }
  ]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPincode, setSelectedPincode] = useState('');

  const [gantries, setGantries] = useState([]);
  const [convoys, setConvoys] = useState([]);
  const [cellTowers, setCellTowers] = useState([]);
  const [financialLocations, setFinancialLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Autocomplete
  const [searchPlate, setSearchPlate] = useState(initialVehiclePlate || '');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState('');
  const searchContainerRef = useRef(null);

  const [activeVehicle, setActiveVehicle] = useState(null);
  const [trajectory, setTrajectory] = useState([]);
  const [sourceCounts, setSourceCounts] = useState({ anpr: 0, cdr: 0, financial: 0 });
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const playbackRef = useRef(null);

  // Decoupled map camera states (flyTarget for explicit navigation, telemetry for readout)
  const [flyTarget, setFlyTarget] = useState({ center: [22.5937, 78.9629], zoom: 5, id: 1 });
  const [telemetry, setTelemetry] = useState({ zoom: 5, lat: 22.59, lng: 78.96 });
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedGantry, setSelectedGantry] = useState(null);
  const [mapKey] = useState('tactical-map-v5');

  // CSS injection for clean overrides
  useEffect(() => {
    const id = 'geo-map-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes livePulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.35; transform: scale(0.85); }
      }
      .leaflet-popup-content-wrapper {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .leaflet-popup-tip-container { display: none !important; }
      .leaflet-control-zoom { display: none !important; }
      .leaflet-control-attribution { display: none !important; }
      .leaflet-container { background: #020617 !important; }
    `;
    document.head.appendChild(style);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch registered surveillance regions from backend
  useEffect(() => {
    fetch('http://localhost:8000/api/v1/geo/regions')
      .then(r => r.json())
      .then(data => {
        if (data.regions?.length) {
          setRegions(data.regions);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch geospatial data filtered by chosen region and pincode
  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (selectedRegion && selectedRegion !== 'all') {
      queryParams.append('region', selectedRegion);
    }
    if (selectedPincode) {
      queryParams.append('pincode', selectedPincode);
    }
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    Promise.all([
      fetch(`http://localhost:8000/api/v1/geo/anpr-sightings${qs}`).then(r => r.json()).catch(() => ({ gantries: [] })),
      fetch(`http://localhost:8000/api/v1/geo/convoys${qs}`).then(r => r.json()).catch(() => ({ convoys: [] })),
      fetch(`http://localhost:8000/api/v1/geo/cell-towers${qs}`).then(r => r.json()).catch(() => ({ towers: [] })),
      fetch(`http://localhost:8000/api/v1/geo/financial-locations${qs}`).then(r => r.json()).catch(() => ({ locations: [] }))
    ])
      .then(([g, c, t, f]) => {
        setGantries(g.gantries || []);
        setConvoys(c.convoys || []);
        setCellTowers(t.towers || []);
        setFinancialLocations(f.locations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedRegion, selectedPincode]);

  // Handle region switch with auto camera flyTo
  const handleRegionChange = (regionId) => {
    setSelectedRegion(regionId);
    setSelectedPincode('');
    if (regionId === 'all') {
      setFlyTarget({ center: [22.5937, 78.9629], zoom: 5, id: Date.now() });
      setSearchFeedback('🌐 NATIONAL GRID: ALL INDIA SURVEILLANCE');
    } else {
      const reg = regions.find(r => r.id === regionId);
      if (reg && reg.center) {
        setFlyTarget({ center: reg.center, zoom: reg.zoom || 11, id: Date.now() });
        setSearchFeedback(`📍 CORRIDOR: ${reg.name.toUpperCase()} (${reg.state})`);
      }
    }
    setTimeout(() => setSearchFeedback(''), 4000);
  };

  // Real-time debounced search query
  useEffect(() => {
    if (!searchPlate || searchPlate.trim().length === 0) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`http://localhost:8000/api/v1/geo/search?q=${encodeURIComponent(searchPlate.trim())}`)
        .then(r => r.json())
        .then(data => {
          if (data.matches && data.matches.length > 0) {
            setSearchResults(data.matches);
            setShowSearchDropdown(true);
          } else {
            setSearchResults([]);
          }
        })
        .catch(() => {});
    }, 180);

    return () => clearTimeout(timer);
  }, [searchPlate]);

  const handleSelectSearchResult = (match) => {
    setShowSearchDropdown(false);

    if (match.type === 'REGION') {
      handleRegionChange(match.id);
      setSearchPlate(match.name);
    } else if (match.type === 'PINCODE') {
      setSelectedRegion(match.region);
      setSelectedPincode(match.pincode);
      setFlyTarget({ center: match.center, zoom: 14, id: Date.now() });
      setSearchPlate(match.pincode);
      setSearchFeedback(`📮 PINCODE ${match.pincode}: ${match.city}`);
    } else if (match.type === 'GANTRY' || match.type === 'CELL_TOWER' || match.type === 'FINANCIAL' || match.type === 'CONVOY') {
      if (match.region) setSelectedRegion(match.region);
      if (match.pincode) setSelectedPincode(match.pincode);
      setFlyTarget({ center: match.center, zoom: 15, id: Date.now() });
      setSearchPlate(match.name);
      setSearchFeedback(`🎯 TARGET: ${match.name} (${match.city || ''})`);
    }

    setTimeout(() => setSearchFeedback(''), 4500);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setShowSearchDropdown(false);
    const q = searchPlate.trim();
    if (!q) return;

    // If matches exist in search result, jump to top result
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0]);
    } else {
      fetchTrajectory(q);
    }
  };

  const currentRegionObj = regions.find(r => r.id === selectedRegion);
  const availablePincodes = currentRegionObj ? (currentRegionObj.pincodes || []) : [];

  const fetchTrajectory = useCallback((query) => {
    if (!query?.trim()) return;
    setLoadingTrajectory(true);
    setIsPlaying(false);
    fetch(`http://localhost:8000/api/v1/geo/unified-trajectory/${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(data => {
        setActiveVehicle({ registration_number: query.trim(), model: 'Target Investigation Subject' });
        const pts = data.trajectory || [];
        setTrajectory(pts);
        setSourceCounts(data.source_counts || { anpr: 0, cdr: 0, financial: 0 });
        setPlaybackIndex(0); // Start at Stop 1 by default
        setLoadingTrajectory(false);
        if (pts.length > 0) {
          setFlyTarget({ center: [pts[0].lat, pts[0].lng], zoom: 13, id: Date.now() });
          setSearchFeedback(`🛰️ CORRELATED ${pts.length} CROSS-MODAL STOPS FOR ${query.trim().toUpperCase()}`);
          setTimeout(() => setSearchFeedback(''), 4500);
        }
      })
      .catch(() => setLoadingTrajectory(false));
  }, []);

  const handleRecenter = () => {
    if (currentPt) {
      setFlyTarget({ center: [currentPt.lat, currentPt.lng], zoom: 14, id: Date.now() });
    } else if (currentRegionObj && currentRegionObj.center) {
      setFlyTarget({ center: currentRegionObj.center, zoom: currentRegionObj.zoom || 11, id: Date.now() });
    } else {
      setFlyTarget({ center: [22.5937, 78.9629], zoom: 5, id: Date.now() });
    }
  };

  useEffect(() => {
    if (initialVehiclePlate) fetchTrajectory(initialVehiclePlate);
  }, [initialVehiclePlate, fetchTrajectory]);

  // Playback animation
  useEffect(() => {
    if (isPlaying && trajectory.length > 0) {
      playbackRef.current = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= trajectory.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1400);
    } else clearInterval(playbackRef.current);
    return () => clearInterval(playbackRef.current);
  }, [isPlaying, trajectory]);

  const visibleTrajectory = trajectory.slice(0, playbackIndex + 1);
  const polylineCoords = visibleTrajectory.map(pt => [pt.lat, pt.lng]);
  const currentPt = trajectory[playbackIndex];

  const filters = [
    { id: 'all', label: 'ALL LAYERS', icon: Layers, color: '#38bdf8' },
    { id: 'gantries', label: 'ANPR GANTRIES', icon: Camera, color: '#06b6d4' },
    { id: 'cdr', label: 'CELL TOWERS (CDR)', icon: Radio, color: '#fbbf24' },
    { id: 'financial', label: 'ATM & FINANCIAL', icon: CreditCard, color: '#34d399' },
    { id: 'convoys', label: 'CONVOY ALERTS', icon: ShieldAlert, color: '#f87171' },
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#020617',
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    }}>
      {/* ── TOP HUD HEADER ── */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: 'rgba(8, 14, 26, 0.94)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.28)',
        borderRadius: 14,
        padding: '8px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75)'
      }}>
        {/* Left Section: System Title, Territory Selector & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(14, 165, 233, 0.3))',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Navigation size={16} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.08em' }}>
                SPATIAL SURVEILLANCE
              </span>
              <span style={{
                fontSize: 8.5, fontWeight: 800, padding: '2px 6px',
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 4, color: '#34d399', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', background: '#34d399',
                  display: 'inline-block', animation: 'livePulse 1.8s infinite'
                }} />
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b', letterSpacing: '0.04em' }}>
              {selectedRegion === 'all' ? 'NATIONAL GRID' : currentRegionObj?.name.toUpperCase()}: {gantries.length} ANPR · {cellTowers.length} CDR · {financialLocations.length} ATM · {convoys.length} CONVOYS
            </div>
          </div>

          {/* Territory / Metro Corridor Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 8, padding: '4px 8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
            }}>
              <MapPin size={13} color="#38bdf8" />
              <select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#38bdf8',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="all" style={{ background: '#0f172a', color: '#f8fafc' }}>
                  🌐 NATIONAL GRID (ALL INDIA)
                </option>
                {regions.map(r => (
                  <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                    📍 {r.name.toUpperCase()} ({r.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Pincode Drill-down Filter */}
            {selectedRegion !== 'all' && availablePincodes.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                borderRadius: 8, padding: '4px 8px'
              }}>
                <span style={{ fontSize: 8.5, color: '#34d399', fontWeight: 800 }}>PIN:</span>
                <select
                  value={selectedPincode}
                  onChange={(e) => setSelectedPincode(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#34d399',
                    fontSize: 9.5,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: '#0f172a', color: '#f8fafc' }}>ALL PINCODES</option>
                  {availablePincodes.map(pin => (
                    <option key={pin} value={pin} style={{ background: '#0f172a', color: '#f8fafc' }}>{pin}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Center: Smart Spatial & Pincode Search with Autocomplete */}
        <div ref={searchContainerRef} style={{ position: 'relative', width: 320 }}>
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 9, padding: '4px 6px 4px 10px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
            }}
          >
            <Search size={13} color="#38bdf8" />
            <input
              type="text"
              value={searchPlate}
              onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
              onChange={(e) => setSearchPlate(e.target.value)}
              placeholder="Search Pincode, City, Gantry, or Plate..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#f8fafc', fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.04em', width: '100%', fontFamily: 'inherit'
              }}
            />
            {searchPlate && (
              <button
                type="button"
                onClick={() => { setSearchPlate(''); setSearchResults([]); setShowSearchDropdown(false); }}
                style={{
                  background: 'transparent', border: 'none', color: '#64748b',
                  cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center'
                }}
                title="Clear"
              >
                <X size={12} />
              </button>
            )}
            <button
              type="submit"
              disabled={loadingTrajectory}
              style={{
                background: loadingTrajectory
                  ? 'rgba(6, 182, 212, 0.15)'
                  : 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: 7,
                color: loadingTrajectory ? '#64748b' : '#ffffff',
                fontSize: 9.5, fontWeight: 800, padding: '5px 10px',
                cursor: loadingTrajectory ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 4,
                boxShadow: loadingTrajectory ? 'none' : '0 0 10px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Crosshair size={11} />
              <span>{loadingTrajectory ? 'FINDING...' : 'SEARCH'}</span>
            </button>
          </form>

          {/* Real-time Autocomplete Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 2000,
              background: 'rgba(8, 14, 26, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 10,
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85)',
              maxHeight: 280,
              overflowY: 'auto',
              padding: '6px 0'
            }}>
              <div style={{ fontSize: 8, color: '#64748b', padding: '4px 10px', letterSpacing: '0.08em', fontWeight: 800 }}>
                MATCHED SPATIAL LOCATIONS & TARGETS:
              </div>
              {searchResults.map((item, idx) => {
                let badgeBg = 'rgba(56, 189, 248, 0.15)';
                let badgeColor = '#38bdf8';
                let icon = <MapPin size={12} color="#38bdf8" />;
                if (item.type === 'PINCODE') {
                  badgeBg = 'rgba(52, 211, 153, 0.15)';
                  badgeColor = '#34d399';
                  icon = <Building size={12} color="#34d399" />;
                } else if (item.type === 'GANTRY') {
                  badgeBg = 'rgba(6, 182, 212, 0.15)';
                  badgeColor = '#06b6d4';
                  icon = <Camera size={12} color="#06b6d4" />;
                } else if (item.type === 'CELL_TOWER') {
                  badgeBg = 'rgba(251, 191, 36, 0.15)';
                  badgeColor = '#fbbf24';
                  icon = <Radio size={12} color="#fbbf24" />;
                } else if (item.type === 'FINANCIAL') {
                  badgeBg = 'rgba(52, 211, 153, 0.15)';
                  badgeColor = '#34d399';
                  icon = <CreditCard size={12} color="#34d399" />;
                } else if (item.type === 'CONVOY') {
                  badgeBg = 'rgba(239, 68, 68, 0.15)';
                  badgeColor = '#f87171';
                  icon = <ShieldAlert size={12} color="#f87171" />;
                }

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.12s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      {icon}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.name || `Pincode ${item.pincode}`}
                        </div>
                        <div style={{ fontSize: 8.5, color: '#94a3b8' }}>
                          {item.details || item.city}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 7.5, fontWeight: 800, padding: '2px 5px',
                      background: badgeBg, color: badgeColor,
                      borderRadius: 4, letterSpacing: '0.04em', whiteSpace: 'nowrap'
                    }}>
                      {item.type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section: Filter Pills & Telemetry Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Segmented Filter Pills */}
          <div style={{
            display: 'flex', gap: 4,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 10, padding: 3
          }}>
            {filters.map(f => {
              const IconComponent = f.icon;
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  style={{
                    background: isActive ? f.color : 'transparent',
                    border: 'none', borderRadius: 7,
                    color: isActive ? '#020617' : '#94a3b8',
                    fontSize: 9.5, fontWeight: 800, padding: '5px 10px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: isActive ? `0 0 12px ${f.color}66` : 'none',
                    transition: 'all 0.18s'
                  }}
                >
                  <IconComponent size={12} color={isActive ? '#020617' : '#64748b'} />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Coordinate Readout */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.22)',
            borderRadius: 8, padding: '5px 10px',
            fontSize: 9, color: '#38bdf8', fontWeight: 700, letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap'
          }}>
            <Compass size={12} color="#38bdf8" />
            <span>Z:{telemetry.zoom} · {telemetry.lat?.toFixed(2)}°N {telemetry.lng?.toFixed(2)}°E</span>
          </div>
        </div>
      </div>

      {/* ── TACTICAL FEEDBACK NOTIFICATION BANNER ── */}
      {searchFeedback && (
        <div style={{
          position: 'absolute',
          top: 68,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          borderRadius: 8,
          padding: '5px 14px',
          color: '#38bdf8',
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: '0.06em',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 12px rgba(56, 189, 248, 0.25)'
        }}>
          {searchFeedback}
        </div>
      )}

      {/* ── LEAFLET MAP ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer
          key={mapKey}
          center={[22.5937, 78.9629]}
          zoom={5}
          zoomControl={false}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          style={{ width: '100%', height: '100%', background: '#020617' }}
        >
          <MapController flyTarget={flyTarget} />
          <ZoomWatcher onTelemetryChange={(z, c) => setTelemetry({ zoom: z, lat: c[0], lng: c[1] })} />
          <TacticalMapControls onRecenter={handleRecenter} />

          {/* Stadia Alidade Smooth Dark */}
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenStreetMap'
            maxZoom={20}
          />

          {/* LAYER 1: ANPR Gantries */}
          {(activeFilter === 'all' || activeFilter === 'gantries') &&
            gantries.map(g => (
              <Marker
                key={`g-${g.id}`}
                position={[g.lat, g.lng]}
                icon={createGantryIcon(g.sighting_count)}
                eventHandlers={{ click: () => setSelectedGantry(g) }}
              >
                <Popup>
                  <div style={{
                    background: 'rgba(8, 14, 26, 0.96)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: 12,
                    padding: 14, minWidth: 240, color: '#e2e8f0',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(6, 182, 212, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Camera size={14} color="#06b6d4" />
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em' }}>
                        {g.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: '#94a3b8', marginBottom: 10 }}>
                      <MapPin size={11} color="#38bdf8" />
                      <span>{g.city} · TYPE: {g.type}</span>
                    </div>
                    <div style={{
                      background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.06em' }}>TOTAL SIGHTINGS</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>{g.sighting_count}</span>
                    </div>
                    {g.recent_vehicles?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6, letterSpacing: '0.08em' }}>
                          RECENT VEHICLES DETECTED:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {g.recent_vehicles.map((v, i) => (
                            <span
                              key={i}
                              onClick={() => { setSearchPlate(v); fetchTrajectory(v); }}
                              style={{
                                padding: '3px 8px', borderRadius: 5,
                                background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)',
                                color: '#67e8f9', fontSize: 9, cursor: 'pointer', fontWeight: 700,
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.22)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* LAYER 2: Cellular BTS Towers (CDR Activity) */}
          {(activeFilter === 'all' || activeFilter === 'cdr') &&
            cellTowers.map(t => (
              <Marker
                key={`tower-${t.id}`}
                position={[t.lat, t.lng]}
                icon={createCellTowerIcon(t.active_pings)}
              >
                <Popup>
                  <div style={{
                    background: 'rgba(20, 16, 8, 0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(251, 191, 36, 0.45)', borderRadius: 12,
                    padding: 14, minWidth: 240, color: '#e2e8f0',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(251, 191, 36, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Radio size={14} color="#fbbf24" />
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em' }}>
                        {t.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: '#d97706', marginBottom: 10 }}>
                      <MapPin size={11} color="#fbbf24" />
                      <span>{t.city} · {t.operator}</span>
                    </div>
                    <div style={{
                      background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 9, color: '#fef3c7', letterSpacing: '0.06em' }}>ACTIVE CDR CALLS</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24' }}>{t.active_pings}</span>
                    </div>
                    <div style={{ fontSize: 8.5, color: '#b45309', letterSpacing: '0.05em' }}>
                      ANTENNA AZIMUTH SECTOR: {t.azimuth}°
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* LAYER 3: Financial Touchpoints & ATM Terminals */}
          {(activeFilter === 'all' || activeFilter === 'financial') &&
            financialLocations.map(f => (
              <Marker
                key={`fin-${f.id}`}
                position={[f.lat, f.lng]}
                icon={createFinancialIcon()}
              >
                <Popup>
                  <div style={{
                    background: 'rgba(6, 22, 16, 0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(52, 211, 153, 0.45)', borderRadius: 12,
                    padding: 14, minWidth: 240, color: '#e2e8f0',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(52, 211, 153, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CreditCard size={14} color="#34d399" />
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#34d399', letterSpacing: '0.08em' }}>
                        {f.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: '#059669', marginBottom: 10 }}>
                      <Building size={11} color="#34d399" />
                      <span>{f.city} · {f.bank}</span>
                    </div>
                    <div style={{
                      background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)',
                      borderRadius: 8, padding: '8px 10px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 9, color: '#a7f3d0', letterSpacing: '0.06em' }}>24H DISBURSEMENTS</span>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399' }}>{f.total_withdrawals_24h}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* LAYER 4: Tandem Convoy Alerts */}
          {(activeFilter === 'all' || activeFilter === 'convoys') &&
            convoys.map(c => (
              <Marker key={`convoy-${c.cluster_id}`} position={[c.lat, c.lng]} icon={createConvoyIcon()}>
                <Popup>
                  <div style={{
                    background: 'rgba(18, 5, 5, 0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(248, 113, 113, 0.45)', borderRadius: 12,
                    padding: 14, minWidth: 250,
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 24px rgba(239, 68, 68, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <ShieldAlert size={14} color="#f87171" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#f87171', letterSpacing: '0.1em' }}>
                        TANDEM CONVOY ALERT
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontSize: 8.5, padding: '2px 6px',
                        background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 4, color: '#fca5a5', fontWeight: 800
                      }}>
                        {c.co_sightings}× HITS
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: '#fca5a5', marginBottom: 10 }}>
                      <MapPin size={11} color="#f87171" />
                      <span>{c.location}</span>
                    </div>
                    <div style={{
                      background: 'rgba(127, 29, 29, 0.35)', border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10
                    }}>
                      {[['TARGET A', c.vehicle1, c.owner1], ['TARGET B', c.vehicle2, c.owner2]].map(([label, plate, owner]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.06em' }}>{label}:</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10.5, color: '#fca5a5', fontWeight: 800 }}>{plate}</div>
                            {owner && <div style={{ fontSize: 8.5, color: '#cbd5e1' }}>{owner}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {onOpenDossier && (
                      <button
                        onClick={() => onOpenDossier(c.owner1)}
                        style={{
                          width: '100%', padding: '7px 0',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(127, 29, 29, 0.4))',
                          border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 7,
                          color: '#fca5a5', fontSize: 9.5, fontWeight: 800, cursor: 'pointer',
                          fontFamily: 'inherit', letterSpacing: '0.08em',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>OPEN INTELLIGENCE DOSSIER</span>
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Unified Multi-Source Polyline (Connecting ANPR + CDR + ATM points) */}
          {polylineCoords.length > 1 && (
            <>
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#38bdf8', weight: 6, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
              />
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#38bdf8', weight: 2.5, dashArray: '8,6', opacity: 0.95, lineCap: 'round' }}
              />
            </>
          )}

          {/* Multi-Source Chronological Trajectory Checkpoints */}
          {visibleTrajectory.map((pt, idx) => (
            <Marker
              key={`tp-${idx}`}
              position={[pt.lat, pt.lng]}
              icon={createMultiSourceIcon(pt.sequence, pt.source_type, idx === playbackIndex)}
            >
              <Popup>
                <div style={{
                  background: 'rgba(8, 14, 26, 0.96)', backdropFilter: 'blur(20px)',
                  border: `1px solid ${pt.source_type === 'CDR' ? '#fbbf24' : pt.source_type === 'FINANCIAL' ? '#34d399' : '#38bdf8'}`,
                  borderRadius: 10, padding: 12, minWidth: 230, color: '#e2e8f0',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.9)'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 6
                  }}>
                    <span style={{
                      color: pt.source_type === 'CDR' ? '#fbbf24' : pt.source_type === 'FINANCIAL' ? '#34d399' : '#38bdf8',
                      fontWeight: 800, fontSize: 10.5
                    }}>
                      STOP #{pt.sequence}: {pt.source_type}
                    </span>
                    <span style={{
                      fontSize: 8.5, fontWeight: 800, padding: '2px 6px',
                      background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: '#f8fafc'
                    }}>
                      {pt.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                    {pt.title}
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} color="#38bdf8" />
                      <span>{pt.timestamp}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#cbd5e1', lineHeight: 1.4 }}>
                      {pt.details}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── BOTTOM MULTI-SOURCE TRAJECTORY PLAYER ── */}
      {activeVehicle && trajectory.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92%, 820px)',
          zIndex: 1000,
          background: 'rgba(8, 14, 26, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 16,
          padding: '12px 18px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Activity size={14} color="#38bdf8" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.06em' }}>
                    {activeVehicle.registration_number}
                  </span>
                  <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8', fontWeight: 800
                  }}>
                    {sourceCounts.anpr} ANPR · {sourceCounts.cdr} CDR · {sourceCounts.financial} ATM
                  </span>
                </div>
                <div style={{ fontSize: 9.5, color: '#64748b' }}>
                  {currentPt ? `${currentPt.badge} @ ${currentPt.location}` : 'Cross-Correlation In Progress'}
                </div>
              </div>
            </div>

            {/* Close Route Trace */}
            <button
              onClick={() => { setActiveVehicle(null); setTrajectory([]); }}
              style={{
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 6, padding: '4px 8px', color: '#fca5a5',
                fontSize: 9, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <X size={11} />
              <span>CLOSE</span>
            </button>
          </div>

          {/* Multi-Source Timeline Dots Bar */}
          <div style={{ position: 'relative', marginBottom: 12, padding: '0 6px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', zIndex: 2
            }}>
              {trajectory.map((pt, i) => {
                const isPassed = i <= playbackIndex;
                const isCur = i === playbackIndex;
                const dotColor = pt.source_type === 'CDR' ? '#fbbf24' : pt.source_type === 'FINANCIAL' ? '#34d399' : '#38bdf8';
                return (
                  <button
                    key={i}
                    onClick={() => { setPlaybackIndex(i); setIsPlaying(false); }}
                    title={`${pt.badge}: ${pt.title} (${pt.timestamp})`}
                    style={{
                      width: isCur ? 24 : 16,
                      height: isCur ? 24 : 16,
                      borderRadius: '50%',
                      background: isCur ? dotColor : isPassed ? `${dotColor}99` : '#1e293b',
                      border: isCur ? '2px solid #ffffff' : isPassed ? `1.5px solid ${dotColor}` : '1.5px solid #334155',
                      color: isCur ? '#020617' : '#ffffff',
                      fontSize: isCur ? 10 : 8,
                      fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isCur ? `0 0 12px ${dotColor}` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {pt.sequence}
                  </button>
                );
              })}
            </div>
            {/* Connecting Track Line */}
            <div style={{
              position: 'absolute', top: '50%', left: 12, right: 12, height: 2,
              background: 'rgba(51, 65, 85, 0.6)', transform: 'translateY(-50%)', zIndex: 1
            }}>
              <div style={{
                height: '100%',
                width: trajectory.length > 1 ? `${(playbackIndex / (trajectory.length - 1)) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #38bdf8, #34d399)',
                transition: 'width 0.2s ease'
              }} />
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => { setPlaybackIndex(0); setIsPlaying(false); }}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 6, width: 28, height: 28, color: '#38bdf8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
                title="Restart"
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={() => { setPlaybackIndex(p => Math.max(0, p - 1)); setIsPlaying(false); }}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 6, width: 28, height: 28, color: '#38bdf8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
                title="Previous Stop"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => {
                  if (!isPlaying) {
                    if (playbackIndex >= trajectory.length - 1) {
                      setPlaybackIndex(0);
                    }
                    setIsPlaying(true);
                  } else {
                    setIsPlaying(false);
                  }
                }}
                style={{
                  background: isPlaying
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: isPlaying ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: 7, padding: '5px 14px', color: '#ffffff',
                  fontSize: 10, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? 'PAUSE' : 'ANIMATE'}</span>
              </button>
              <button
                onClick={() => { setPlaybackIndex(p => Math.min(trajectory.length - 1, p + 1)); setIsPlaying(false); }}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 6, width: 28, height: 28, color: '#38bdf8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
                title="Next Stop"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Current Step Status */}
            {currentPt && (
              <div style={{
                fontSize: 9.5, color: '#94a3b8',
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(15, 23, 42, 0.8)', padding: '4px 10px', borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.15)'
              }}>
                <Clock size={11} color="#38bdf8" />
                <span>{currentPt.timestamp}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
