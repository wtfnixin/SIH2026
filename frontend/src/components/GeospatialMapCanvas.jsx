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
  FileText,
  X
} from 'lucide-react';

/* ──────────────────────────────────────────
   CUSTOM LEAFLET ICONS (CLEAN, NO GLOW, NO EMOJIS)
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

const createVehicleIcon = (seq, isCurrent) => {
  const s = isCurrent ? 26 : 20;
  const color = isCurrent ? '#059669' : '#0369a1';
  const border = isCurrent ? '2px solid #34d399' : '1.5px solid #38bdf8';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${s}px;height:${s}px;
        background:${color};
        border:${border};
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0, 0, 0, 0.6);
        display:flex;align-items:center;justify-content:center;
        color:#ffffff;font-weight:800;font-size:${isCurrent ? 11 : 9}px;font-family:monospace;
      ">${seq}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2]
  });
};

/* ──────────────────────────────────────────
   MAP SUB-COMPONENTS
────────────────────────────────────────── */
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 12, { duration: 1.4, easeLinearity: 0.3 });
  }, [center, zoom, map]);
  return null;
}

function ZoomWatcher({ onZoomChange }) {
  useMapEvents({ zoomend: (e) => onZoomChange(e.target.getZoom()) });
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
      top: 80,
      right: 16,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'rgba(8, 14, 26, 0.85)',
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
        <Plus size={15} color="#38bdf8" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        title="Zoom Out"
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'; }}
      >
        <Minus size={15} color="#38bdf8" />
      </button>
      <div style={{ height: 1, background: 'rgba(56, 189, 248, 0.2)', margin: '2px 0' }} />
      <button
        onClick={() => map.flyTo([28.6139, 77.209], 11, { duration: 1.2 })}
        title="Reset Delhi Grid"
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'; }}
      >
        <Compass size={15} color="#38bdf8" />
      </button>
      {activeTargetCoords && (
        <button
          onClick={() => map.flyTo(activeTargetCoords, 14, { duration: 1.2 })}
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
export default function GeospatialMapCanvas({ onSelectEntity, onOpenDossier, initialVehiclePlate = 'MH-12-PQ-9981' }) {
  const [gantries, setGantries] = useState([]);
  const [convoys, setConvoys] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchPlate, setSearchPlate] = useState(initialVehiclePlate || '');
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [trajectory, setTrajectory] = useState([]);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const playbackRef = useRef(null);

  const [mapCenter, setMapCenter] = useState([28.6139, 77.209]);
  const [mapZoom, setMapZoom] = useState(11);
  const [currentZoom, setCurrentZoom] = useState(11);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedGantry, setSelectedGantry] = useState(null);
  const [mapKey] = useState('tactical-map-v2');

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

  // Fetch geospatial data
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/v1/geo/anpr-sightings').then(r => r.json()),
      fetch('http://localhost:8000/api/v1/geo/convoys').then(r => r.json())
    ])
      .then(([g, c]) => {
        setGantries(g.gantries || []);
        setConvoys(c.convoys || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchTrajectory = useCallback((plate) => {
    if (!plate?.trim()) return;
    setLoadingTrajectory(true);
    setIsPlaying(false);
    fetch(`http://localhost:8000/api/v1/geo/vehicle-trajectory/${encodeURIComponent(plate.trim())}`)
      .then(r => r.json())
      .then(data => {
        setActiveVehicle(data.vehicle);
        const pts = data.trajectory || [];
        setTrajectory(pts);
        setPlaybackIndex(pts.length ? pts.length - 1 : 0);
        setLoadingTrajectory(false);
        if (pts.length > 0) {
          setMapCenter([pts[0].lat, pts[0].lng]);
          setMapZoom(13);
        }
      })
      .catch(() => setLoadingTrajectory(false));
  }, []);

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
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        background: 'rgba(8, 14, 26, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.22)',
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
                LIVE FEED
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

        {/* Center: Search & Plate Trace */}
        <form
          onSubmit={e => { e.preventDefault(); fetchTrajectory(searchPlate); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 10, padding: '5px 8px 5px 12px',
            flex: '0 1 360px',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            transition: 'all 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.65)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)'}
        >
          <Search size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchPlate}
            onChange={e => setSearchPlate(e.target.value.toUpperCase())}
            placeholder="ENTER VEHICLE REGISTRATION..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#f8fafc', fontSize: 11, fontFamily: 'inherit',
              letterSpacing: '0.08em', flex: 1, fontWeight: 600
            }}
          />
          {searchPlate && (
            <button
              type="button"
              onClick={() => setSearchPlate('')}
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
              transition: 'all 0.2s'
            }}
          >
            <Crosshair size={12} />
            <span>{loadingTrajectory ? 'TRACING...' : 'TRACE'}</span>
          </button>
        </form>

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
            <span>Z:{currentZoom} · 28.61°N 77.21°E</span>
          </div>
        </div>
      </div>

      {/* ── LEAFLET MAP ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          style={{ width: '100%', height: '100%', background: '#020617' }}
        >
          <FlyTo center={mapCenter} zoom={mapZoom} />
          <ZoomWatcher onZoomChange={setCurrentZoom} />
          <TacticalMapControls
            activeTargetCoords={currentPt ? [currentPt.lat, currentPt.lng] : null}
          />

          {/* Stadia Alidade Smooth Dark */}
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenStreetMap'
            maxZoom={20}
          />

          {/* ANPR Gantries (Clean, compact, no blur glow) */}
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

          {/* Convoy Alerts (Clean, compact, no giant pulsating rings) */}
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

          {/* Trajectory Polyline */}
          {polylineCoords.length > 1 && (
            <>
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#10b981', weight: 6, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
              />
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#10b981', weight: 2.5, dashArray: '8,6', opacity: 0.95, lineCap: 'round' }}
              />
            </>
          )}

          {/* Trajectory Points */}
          {visibleTrajectory.map((pt, idx) => (
            <Marker
              key={`tp-${idx}`}
              position={[pt.lat, pt.lng]}
              icon={createVehicleIcon(pt.sequence, idx === playbackIndex)}
            >
              <Popup>
                <div style={{
                  background: 'rgba(8, 14, 26, 0.96)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 10,
                  padding: 12, minWidth: 200, color: '#e2e8f0',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.9)'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: '#10b981', fontWeight: 800, fontSize: 10.5, marginBottom: 8
                  }}>
                    <MapPin size={12} color="#10b981" />
                    <span>STOP #{pt.sequence}: {pt.location}</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} color="#10b981" />
                      <span>{pt.timestamp}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={11} color="#38bdf8" />
                      <span>Camera: {pt.camera_id}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── BOTTOM TRAJECTORY PLAYER (FLOATING TACTICAL DOCK) ── */}
      {activeVehicle && trajectory.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(90%, 750px)',
          zIndex: 1000,
          background: 'rgba(8, 14, 26, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 16,
          padding: '12px 18px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}>
          {/* Top row: Target info & Media controls */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, flexWrap: 'wrap', gap: 10
          }}>
            {/* Target Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Car size={16} color="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399', letterSpacing: '0.08em' }}>
                    {activeVehicle.registration_number}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#cbd5e1' }}>
                    {activeVehicle.registered_owner}
                  </span>
                  <span style={{
                    fontSize: 8.5, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#6ee7b7', fontWeight: 700, letterSpacing: '0.08em'
                  }}>
                    {activeVehicle.model || 'VEHICLE'}
                  </span>
                </div>
                <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 3 }}>
                  STOP {playbackIndex + 1} OF {trajectory.length} · {trajectory.length} CHECKPOINTS RECORDED
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => { setPlaybackIndex(0); setIsPlaying(false); }}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(51, 65, 85, 0.8)',
                  color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)'; }}
                title="Restart Scrubber"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setPlaybackIndex(p => Math.max(0, p - 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(51, 65, 85, 0.8)',
                  color: '#94a3b8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)'; }}
                title="Previous Stop"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setIsPlaying(p => !p)}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 8,
                  background: isPlaying
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(185, 28, 28, 0.9))'
                    : 'linear-gradient(135deg, #059669, #0d9488)',
                  border: 'none', color: '#ffffff', fontSize: 10, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: isPlaying ? '0 0 12px rgba(239, 68, 68, 0.35)' : '0 0 12px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? 'PAUSE' : 'ANIMATE'}</span>
              </button>
              <button
                onClick={() => setPlaybackIndex(p => Math.min(trajectory.length - 1, p + 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(51, 65, 85, 0.8)',
                  color: '#94a3b8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)'; }}
                title="Next Stop"
              >
                <ChevronRight size={16} />
              </button>
              {onOpenDossier && (
                <button
                  onClick={() => onOpenDossier(activeVehicle.registered_owner)}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 8,
                    background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8', fontSize: 9.5, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.18s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)'; }}
                >
                  <FileText size={12} />
                  <span>DOSSIER</span>
                </button>
              )}
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 9.5, color: '#64748b', minWidth: 48, textAlign: 'right', fontWeight: 700 }}>
              #{playbackIndex + 1}/{trajectory.length}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Track BG */}
              <div style={{
                position: 'absolute', top: '50%', left: 0, right: 0, height: 4,
                background: 'rgba(30, 41, 59, 0.8)', borderRadius: 2, transform: 'translateY(-50%)'
              }} />
              {/* Fill */}
              <div style={{
                position: 'absolute', top: '50%', left: 0, height: 4,
                width: `${trajectory.length > 1 ? (playbackIndex / (trajectory.length - 1)) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #059669, #06b6d4)', borderRadius: 2,
                transform: 'translateY(-50%)',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
                transition: 'width 0.25s ease'
              }} />
              {/* Dot markers */}
              {trajectory.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setPlaybackIndex(i)}
                  title={`Stop #${i + 1}`}
                  style={{
                    position: 'absolute', top: '50%',
                    left: `${trajectory.length > 1 ? (i / (trajectory.length - 1)) * 100 : 0}%`,
                    width: i === playbackIndex ? 10 : 5,
                    height: i === playbackIndex ? 10 : 5,
                    background: i <= playbackIndex ? '#10b981' : '#1e293b',
                    border: `1.5px solid ${i <= playbackIndex ? '#10b981' : '#334155'}`,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer', zIndex: 2,
                    boxShadow: i === playbackIndex ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
              {/* Invisible range input for scrubbing */}
              <input
                type="range" min={0} max={trajectory.length - 1} value={playbackIndex}
                onChange={e => setPlaybackIndex(parseInt(e.target.value))}
                style={{
                  position: 'absolute', top: '50%', left: 0, right: 0, width: '100%',
                  transform: 'translateY(-50%)', opacity: 0, cursor: 'pointer', zIndex: 3,
                  margin: 0, height: 20
                }}
              />
            </div>
            <div style={{
              fontSize: 9.5, color: '#34d399', fontWeight: 700, minWidth: 155,
              background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 6, padding: '4px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <Clock size={11} color="#34d399" />
              <span>{currentPt?.timestamp || '—'}</span>
            </div>
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
