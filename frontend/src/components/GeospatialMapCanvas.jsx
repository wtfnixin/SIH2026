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
  Activity,
  Eye,
  Zap,
  Target,
  AlertCircle,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';

/* ──────────────────────────────────────────
   CUSTOM LEAFLET ICONS
────────────────────────────────────────── */
const createGantryIcon = (count) => {
  const size = Math.min(52, Math.max(34, 30 + count * 0.9));
  const intensity = Math.min(1, 0.5 + count * 0.05);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:radial-gradient(circle at 40% 35%, rgba(6,182,212,${intensity}) 0%, rgba(2,52,80,0.95) 70%);
        border:1.5px solid rgba(6,182,212,0.85);
        border-radius:50%;
        box-shadow:0 0 18px rgba(6,182,212,0.55),0 0 6px rgba(6,182,212,0.9) inset;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;position:relative;overflow:hidden;
      ">
        <div style="font-size:12px;line-height:1;">📷</div>
        <div style="font-size:9px;font-weight:800;color:#ecfeff;font-family:monospace;letter-spacing:0.02em;">${count}</div>
        <div style="
          position:absolute;top:-40%;left:-40%;
          width:180%;height:180%;
          background:conic-gradient(transparent 60%, rgba(6,182,212,0.18) 100%);
          animation:spin 5s linear infinite;
          border-radius:50%;
        "></div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createConvoyIcon = () => L.divIcon({
  className: '',
  html: `
    <div style="
      width:46px;height:46px;
      background:radial-gradient(circle at 40% 35%, rgba(239,68,68,0.95) 0%, rgba(90,15,15,0.95) 70%);
      border:2px solid rgba(248,113,113,0.9);
      border-radius:50%;
      box-shadow:0 0 28px rgba(239,68,68,0.75),0 0 8px rgba(248,113,113,0.9) inset;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;cursor:pointer;
      animation:convoyPulse 1.6s ease-in-out infinite;
    ">🚨</div>`,
  iconSize: [46, 46],
  iconAnchor: [23, 23]
});

const createVehicleIcon = (seq, isCurrent) => {
  const s = isCurrent ? 34 : 22;
  const color = isCurrent ? '#10b981' : '#60a5fa';
  const glow = isCurrent ? '0 0 22px rgba(16,185,129,0.85)' : '0 0 8px rgba(96,165,250,0.6)';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${s}px;height:${s}px;
        background:${color};
        border:2px solid #fff;
        border-radius:50%;
        box-shadow:${glow};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-weight:800;font-size:${isCurrent ? 12 : 9}px;font-family:monospace;
        ${isCurrent ? 'animation:currentPing 1.2s ease-in-out infinite;' : ''}
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
  const [mapKey] = useState('tactical-map-v1'); // stable key so map never remounts

  // CSS injection for animations
  useEffect(() => {
    const id = 'geo-map-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes convoyPulse {
        0%,100% { box-shadow: 0 0 28px rgba(239,68,68,0.75), 0 0 8px rgba(248,113,113,0.9) inset; transform: scale(1); }
        50% { box-shadow: 0 0 44px rgba(239,68,68,1), 0 0 12px rgba(248,113,113,1) inset; transform: scale(1.12); }
      }
      @keyframes currentPing {
        0%,100% { box-shadow: 0 0 22px rgba(16,185,129,0.85); transform: scale(1); }
        50% { box-shadow: 0 0 36px rgba(16,185,129,1); transform: scale(1.18); }
      }
      @keyframes hud-scan {
        0% { transform: translateY(-100%); opacity: 0; }
        10% { opacity: 0.6; }
        90% { opacity: 0.6; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
      @keyframes radar-sweep {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
      .leaflet-popup-content-wrapper {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .leaflet-popup-tip-container { display: none !important; }
      .leaflet-control-zoom {
        border: 1px solid rgba(6,182,212,0.3) !important;
        border-radius: 10px !important;
        overflow: hidden;
        background: rgba(2,6,23,0.8) !important;
        backdrop-filter: blur(12px) !important;
      }
      .leaflet-control-zoom a {
        background: rgba(2,6,23,0.0) !important;
        color: #06b6d4 !important;
        border-bottom: 1px solid rgba(6,182,212,0.2) !important;
        font-size: 16px !important;
      }
      .leaflet-control-zoom a:hover { background: rgba(6,182,212,0.12) !important; }
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
    { id: 'all', label: 'All', icon: '🗺️', color: '#06b6d4' },
    { id: 'gantries', label: 'Gantries', icon: '📷', color: '#60a5fa' },
    { id: 'convoys', label: 'Convoys', icon: '🚨', color: '#f87171' },
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
          width: 28, height: 28,
          borderColor: 'rgba(6,182,212,0.45)',
          pointerEvents: 'none', zIndex: 910
        }} />
      ))}

      {/* ── TOP HUD BAR ── */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 16,
        zIndex: 1000,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        background: 'rgba(2,6,23,0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(6,182,212,0.28)',
        borderRadius: 14,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.85), inset 0 1px 0 rgba(6,182,212,0.1)',
      }}>

        {/* Title Block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{
            width: 38, height: 38,
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.4)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6,182,212,0.25)',
            flexShrink: 0
          }}>
            <Navigation size={17} color="#06b6d4" style={{ animation: 'blink 3s ease-in-out infinite' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.12em', lineHeight: 1.2 }}>
              ANPR SPATIAL SURVEILLANCE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 9, color: '#94a3b8' }}>
                GANTRIES: <span style={{ color: '#06b6d4', fontWeight: 700 }}>{loading ? '—' : gantries.length}</span>
              </span>
              <span style={{ color: '#1e293b' }}>|</span>
              <span style={{ fontSize: 9, color: '#94a3b8' }}>
                CONVOYS: <span style={{ color: '#f87171', fontWeight: 700 }}>{loading ? '—' : convoys.length}</span>
              </span>
              <span style={{ color: '#1e293b' }}>|</span>
              <span style={{
                fontSize: 9, color: '#10b981', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#10b981',
                  display: 'inline-block', animation: 'convoyPulse 1.5s infinite'
                }} />
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={e => { e.preventDefault(); fetchTrajectory(searchPlate); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(15,23,42,0.9)',
            border: '1px solid rgba(51,65,85,0.7)',
            borderRadius: 10, padding: '6px 10px',
            flex: '0 1 340px',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.6)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(51,65,85,0.7)'}
        >
          <Search size={13} color="#06b6d4" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchPlate}
            onChange={e => setSearchPlate(e.target.value.toUpperCase())}
            placeholder="Vehicle plate (e.g. MH-12-PQ-9981)..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: 10.5, fontFamily: 'inherit',
              letterSpacing: '0.08em', flex: 1,
            }}
          />
          <button
            type="submit"
            disabled={loadingTrajectory}
            style={{
              background: loadingTrajectory ? 'rgba(6,182,212,0.2)' : 'linear-gradient(135deg, #0891b2, #1d4ed8)',
              border: 'none', borderRadius: 7, color: loadingTrajectory ? '#64748b' : '#fff',
              fontSize: 10, fontWeight: 800, padding: '4px 12px', cursor: loadingTrajectory ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.06em',
              boxShadow: loadingTrajectory ? 'none' : '0 0 12px rgba(6,182,212,0.35)',
              transition: 'all 0.2s'
            }}
          >
            {loadingTrajectory ? '▸ TRACING...' : '▸ TRACE'}
          </button>
        </form>

        {/* Filter Pills */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(30,41,59,0.8)',
          borderRadius: 10, padding: 4
        }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                background: activeFilter === f.id ? f.color : 'transparent',
                border: 'none', borderRadius: 7,
                color: activeFilter === f.id ? '#020617' : '#64748b',
                fontSize: 9.5, fontWeight: 800, padding: '4px 10px',
                cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.06em',
                boxShadow: activeFilter === f.id ? `0 0 12px ${f.color}55` : 'none',
                transition: 'all 0.18s'
              }}
            >
              {f.icon} {f.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Zoom readout */}
        <div style={{
          background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 9, color: '#06b6d4', fontWeight: 700, letterSpacing: '0.1em',
          whiteSpace: 'nowrap'
        }}>
          Z:{currentZoom} • 28.6°N 77.2°E
        </div>
      </div>

      {/* ── LEAFLET MAP ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={true}
          style={{ width: '100%', height: '100%', background: '#020617' }}
        >
          <FlyTo center={mapCenter} zoom={mapZoom} />
          <ZoomWatcher onZoomChange={setCurrentZoom} />

          {/* Stadia Alidade Smooth Dark — free, no API key required */}
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenStreetMap'
            maxZoom={20}
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
                    background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(6,182,212,0.4)', borderRadius: 12,
                    padding: 14, minWidth: 240, color: '#e2e8f0',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.9), 0 0 20px rgba(6,182,212,0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Camera size={14} color="#06b6d4" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#06b6d4', letterSpacing: '0.1em' }}>
                        {g.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 9.5, color: '#64748b', marginBottom: 10 }}>
                      📍 {g.city} &nbsp;·&nbsp; Type: {g.type}
                    </div>
                    <div style={{
                      background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>TOTAL SIGHTINGS</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#06b6d4' }}>{g.sighting_count}</span>
                    </div>
                    {g.recent_vehicles?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6, letterSpacing: '0.08em' }}>RECENT VEHICLES:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {g.recent_vehicles.map((v, i) => (
                            <span
                              key={i}
                              onClick={() => { setSearchPlate(v); fetchTrajectory(v); }}
                              style={{
                                padding: '3px 8px', borderRadius: 5,
                                background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                                color: '#67e8f9', fontSize: 9, cursor: 'pointer', fontWeight: 700,
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.22)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.1)'}
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
              <React.Fragment key={`convoy-${c.cluster_id}`}>
                <CircleMarker
                  center={[c.lat, c.lng]}
                  radius={42}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08, weight: 2, dashArray: '5,6' }}
                />
                <CircleMarker
                  center={[c.lat, c.lng]}
                  radius={26}
                  pathOptions={{ color: '#ef4444', fillColor: 'transparent', fillOpacity: 0, weight: 1.5, dashArray: '3,4', opacity: 0.5 }}
                />
                <Marker position={[c.lat, c.lng]} icon={createConvoyIcon()}>
                  <Popup>
                    <div style={{
                      background: 'rgba(15,3,3,0.97)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(248,113,113,0.45)', borderRadius: 12,
                      padding: 14, minWidth: 250,
                      boxShadow: '0 16px 40px rgba(0,0,0,0.9), 0 0 24px rgba(239,68,68,0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <ShieldAlert size={14} color="#f87171" />
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#f87171', letterSpacing: '0.1em' }}>
                          TANDEM CONVOY ALERT
                        </span>
                        <span style={{
                          marginLeft: 'auto', fontSize: 8, padding: '2px 6px',
                          background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                          borderRadius: 4, color: '#fca5a5', fontWeight: 800
                        }}>
                          {c.co_sightings}× HITS
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 10 }}>
                        📍 {c.location}
                      </div>
                      <div style={{
                        background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8, padding: '8px 10px', marginBottom: 10
                      }}>
                        {[['TARGET A', c.vehicle1, c.owner1], ['TARGET B', c.vehicle2, c.owner2]].map(([label, plate, owner]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, color: '#64748b', letterSpacing: '0.06em' }}>{label}:</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 800 }}>{plate}</div>
                              {owner && <div style={{ fontSize: 8.5, color: '#94a3b8' }}>{owner}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {onOpenDossier && (
                        <button
                          onClick={() => onOpenDossier(c.owner1)}
                          style={{
                            width: '100%', padding: '7px 0',
                            background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(127,29,29,0.4))',
                            border: '1px solid rgba(239,68,68,0.35)', borderRadius: 7,
                            color: '#fca5a5', fontSize: 9, fontWeight: 800, cursor: 'pointer',
                            fontFamily: 'inherit', letterSpacing: '0.08em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                          }}
                        >
                          <ExternalLink size={11} /> OPEN INTELLIGENCE DOSSIER
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}

          {/* Trajectory Polyline */}
          {polylineCoords.length > 1 && (
            <>
              {/* Shadow line */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#10b981', weight: 8, opacity: 0.12, lineCap: 'round', lineJoin: 'round' }}
              />
              {/* Main animated line */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{ color: '#10b981', weight: 3, dashArray: '10,7', opacity: 0.92, lineCap: 'round' }}
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
                  background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10,
                  padding: 12, minWidth: 200, color: '#e2e8f0',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.9)'
                }}>
                  <div style={{ color: '#10b981', fontWeight: 800, fontSize: 10, marginBottom: 6 }}>
                    STOP #{pt.sequence}: {pt.location}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.7 }}>
                    <div>🕐 {pt.timestamp}</div>
                    <div>📷 Camera: {pt.camera_id}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── LEFT STATS PANEL ── */}
      <div style={{
        position: 'absolute', top: 80, left: 16, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none'
      }}>
        {[
          { icon: <Camera size={13} color="#06b6d4" />, label: 'GANTRIES', value: gantries.length, color: '#06b6d4' },
          { icon: <ShieldAlert size={13} color="#f87171" />, label: 'CONVOYS', value: convoys.length, color: '#f87171' },
          { icon: <Car size={13} color="#10b981" />, label: 'TRACKED', value: trajectory.length, color: '#10b981' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(2,6,23,0.85)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${stat.color}28`,
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: `0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 ${stat.color}14`,
            minWidth: 130
          }}>
            {stat.icon}
            <div>
              <div style={{ fontSize: 8.5, color: '#475569', letterSpacing: '0.12em' }}>{stat.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{loading ? '—' : stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── BOTTOM TRAJECTORY PLAYER ── */}
      {activeVehicle && trajectory.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1000,
          background: 'rgba(2,6,23,0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 14,
          padding: '14px 16px',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(16,185,129,0.1)',
        }}>
          {/* Vehicle info row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 14px rgba(16,185,129,0.2)'
              }}>
                <Car size={17} color="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981', letterSpacing: '0.08em' }}>
                    {activeVehicle.registration_number}
                  </span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {activeVehicle.registered_owner}
                  </span>
                  <span style={{
                    fontSize: 8.5, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#34d399', fontWeight: 700, letterSpacing: '0.08em'
                  }}>
                    {activeVehicle.model || 'VEHICLE'}
                  </span>
                </div>
                <div style={{ fontSize: 9.5, color: '#475569', marginTop: 3 }}>
                  {trajectory.length} ANPR checkpoints recorded &nbsp;·&nbsp;
                  Showing stop #{playbackIndex + 1} of {trajectory.length}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => { setPlaybackIndex(0); setIsPlaying(false); }}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.7)',
                  color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Reset"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setPlaybackIndex(p => Math.max(0, p - 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.7)',
                  color: '#94a3b8', cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >‹</button>
              <button
                onClick={() => setIsPlaying(p => !p)}
                style={{
                  height: 34, padding: '0 18px', borderRadius: 9,
                  background: isPlaying
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(127,29,29,0.8))'
                    : 'linear-gradient(135deg, #059669, #0d9488)',
                  border: 'none', color: '#fff', fontSize: 10, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: isPlaying ? '0 0 14px rgba(239,68,68,0.4)' : '0 0 14px rgba(16,185,129,0.4)'
                }}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                {isPlaying ? 'PAUSE' : 'ANIMATE'}
              </button>
              <button
                onClick={() => setPlaybackIndex(p => Math.min(trajectory.length - 1, p + 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.7)',
                  color: '#94a3b8', cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >›</button>
              {onOpenDossier && (
                <button
                  onClick={() => onOpenDossier(activeVehicle.registered_owner)}
                  style={{
                    height: 34, padding: '0 14px', borderRadius: 9,
                    background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                    color: '#06b6d4', fontSize: 9.5, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 5
                  }}
                >
                  <ExternalLink size={12} /> DOSSIER
                </button>
              )}
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 9, color: '#475569', minWidth: 50, textAlign: 'right' }}>
              #{playbackIndex + 1}/{trajectory.length}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Track BG */}
              <div style={{
                position: 'absolute', top: '50%', left: 0, right: 0, height: 3,
                background: 'rgba(30,41,59,0.8)', borderRadius: 2, transform: 'translateY(-50%)'
              }} />
              {/* Fill */}
              <div style={{
                position: 'absolute', top: '50%', left: 0, height: 3,
                width: `${trajectory.length > 1 ? (playbackIndex / (trajectory.length - 1)) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #059669, #06b6d4)', borderRadius: 2,
                transform: 'translateY(-50%)',
                boxShadow: '0 0 8px rgba(16,185,129,0.6)',
                transition: 'width 0.3s ease'
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
                    boxShadow: i === playbackIndex ? '0 0 8px rgba(16,185,129,0.8)' : 'none',
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
            <span style={{
              fontSize: 9, color: '#10b981', fontWeight: 700, minWidth: 140,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 6, padding: '3px 8px', textAlign: 'center'
            }}>
              {currentPt?.timestamp || '—'}
            </span>
          </div>
        </div>
      )}

      {/* ── LOADING OVERLAY ── */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid rgba(6,182,212,0.2)',
            borderTop: '2px solid #06b6d4',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700, letterSpacing: '0.15em' }}>
            INITIALIZING SPATIAL INTELLIGENCE...
          </div>
          <div style={{ fontSize: 9.5, color: '#334155' }}>Connecting to ANPR mesh network</div>
        </div>
      )}
    </div>
  );
}
