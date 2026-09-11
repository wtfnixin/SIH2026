import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
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
  Search,
  ExternalLink,
  MapPin,
  Clock,
  Compass,
  Layers,
  Crosshair,
  Radio,
  FileText,
  X,
  ChevronRight,
  Route,
  Activity,
  AlertTriangle,
  ArrowRight,
  Target,
  CheckCircle2
} from 'lucide-react';

/* ──────────────────────────────────────────
   CUSTOM LEAFLET ICONS
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
        transition:transform 0.15s ease;
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

const createVehicleIcon = (seq, isLatest, isSelected) => {
  const s = isLatest ? 30 : 22;
  const bg = isLatest
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : isSelected
    ? 'linear-gradient(135deg, #0284c7, #0369a1)'
    : 'rgba(15, 23, 42, 0.92)';
  const border = isLatest
    ? '2px solid #6ee7b7'
    : isSelected
    ? '2px solid #38bdf8'
    : '1.5px solid rgba(56, 189, 248, 0.5)';
  const shadow = isLatest
    ? '0 0 14px rgba(16, 185, 129, 0.7)'
    : isSelected
    ? '0 0 10px rgba(56, 189, 248, 0.5)'
    : '0 2px 6px rgba(0, 0, 0, 0.6)';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:${s}px; height:${s}px;">
        ${isLatest ? '<div class="trail-radar-pulse"></div>' : ''}
        <div style="
          width:${s}px;height:${s}px;
          background:${bg};
          border:${border};
          border-radius:50%;
          box-shadow:${shadow};
          display:flex;align-items:center;justify-content:center;
          color:#ffffff;font-weight:800;font-size:${isLatest ? 11 : 9.5}px;font-family:monospace;
          position:relative;z-index:2;cursor:pointer;
        ">${seq}</div>
      </div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2]
  });
};

function MapController({ flyTarget, fitCoords, onZoomChange }) {
  const map = useMap();
  const lastFlyRef = useRef(null);
  const lastFitRef = useRef(null);

  useMapEvents({
    zoomend: (e) => onZoomChange && onZoomChange(e.target.getZoom())
  });

  // Only fly when flyTarget explicitly changes
  useEffect(() => {
    if (!flyTarget) return;
    const key = `${flyTarget.lat},${flyTarget.lng},${flyTarget.zoom || ''}`;
    if (lastFlyRef.current !== key) {
      lastFlyRef.current = key;
      map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom || map.getZoom(), {
        duration: 1.2,
        easeLinearity: 0.3
      });
    }
  }, [flyTarget, map]);

  // Only fit bounds once when a new trajectory with >=2 points is loaded
  useEffect(() => {
    if (!fitCoords || fitCoords.length < 2) return;
    const key = fitCoords.map(c => `${c[0].toFixed(3)},${c[1].toFixed(3)}`).join('|');
    if (lastFitRef.current !== key) {
      lastFitRef.current = key;
      const bounds = L.latLngBounds(fitCoords);
      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 16,
        animate: true,
        duration: 1.2
      });
    }
  }, [fitCoords, map]);

  return null;
}

/* Tactical Map Navigation Controls */
function TacticalMapControls({ activeTargetCoords }) {
  const map = useMap();

  const btnStyle = {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#38bdf8',
    transition: 'all 0.18s ease',
    outline: 'none',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 140,
      right: 16,
      zIndex: 800,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'rgba(8, 14, 26, 0.9)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: 12,
      padding: 6,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(56, 189, 248, 0.15)'
    }}>
      <button
        onClick={() => map.zoomIn()}
        title="Zoom In"
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'; }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span>
      </button>
      <button
        onClick={() => map.zoomOut()}
        title="Zoom Out"
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'; }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>−</span>
      </button>
      <div style={{ height: 1, background: 'rgba(56, 189, 248, 0.2)', margin: '2px 0' }} />
      <button
        onClick={() => map.flyTo([12.9716, 77.5946], 12, { duration: 1.2 })}
        title="Center Bengaluru"
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'; }}
      >
        <Compass size={15} color="#38bdf8" />
      </button>
      {activeTargetCoords && (
        <button
          onClick={() => map.flyTo(activeTargetCoords, 15, { duration: 1.2 })}
          title="Center on Target"
          style={{ ...btnStyle, borderColor: 'rgba(16, 185, 129, 0.45)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.8)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.45)'; }}
        >
          <Crosshair size={15} color="#10b981" />
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────── */
export default function GeospatialMapCanvas({ onSelectEntity, onOpenDossier, initialVehiclePlate = null }) {
  const [gantries, setGantries] = useState([]);
  const [convoys, setConvoys] = useState([]);
  const [suspectVehicles, setSuspectVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchPlate, setSearchPlate] = useState(initialVehiclePlate || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [trajectory, setTrajectory] = useState([]);
  const [selectedStopIdx, setSelectedStopIdx] = useState(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  const [flyTarget, setFlyTarget] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedGantry, setSelectedGantry] = useState(null);

  const searchBoxRef = useRef(null);

  // CSS injection for trail animations and leaflet overrides
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
      @keyframes radarWave {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
        100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
      }
      @keyframes dashFlow {
        from { stroke-dashoffset: 60; }
        to { stroke-dashoffset: 0; }
      }
      .trail-radar-pulse {
        position: absolute;
        top: 50%; left: 50%;
        width: 32px; height: 32px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.25);
        border: 1.5px solid #34d399;
        animation: radarWave 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        pointer-events: none;
        z-index: 1;
      }
      .trail-flow-anim {
        stroke-dasharray: 10, 14;
        animation: dashFlow 1.8s linear infinite !important;
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
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial geospatial data & suspect vehicle catalog
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/v1/geo/anpr-sightings').then(r => r.json()),
      fetch('http://localhost:8000/api/v1/geo/convoys').then(r => r.json()),
      fetch('http://localhost:8000/api/v1/geo/vehicles').then(r => r.json())
    ])
      .then(([g, c, v]) => {
        setGantries(g.gantries || []);
        setConvoys(c.convoys || []);
        setSuspectVehicles(v.vehicles || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch trajectory for selected plate
  const fetchTrajectory = useCallback((plate) => {
    if (!plate?.trim()) return;
    setLoadingTrajectory(true);
    setIsDropdownOpen(false);
    setSelectedStopIdx(null);
    fetch(`http://localhost:8000/api/v1/geo/vehicle-trajectory/${encodeURIComponent(plate.trim())}`)
      .then(r => r.json())
      .then(data => {
        setActiveVehicle(data.vehicle);
        const pts = data.trajectory || [];
        setTrajectory(pts);
        setLoadingTrajectory(false);
        if (pts.length > 0) {
          setSelectedStopIdx(pts.length - 1);
          setFlyTarget({ lat: pts[0].lat, lng: pts[0].lng, zoom: 13 });
        }
      })
      .catch(() => setLoadingTrajectory(false));
  }, []);

  useEffect(() => {
    if (initialVehiclePlate) fetchTrajectory(initialVehiclePlate);
  }, [initialVehiclePlate, fetchTrajectory]);

  // Curated list of 5 pre-defined tracked targets
  const PREDEFINED_TARGETS = [
    { plate: 'KA05RE5719', owner: 'Varun Pandey', threat: 'CRITICAL', hits: 16, loc: 'MG Road' },
    { plate: 'KA07UE2225', owner: 'Priya Joshi', threat: 'CRITICAL', hits: 16, loc: 'Whitefield' },
    { plate: 'KA08NB4073', owner: 'Vikram Joshi', threat: 'HIGH RISK', hits: 12, loc: 'HSR Layout' },
    { plate: 'KA02HD7818', owner: 'Ravi Pandey', threat: 'SUSPECT', hits: 9, loc: 'Koramangala' },
    { plate: 'KA04FR2229', owner: 'Deepak Kumar', threat: 'SUSPECT', hits: 9, loc: 'Hebbal' },
  ];

  // Filtered suspect vehicles for dropdown search (prioritizing predefined tracked targets)
  const filteredVehicles = suspectVehicles.length > 0
    ? suspectVehicles.filter(v => {
        const q = (searchPlate || '').toLowerCase().trim();
        if (!q) return true;
        return (
          (v.plate || '').toLowerCase().includes(q) ||
          (v.owner || '').toLowerCase().includes(q) ||
          (v.locations || []).some(l => l.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : PREDEFINED_TARGETS.map(pt => ({
        plate: pt.plate,
        owner: pt.owner,
        threat_level: pt.threat,
        sighting_count: pt.hits,
        locations: [pt.loc]
      }));

  const polylineCoords = trajectory.map(pt => [pt.lat, pt.lng]);
  const latestPt = trajectory[trajectory.length - 1];

  const filters = [
    { id: 'all', label: 'ALL', icon: Layers, color: '#38bdf8' },
    { id: 'gantries', label: 'GANTRIES', icon: Camera, color: '#06b6d4' },
    { id: 'convoys', label: 'CONVOYS', icon: ShieldAlert, color: '#f87171' },
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 'calc(100vh - 60px)',
      background: '#020617',
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* ── SCANLINE EFFECT ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 900,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(6,182,212,0.012) 3px, rgba(6,182,212,0.012) 4px)',
      }} />

      {/* ── CORNER RETICLES ── */}
      {[
        { top: 12, left: 12, borderTop: '2px solid', borderLeft: '2px solid' },
        { top: 12, right: 12, borderTop: '2px solid', borderRight: '2px solid' },
        { bottom: 12, left: 12, borderBottom: '2px solid', borderLeft: '2px solid' },
        { bottom: 12, right: 12, borderBottom: '2px solid', borderRight: '2px solid' },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', ...s,
          width: 24, height: 24,
          borderColor: 'rgba(56,189,248,0.4)',
          pointerEvents: 'none', zIndex: 910
        }} />
      ))}

      {/* ── TOP HUD BAR ── */}
      <div style={{
        position: 'absolute', top: 14, left: 16, right: 16,
        zIndex: 2500,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        background: 'rgba(8, 14, 26, 0.94)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 14,
        padding: '8px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(56, 189, 248, 0.15)',
      }}>

        {/* Title Block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
          <div style={{
            width: 38, height: 38,
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.25)',
            flexShrink: 0
          }}>
            <Radio size={18} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.12em', lineHeight: 1 }}>
                ANPR SPATIAL SURVEILLANCE
              </span>
              <span style={{
                fontSize: 8.5, padding: '1px 6px', borderRadius: 4,
                background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8', fontWeight: 700, letterSpacing: '0.08em'
              }}>
                MESH v2.4
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                fontSize: 9, color: '#10b981', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                  display: 'inline-block', animation: 'livePulse 1.8s infinite'
                }} />
                LIVE MESH
              </span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Car size={10} color="#38bdf8" />
                <span>INDEXED:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{suspectVehicles.length || '100+'}</span>
              </span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Camera size={10} color="#06b6d4" />
                <span>GANTRIES:</span>
                <span style={{ color: '#06b6d4', fontWeight: 700 }}>{loading ? '—' : gantries.length}</span>
              </span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldAlert size={10} color="#f87171" />
                <span>CONVOYS:</span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{loading ? '—' : convoys.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search & Suspect Database Autocomplete */}
        <div ref={searchBoxRef} style={{ position: 'relative', flex: '0 1 480px', minWidth: 320 }}>
          <div style={{ position: 'relative' }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                fetchTrajectory(searchPlate);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(15, 23, 42, 0.95)',
                border: isDropdownOpen
                  ? '1px solid rgba(56, 189, 248, 0.7)'
                  : '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: isDropdownOpen ? '10px 10px 0 0' : 10,
                padding: '6px 10px 6px 12px',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <Search size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={searchPlate}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={e => {
                  setSearchPlate(e.target.value.toUpperCase());
                  setIsDropdownOpen(true);
                }}
                placeholder="SEARCH VEHICLE PLATE / SUSPECT..."
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#f8fafc', fontSize: 11, fontFamily: 'inherit',
                  letterSpacing: '0.08em', flex: 1, fontWeight: 600,
                  minWidth: 160
                }}
              />
              {searchPlate && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchPlate('');
                    setIsDropdownOpen(true);
                  }}
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
                  fontSize: 10, fontWeight: 800, padding: '5px 12px',
                  cursor: loadingTrajectory ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 5,
                  boxShadow: loadingTrajectory ? 'none' : '0 0 12px rgba(2, 132, 199, 0.35)',
                  transition: 'all 0.2s', flexShrink: 0
                }}
              >
                <Crosshair size={12} />
                <span>{loadingTrajectory ? 'TRACING...' : 'TRACE'}</span>
              </button>
            </form>

            {/* Autocomplete Dropdown List - Safely Positioned Directly Below Input */}
            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(8, 14, 26, 0.98)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '6px 0',
                maxHeight: 260,
                overflowY: 'auto',
                zIndex: 3500,
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.98), 0 0 24px rgba(56, 189, 248, 0.2)'
              }}>
                <div style={{
                  padding: '5px 12px 6px',
                  fontSize: 8.5,
                  color: '#64748b',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>SUSPECT VEHICLES IN DATABASE</span>
                  <span>{filteredVehicles.length} MATCHES</span>
                </div>

                {filteredVehicles.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
                    No vehicle or suspect matches "{searchPlate}"
                  </div>
                ) : (
                  filteredVehicles.map(v => (
                    <div
                      key={v.plate}
                      onClick={() => {
                        setSearchPlate(v.plate);
                        fetchTrajectory(v.plate);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Car size={13} color="#38bdf8" />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.06em' }}>
                              {v.plate}
                            </span>
                            <span style={{
                              fontSize: 7.5, padding: '1px 5px', borderRadius: 3,
                              background: v.threat_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.18)',
                              color: v.threat_level === 'CRITICAL' ? '#fca5a5' : '#38bdf8',
                              fontWeight: 800, letterSpacing: '0.06em'
                            }}>
                              {v.threat_level}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                            {v.owner} {v.locations?.[0] ? `· ${v.locations[0]}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: 9,
                          color: '#10b981',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.12)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}>
                          {v.sighting_count} hits
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {/* Quick Pre-Defined Tracked Vehicle Chips */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            overflowX: 'auto',
            paddingBottom: 2
          }}>
            <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              TARGETS:
            </span>
            {PREDEFINED_TARGETS.map(t => {
              const isSelected = activeVehicle?.registration_number === t.plate;
              return (
                <button
                  key={t.plate}
                  type="button"
                  onClick={() => {
                    setSearchPlate(t.plate);
                    fetchTrajectory(t.plate);
                  }}
                  style={{
                    background: isSelected
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(15, 23, 42, 0.8)',
                    border: isSelected
                      ? '1px solid #34d399'
                      : '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 5,
                    padding: '2px 7px',
                    color: isSelected ? '#34d399' : '#e2e8f0',
                    fontSize: 8.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)';
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)';
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                    }
                  }}
                  title={`Track ${t.plate} (${t.owner})`}
                >
                  <span style={{ color: t.threat === 'CRITICAL' ? '#f87171' : '#38bdf8', marginRight: 4 }}>●</span>
                  {t.plate}
                </button>
              );
            })}
            {activeVehicle && (
              <button
                type="button"
                onClick={() => {
                  setActiveVehicle(null);
                  setTrajectory([]);
                  setSearchPlate('');
                  setSelectedStopIdx(null);
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 5,
                  padding: '2px 6px',
                  color: '#fca5a5',
                  fontSize: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap'
                }}
                title="Clear current track"
              >
                CLEAR TRACK
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Filter Pills & Telemetry Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                    fontSize: 9.5, fontWeight: 800, padding: '5px 11px',
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

          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.22)',
            borderRadius: 8, padding: '5px 10px',
            fontSize: 9, color: '#38bdf8', fontWeight: 700, letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap'
          }}>
            <Compass size={12} color="#38bdf8" />
            <span>Z:{currentZoom} · 12.97°N 77.59°E</span>
          </div>
        </div>
      </div>

      {/* ── LEAFLET MAP (COMPLETELY OPEN ZOOM & SCROLL ANYWHERE) ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={12}
          minZoom={3}
          maxZoom={19}
          zoomControl={false}
          scrollWheelZoom={true}
          dragging={true}
          doubleClickZoom={true}
          touchZoom={true}
          style={{ width: '100%', height: '100%', background: '#020617' }}
        >
          <MapController
            flyTarget={flyTarget}
            fitCoords={polylineCoords}
            onZoomChange={setCurrentZoom}
          />
          <TacticalMapControls
            activeTargetCoords={latestPt ? [latestPt.lat, latestPt.lng] : null}
          />

          {/* Stadia Alidade Smooth Dark */}
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenStreetMap'
            minZoom={3}
            maxZoom={19}
          />

          {/* ANPR Gantries */}
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
                          RECENT SUSPECT VEHICLES:
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

          {/* Convoy Alerts */}
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

          {/* Improved Multi-Layer Glowing Trail with Flowing Animation */}
          {polylineCoords.length > 1 && (
            <>
              {/* Outer Glow Path */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#10b981',
                  weight: 10,
                  opacity: 0.25,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Core Solid Path */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#059669',
                  weight: 4,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Flowing Dashed Foreground Line */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#6ee7b7',
                  weight: 3,
                  className: 'trail-flow-anim',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </>
          )}

          {/* Sequential Checkpoint Markers */}
          {trajectory.map((pt, idx) => {
            const isLatest = idx === trajectory.length - 1;
            const isSelected = selectedStopIdx === idx;
            return (
              <Marker
                key={`tp-${idx}`}
                position={[pt.lat, pt.lng]}
                icon={createVehicleIcon(pt.sequence, isLatest, isSelected)}
                eventHandlers={{
                  click: () => setSelectedStopIdx(idx)
                }}
              >
                <Popup>
                  <div style={{
                    background: 'rgba(8, 14, 26, 0.96)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(16, 185, 129, 0.45)', borderRadius: 10,
                    padding: 12, minWidth: 220, color: '#e2e8f0',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.9)'
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: isLatest ? '#34d399' : '#38bdf8', fontWeight: 800, fontSize: 10.5, marginBottom: 8
                    }}>
                      <MapPin size={12} color={isLatest ? '#34d399' : '#38bdf8'} />
                      <span>CHECKPOINT #{pt.sequence}: {pt.location}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={11} color="#10b981" />
                        <span>TIME: {pt.timestamp}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={11} color="#38bdf8" />
                        <span>CAMERA ID: {pt.camera_id}</span>
                      </div>
                      {isLatest && (
                        <div style={{
                          marginTop: 6,
                          padding: '3px 6px',
                          borderRadius: 4,
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#6ee7b7',
                          fontSize: 8.5,
                          fontWeight: 700,
                          textAlign: 'center'
                        }}>
                          MOST RECENT CONFIRMED SIGHTING
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── TACTICAL VEHICLE INFORMATION CARD (WHEN TRACKING ACTIVE) ── */}
      {activeVehicle && trajectory.length > 0 ? (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(94%, 900px)',
          zIndex: 1000,
          background: 'rgba(8, 14, 26, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 16,
          padding: '14px 20px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 24px rgba(16, 185, 129, 0.12)',
        }}>
          {/* Header row: Target Registration, Owner & Dossier action */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            paddingBottom: 10,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {/* Target Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)'
              }}>
                <Car size={20} color="#34d399" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.08em' }}>
                    {activeVehicle.registration_number}
                  </span>
                  <span style={{
                    fontSize: 8.5, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7', fontWeight: 800, letterSpacing: '0.08em'
                  }}>
                    {activeVehicle.threat_level || 'SUSPECT'}
                  </span>
                  <span style={{
                    fontSize: 8.5, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#7dd3fc', fontWeight: 700
                  }}>
                    {activeVehicle.model || 'SEDAN / SUV'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 600 }}>
                    SUSPECT OWNER: <span style={{ color: '#38bdf8' }}>{activeVehicle.registered_owner}</span>
                  </span>
                  {activeVehicle.all_owners?.length > 1 && (
                    <span style={{ fontSize: 9, color: '#64748b' }}>
                      (+{activeVehicle.all_owners.length - 1} linked suspects)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics & Dossier CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                textAlign: 'right',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                paddingRight: 14
              }}>
                <div style={{ fontSize: 8.5, color: '#64748b', letterSpacing: '0.06em' }}>TOTAL TRAIL STOPS</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>
                  {trajectory.length} Checkpoints
                </div>
              </div>
              <div style={{
                textAlign: 'right',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                paddingRight: 14
              }}>
                <div style={{ fontSize: 8.5, color: '#64748b', letterSpacing: '0.06em' }}>LAST DETECTED</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
                  {latestPt?.timestamp ? latestPt.timestamp.replace('T', ' ').replace('Z', '') : 'Active'}
                </div>
              </div>

              {onOpenDossier && (
                <button
                  onClick={() => onOpenDossier(activeVehicle.registered_owner)}
                  style={{
                    height: 34, padding: '0 14px', borderRadius: 8,
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(2, 132, 199, 0.35))',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    color: '#38bdf8', fontSize: 10, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)',
                    transition: 'all 0.18s', flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(2, 132, 199, 0.35))'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)'; }}
                >
                  <FileText size={13} />
                  <span>VIEW DOSSIER</span>
                </button>
              )}
            </div>
          </div>

          {/* Movement Trail Sequence Checkpoints */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <span style={{ fontSize: 8.5, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Route size={12} color="#10b981" />
                SURVEILLANCE TRAIL CHRONOLOGY (CLICK CHECKPOINT TO INSPECT):
              </span>
              <span style={{ fontSize: 8.5, color: '#34d399', fontWeight: 700 }}>
                {latestPt ? `LATEST HIT: ${latestPt.location}` : ''}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4
            }}>
              {trajectory.map((pt, i) => {
                const isSelected = selectedStopIdx === i;
                const isLast = i === trajectory.length - 1;
                return (
                  <React.Fragment key={i}>
                    <div
                      onClick={() => {
                        setSelectedStopIdx(i);
                        setFlyTarget({ lat: pt.lat, lng: pt.lng, zoom: 15 });
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: isSelected
                          ? 'rgba(16, 185, 129, 0.22)'
                          : 'rgba(15, 23, 42, 0.75)',
                        border: isSelected
                          ? '1.5px solid #34d399'
                          : isLast
                          ? '1px solid rgba(16, 185, 129, 0.4)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 150,
                        flexShrink: 0,
                        boxShadow: isSelected ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: isLast ? '#10b981' : isSelected ? '#0284c7' : '#1e293b',
                        color: '#ffffff', fontSize: 9.5, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {pt.sequence}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: isSelected ? '#34d399' : '#f8fafc',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}>
                          {pt.location.split(',')[0]}
                        </div>
                        <div style={{ fontSize: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {pt.timestamp ? pt.timestamp.split('T')[1]?.substring(0, 5) || pt.timestamp : ''} · {pt.camera_id}
                        </div>
                      </div>
                    </div>

                    {i < trajectory.length - 1 && (
                      <ArrowRight size={12} color="#475569" style={{ flexShrink: 0 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Standby Dock: No vehicle currently tracked */
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(8, 14, 26, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 14,
          padding: '10px 22px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#64748b'
          }} />
          <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em' }}>
            NO VEHICLE BEING TRACKED · SELECT A TARGET OR SEARCH A NUMBER PLATE ABOVE TO TRACE ROUTE
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 6 }}>
            {PREDEFINED_TARGETS.slice(0, 3).map(t => (
              <button
                key={t.plate}
                type="button"
                onClick={() => {
                  setSearchPlate(t.plate);
                  fetchTrajectory(t.plate);
                }}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  color: '#38bdf8',
                  fontSize: 9,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
              >
                Track {t.plate}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── LOADING OVERLAY ── */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '2px solid rgba(56, 189, 248, 0.2)',
            borderTop: '2px solid #38bdf8',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, letterSpacing: '0.15em' }}>
            INITIALIZING SPATIAL SURVEILLANCE...
          </div>
          <div style={{ fontSize: 9.5, color: '#64748b' }}>Connecting to ANPR mesh network</div>
        </div>
      )}
    </div>
  );
}
