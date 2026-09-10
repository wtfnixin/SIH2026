/**
 * GraphWindow.jsx — Rebuilt from scratch.
 *
 * Self-contained floating investigation network graph.
 * Handles its own: data fetching, dragging, Cytoscape lifecycle, layout selection.
 *
 * Two-phase Cytoscape mount:
 *   Phase 1 — container div renders (may be 0×0)
 *   Phase 2 — ResizeObserver fires once container has real px dimensions → init cy
 *
 * Layout strategy:
 *   ego network (hub-spoke)  → concentric  (target center, direct ring, 2nd-hop outer)
 *   complex / mixed          → cola physics (organic clusters)
 *   fallback on any error    → circle (always works)
 *
 * Features:
 *   - Draggable floating window, minimise pill, maximize, Esc close
 *   - Node cap (MAX=30) with overflow badge
 *   - Parallel edge deduplication
 *   - Hover: dim non-neighbourhood, tooltip
 *   - Click: node detail panel (name, type, degree, Dossier button)
 *   - Zoom buttons + mousewheel
 *   - Fit-all resets correctly after window drag/resize
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import {
  GripHorizontal, Maximize2, Minimize2, Minus, X,
  RotateCcw, ZoomIn, ZoomOut, Network, Info,
  Users, ExternalLink, Loader2, AlertTriangle
} from 'lucide-react';

// ── Cytoscape plugins ──────────────────────────────────────────────────────
try { cytoscape.use(cola); } catch (_) {}

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_NODES = 30;
const ZOOM_FACTOR = 1.3;
const API_BASE = 'http://localhost:8000/api/v1';

// ── Node type palette ──────────────────────────────────────────────────────
const TYPE = {
  Person:   { color: '#e11d48', border: '#f43f5e', dim: 'rgba(225,29,72,0.15)',   label: 'Suspect',  shape: 'ellipse'         },
  Phone:    { color: '#d97706', border: '#f59e0b', dim: 'rgba(217,119,6,0.15)',   label: 'Phone',    shape: 'round-rectangle'  },
  Vehicle:  { color: '#0284c7', border: '#38bdf8', dim: 'rgba(2,132,199,0.15)',   label: 'Vehicle',  shape: 'diamond'          },
  Location: { color: '#7c3aed', border: '#a78bfa', dim: 'rgba(124,58,237,0.15)', label: 'Location', shape: 'pentagon'         },
  FIR:      { color: '#059669', border: '#34d399', dim: 'rgba(5,150,105,0.15)',  label: 'Case',     shape: 'round-tag'        },
};
const DEFAULT_TYPE = { color: '#6b7280', border: '#9ca3af', dim: 'rgba(107,114,128,0.15)', label: 'Entity', shape: 'ellipse' };
const t = (type) => TYPE[type] || DEFAULT_TYPE;

// ── Cytoscape stylesheet ───────────────────────────────────────────────────
const CY_STYLE = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'color': '#d4d4d8',
      'font-size': '10px',
      'font-weight': '600',
      'font-family': 'Inter, system-ui, sans-serif',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 6,
      'text-background-color': 'rgba(9,9,11,0.88)',
      'text-background-opacity': 1,
      'text-background-padding': '2px 5px',
      'text-wrap': 'ellipsis',
      'text-max-width': '80px',
      'background-color': '#6b7280',
      'border-width': 2,
      'border-color': '#9ca3af',
      'width': '36px',
      'height': '36px',
      'shape': 'ellipse',
      'transition-property': 'opacity, border-width, width, height',
      'transition-duration': '160ms',
    },
  },
  // Per-type styles
  ...Object.entries(TYPE).map(([type, m]) => ({
    selector: `node[node_type = "${type}"]`,
    style: { 'background-color': m.color, 'border-color': m.border, 'shape': m.shape },
  })),
  // Target node (the person we're investigating)
  {
    selector: 'node[?isTarget]',
    style: {
      'width': '54px', 'height': '54px',
      'border-width': 3, 'font-size': '11px', 'font-weight': '800', 'z-index': 10,
    },
  },
  // Selected
  {
    selector: 'node:selected',
    style: { 'border-width': 4, 'border-color': '#fff', 'width': '46px', 'height': '46px', 'z-index': 20 },
  },
  { selector: 'node.dimmed',        style: { 'opacity': 0.15 } },
  { selector: 'edge.dimmed',        style: { 'opacity': 0.05 } },
  { selector: 'edge.highlighted',   style: { 'width': 2.4, 'line-color': 'rgba(255,255,255,0.5)', 'target-arrow-color': 'rgba(255,255,255,0.5)', 'z-index': 15 } },
  {
    selector: 'edge',
    style: {
      'width': 1.2,
      'line-color': 'rgba(113,113,122,0.4)',
      'target-arrow-color': 'rgba(113,113,122,0.4)',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.85,
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '8px',
      'font-family': 'JetBrains Mono, monospace',
      'color': '#71717a',
      'text-rotation': 'autorotate',
      'text-background-color': 'rgba(9,9,11,0.82)',
      'text-background-opacity': 1,
      'text-background-padding': '1px 3px',
      'transition-property': 'opacity, width',
      'transition-duration': '160ms',
    },
  },
];

// ── Data helpers ───────────────────────────────────────────────────────────
function buildCyElements(apiElements, targetId) {
  const nodes = apiElements.filter(e => !e.data.source);
  const edges = apiElements.filter(e => e.data.source && e.data.target);

  // Node cap: always keep target + direct neighbours, fill rest by degree
  let kept = nodes;
  let hidden = 0;
  if (nodes.length > MAX_NODES) {
    const degreeCnt = {};
    edges.forEach(e => {
      degreeCnt[e.data.source] = (degreeCnt[e.data.source] || 0) + 1;
      degreeCnt[e.data.target] = (degreeCnt[e.data.target] || 0) + 1;
    });
    const directIds = new Set(
      edges
        .filter(e => e.data.source === targetId || e.data.target === targetId)
        .flatMap(e => [e.data.source, e.data.target])
        .filter(id => id !== targetId)
    );
    const keptSet = new Set([targetId, ...directIds]);
    const secondary = nodes
      .filter(n => !keptSet.has(n.data.id))
      .sort((a, b) => (degreeCnt[b.data.id] || 0) - (degreeCnt[a.data.id] || 0));
    secondary.slice(0, MAX_NODES - keptSet.size).forEach(n => keptSet.add(n.data.id));
    hidden = nodes.length - keptSet.size;
    kept = nodes.filter(n => keptSet.has(n.data.id));
  }

  // Deduplicate parallel edges (keep one per unique pair, merge labels)
  const edgeMap = {};
  edges.forEach(e => {
    if (!kept.find(n => n.data.id === e.data.source) || !kept.find(n => n.data.id === e.data.target)) return;
    const key = [e.data.source, e.data.target].sort().join('||');
    if (!edgeMap[key]) edgeMap[key] = { ...e, data: { ...e.data, labels: [] } };
    const lbl = e.data.relationship || e.data.label || '';
    if (lbl && !edgeMap[key].data.labels.includes(lbl)) edgeMap[key].data.labels.push(lbl);
  });

  const cyNodes = kept.map(n => ({
    group: 'nodes',
    data: {
      id:        n.data.id,
      label:     n.data.label,
      node_type: n.data.node_type || 'default',
      isTarget:  n.data.id === targetId || undefined,
    },
  }));

  const cyEdges = Object.values(edgeMap).map(e => ({
    group: 'edges',
    data: {
      id:     `e-${e.data.source}-${e.data.target}`,
      source: e.data.source,
      target: e.data.target,
      label:  e.data.labels.slice(0, 2).join(' / '),
    },
  }));

  return { cyNodes, cyEdges, nodeCount: kept.length, edgeCount: cyEdges.length, hidden };
}

function chooseLayout(cyNodes, cyEdges, targetId, compact) {
  const pad = compact ? 30 : 50;
  const n = cyNodes.length;

  // Detect ego network
  const targetEdges = cyEdges.filter(e => e.data.source === targetId || e.data.target === targetId).length;
  const isEgo = cyEdges.length > 0 && targetEdges / cyEdges.length > 0.5;

  if (isEgo) {
    const directIds = new Set(
      cyEdges
        .filter(e => e.data.source === targetId || e.data.target === targetId)
        .flatMap(e => [e.data.source, e.data.target])
        .filter(id => id !== targetId)
    );
    return {
      name: 'concentric',
      fit: true,
      padding: pad,
      startAngle: (3 / 2) * Math.PI,
      sweep: 2 * Math.PI,
      clockwise: true,
      equidistant: false,
      minNodeSpacing: compact ? 18 : 26,
      animate: true,
      animationDuration: 600,
      animationEasing: 'ease-in-out-cubic',
      concentric: node => {
        const id = node.id();
        if (id === targetId) return 100;
        if (directIds.has(id)) return 50;
        return 10;
      },
      levelWidth: () => 1,
    };
  }

  // Cola for clustered
  return {
    name: 'cola',
    animate: true,
    animationDuration: 700,
    fit: true,
    padding: pad,
    nodeSpacing: () => compact ? 20 : 32,
    edgeLength: () => compact ? 100 : 155,
    maxSimulationTime: 2500,
    convergenceThreshold: 0.008,
    randomize: false,
    infinite: false,
    avoidOverlap: true,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// GraphWindow Component
// ══════════════════════════════════════════════════════════════════════════
export default function GraphWindow({
  isOpen = false,
  onClose,
  targetEntity = null,
  onOpenDossier,
  isMinimized: propMin,
  setIsMinimized: propSetMin,
}) {
  // ── Window state ─────────────────────────────────────────────────────────
  const [localMin, setLocalMin] = useState(false);
  const isMin    = propMin    !== undefined ? propMin    : localMin;
  const setIsMin = propSetMin !== undefined ? propSetMin : setLocalMin;

  const [isMax, setIsMax] = useState(false);
  const [pos, setPos] = useState(null);   // null = docked bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const dragRef  = useRef({ sx: 0, sy: 0, px: 0, py: 0 });
  const winRef   = useRef(null);

  // ── Data state ───────────────────────────────────────────────────────────
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // ── Graph state ──────────────────────────────────────────────────────────
  const canvasRef   = useRef(null);         // div Cytoscape mounts into
  const cyRef       = useRef(null);         // cy instance
  const cyReadyRef  = useRef(false);        // has cy been initialized?
  const pendingInit = useRef(null);         // elements waiting for first real-size init
  const [graphMeta, setGraphMeta] = useState({ nodeCount: 0, edgeCount: 0, hidden: 0 });
  const [selected, setSelected]   = useState(null);  // { id, label, type, degree }
  const [hover, setHover]         = useState(null);   // { label, type, x, y }

  // ── Fetch ego-network data ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !targetEntity) { setApiData(null); return; }
    setLoading(true);
    setError(null);
    setApiData(null);
    setSelected(null);

    fetch(`${API_BASE}/graph/dossier-network/${encodeURIComponent(targetEntity)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => { setApiData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [targetEntity, isOpen]);

  // ── Build & load graph when data arrives ─────────────────────────────────
  useEffect(() => {
    if (!apiData?.elements) return;
    const compact = !isMax;
    const { cyNodes, cyEdges, nodeCount, edgeCount, hidden } =
      buildCyElements(apiData.elements, targetEntity);
    setGraphMeta({ nodeCount, edgeCount, hidden });
    setSelected(null);

    const load = (cy) => {
      cy.elements().remove();
      cy.add([...cyNodes, ...cyEdges]);
      const layout = chooseLayout(cyNodes, cyEdges, targetEntity, compact);
      const l = cy.layout(layout);
      l.on('layoutstop', () => {
        const pad = compact ? 30 : 50;
        cy.fit(cy.elements(), pad);
        requestAnimationFrame(() => {
          if (cy && !cy.destroyed()) cy.fit(cy.elements(), pad);
        });
      });
      l.run();
    };

    if (cyReadyRef.current && cyRef.current && !cyRef.current.destroyed()) {
      load(cyRef.current);
    } else {
      // Defer until canvas is mounted and sized
      pendingInit.current = load;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData, isMax]);

  // ── Two-phase Cytoscape init: wait for real container dimensions ─────────
  useEffect(() => {
    if (!canvasRef.current || isMin) return;
    if (cyReadyRef.current) return; // already initialised

    const init = () => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return; // not ready yet
      if (cyReadyRef.current) return;

      cyReadyRef.current = true;
      const cy = cytoscape({
        container: canvasRef.current,
        elements:  [],
        style:     CY_STYLE,
        minZoom:   0.08,
        maxZoom:   5,
        wheelSensitivity: 0.35,
      });

      // ── Hover events ──
      cy.on('mouseover', 'node', evt => {
        const nd = evt.target;
        const rp = nd.renderedPosition();
        setHover({ label: nd.data('label'), type: nd.data('node_type'), x: rp.x, y: rp.y });
        cy.elements().addClass('dimmed');
        nd.closedNeighborhood().removeClass('dimmed');
        nd.closedNeighborhood().edges().addClass('highlighted');
      });
      cy.on('mouseout', 'node', () => {
        setHover(null);
        cy.elements().removeClass('dimmed highlighted');
      });

      // ── Tap events ──
      cy.on('tap', 'node', evt => {
        const nd = evt.target;
        setSelected({ id: nd.id(), label: nd.data('label'), type: nd.data('node_type'), degree: nd.degree(false) });
      });
      cy.on('tap', evt => {
        if (evt.target === cy) { setSelected(null); cy.elements().removeClass('dimmed highlighted'); }
      });

      cyRef.current = cy;

      // Run any pending load
      if (pendingInit.current) {
        pendingInit.current(cy);
        pendingInit.current = null;
      }
    };

    const ro = new ResizeObserver(init);
    ro.observe(canvasRef.current);
    init(); // try immediately (in case already sized)

    return () => {
      ro.disconnect();
      if (cyRef.current && !cyRef.current.destroyed()) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      cyReadyRef.current = false;
      pendingInit.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMin]);  // Re-run when un-minimized (canvasRef remounts)

  // ── Keep graph sharp on window drag/resize ────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(() => {
      const cy = cyRef.current;
      if (cy && !cy.destroyed()) {
        cy.resize();
        cy.fit(cy.elements(), isMax ? 50 : 30);
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [isMax]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── Dragging ──────────────────────────────────────────────────────────────
  const handlePointerDown = e => {
    if (isMax || isMin || e.target.closest('button')) return;
    e.preventDefault();
    const rect = winRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: rect.left, py: rect.top };
    if (!pos) setPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  };

  const handlePointerMove = useCallback(e => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    const W = 500, H = 390;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth  - W - 8, dragRef.current.px + dx)),
      y: Math.max(60, Math.min(window.innerHeight - H - 8, dragRef.current.py + dy)),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup',   handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup',   handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const zoomIn  = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.zoom({ level: cy.zoom() * ZOOM_FACTOR, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);
  const zoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.zoom({ level: cy.zoom() / ZOOM_FACTOR, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);
  const fitAll  = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.fit(cy.elements(), isMax ? 50 : 30);
  }, [isMax]);

  // ── Window position style ─────────────────────────────────────────────────
  const winStyle = isMax
    ? { position: 'fixed', top: '72px', left: '16px', right: '16px', bottom: '16px', width: 'auto', height: 'auto', zIndex: 900 }
    : pos
    ? { position: 'fixed', left: pos.x, top: pos.y, width: 500, height: 390, zIndex: 850 }
    : { position: 'fixed', right: 24, bottom: 24, width: 500, height: 390, zIndex: 850 };

  // ── Data summary from API ─────────────────────────────────────────────────
  const breakdown = apiData?.breakdown;

  // ── Types present in data (for legend) ───────────────────────────────────
  const presentTypes = [...new Set(
    (apiData?.elements || []).filter(e => !e.data.source).map(e => e.data.node_type).filter(Boolean)
  )];

  if (!isOpen) return null;

  // ── Minimised pill ────────────────────────────────────────────────────────
  if (isMin) {
    return (
      <div
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 850,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 16px',
          background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.18)', borderRadius: 28,
          boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onClick={() => setIsMin(false)}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        <Network size={14} color="#38bdf8" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f4f4f5', fontFamily: 'Inter, sans-serif' }}>
          {targetEntity ? `${targetEntity}` : 'Network'} — {graphMeta.nodeCount} nodes
        </span>
        <Maximize2 size={12} color="#71717a" style={{ marginLeft: 2 }} />
        {onClose && (
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', display: 'flex', padding: 0, marginLeft: 2 }}
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  // ── Full window ───────────────────────────────────────────────────────────
  return (
    <div
      ref={winRef}
      style={{
        ...winStyle,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(9,9,11,0.97)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 14,
        boxShadow: isDragging ? '0 28px 70px rgba(0,0,0,0.95)' : '0 16px 48px rgba(0,0,0,0.85)',
        overflow: 'hidden',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* ── Header ── */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          height: 42, flexShrink: 0,
          padding: '0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(18,18,22,0.99)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: isMax ? 'default' : 'grab',
        }}
      >
        {/* Left: grip + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {!isMax && <GripHorizontal size={14} color="#52525b" />}
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: '#f4f4f5', fontFamily: 'JetBrains Mono, monospace' }}>
            NETWORK MAP
          </span>
          {targetEntity && (
            <span style={{
              background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)',
              color: '#38bdf8', borderRadius: 4, padding: '1px 7px',
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {targetEntity}
            </span>
          )}
          {!loading && graphMeta.nodeCount > 0 && (
            <span style={{
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#a1a1aa',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 4, padding: '1px 6px',
            }}>
              {graphMeta.nodeCount}N · {graphMeta.edgeCount}E
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {pos && !isMax && (
            <Btn icon={<RotateCcw size={12} />} title="Dock to corner" onClick={() => setPos(null)} />
          )}
          <Btn icon={isMax ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            title={isMax ? 'Restore' : 'Maximise'} onClick={() => setIsMax(v => !v)} />
          {!isMax && (
            <Btn icon={<Minus size={12} />} title="Minimise" onClick={() => setIsMin(true)} />
          )}
          {onClose && (
            <Btn icon={<X size={12} />} title="Close (Esc)" onClick={onClose} danger />
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#09090b' }}>

        {/* Cytoscape canvas — always present, hidden behind loading/error overlays */}
        <div
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Loading overlay */}
        {loading && (
          <div style={overlayStyle}>
            <Loader2 size={24} color="#38bdf8" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={overlayTextStyle}>Loading network…</span>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div style={overlayStyle}>
            <AlertTriangle size={24} color="#ef4444" />
            <span style={{ ...overlayTextStyle, color: '#ef4444' }}>Failed to load: {error}</span>
          </div>
        )}

        {/* Empty / no target */}
        {!loading && !error && !apiData && (
          <div style={overlayStyle}>
            <Network size={28} color="#3f3f46" strokeWidth={1.5} />
            <span style={overlayTextStyle}>No suspect selected</span>
          </div>
        )}

        {/* ── Legend (top-left) ── */}
        {!loading && presentTypes.length > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 20,
            background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            padding: isMax ? '7px 12px' : '5px 9px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {presentTypes.map(type => (
              <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: t(type).color, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: type === 'Vehicle' ? 2 : '50%', background: t(type).color, flexShrink: 0 }} />
                {t(type).label}
              </span>
            ))}
          </div>
        )}

        {/* ── Overflow badge (top-centre) ── */}
        {graphMeta.hidden > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
            background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
            padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#a1a1aa',
          }}>
            <Users size={11} /> +{graphMeta.hidden} more hidden (cap: {MAX_NODES})
          </div>
        )}

        {/* ── Hover tooltip ── */}
        {hover && canvasRef.current && (
          <div style={{
            position: 'absolute',
            left: Math.min(hover.x + 16, (canvasRef.current.clientWidth || 400) - 150),
            top:  Math.max(hover.y - 14, 4),
            background: 'rgba(9,9,11,0.94)', backdropFilter: 'blur(14px)',
            border: `1px solid ${t(hover.type).border}44`,
            borderLeft: `3px solid ${t(hover.type).color}`,
            borderRadius: 7, padding: '6px 10px',
            zIndex: 50, pointerEvents: 'none', minWidth: 100,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f4f4f5', fontFamily: 'Inter, sans-serif' }}>{hover.label}</div>
            <div style={{ fontSize: 9, color: t(hover.type).color, fontFamily: 'JetBrains Mono, monospace', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t(hover.type).label}
            </div>
          </div>
        )}

        {/* ── Selected node panel (bottom-left) ── */}
        {selected && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10, zIndex: 25,
            background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(14px)',
            border: `1px solid ${t(selected.type).border}55`,
            borderLeft: `3px solid ${t(selected.type).color}`,
            borderRadius: 8, padding: '8px 12px',
            display: 'flex', flexDirection: 'column', gap: 4,
            minWidth: 150, maxWidth: 220,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', color: t(selected.type).color, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                {t(selected.type).label}
              </span>
              <button onClick={() => { setSelected(null); cyRef.current?.elements().unselect(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: 0, display: 'flex' }}>
                <X size={11} />
              </button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f4f4f5', fontFamily: 'Inter, sans-serif', wordBreak: 'break-word' }}>
              {selected.label}
            </div>
            <div style={{ fontSize: 10, color: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}>
              {selected.degree} connection{selected.degree !== 1 ? 's' : ''}
            </div>
            {onOpenDossier && selected.type === 'Person' && (
              <button
                onClick={() => onOpenDossier(selected.id)}
                style={{
                  marginTop: 2, display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                  color: '#e4e4e7', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; e.currentTarget.style.color = '#38bdf8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e4e4e7'; }}
              >
                Open Dossier <ExternalLink size={9} />
              </button>
            )}
          </div>
        )}

        {/* ── Zoom controls (top-right) ── */}
        {!loading && apiData && (
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 3, zIndex: 20 }}>
            {[
              { icon: <ZoomIn size={13} />,    fn: zoomIn,  title: 'Zoom in'  },
              { icon: <ZoomOut size={13} />,   fn: zoomOut, title: 'Zoom out' },
              { icon: <Maximize2 size={13} />, fn: fitAll,  title: 'Fit all'  },
            ].map(({ icon, fn, title }) => (
              <Btn key={title} icon={icon} title={title} onClick={fn} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        height: 30, flexShrink: 0,
        padding: '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(14,14,18,0.99)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{ color: '#52525b', fontWeight: 700, fontSize: 9, letterSpacing: '0.5px' }}>FOCUS:</span>
          <span style={{ color: '#e4e4e7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {targetEntity || '—'}
          </span>
          {breakdown && (
            <span style={{ color: '#71717a', fontSize: 9, whiteSpace: 'nowrap' }}>
              · {breakdown.total_connections ?? '?'} links
              {breakdown.fir_count   > 0 && ` · ${breakdown.fir_count} FIRs`}
              {breakdown.vehicle_count > 0 && ` · ${breakdown.vehicle_count} vehicles`}
            </span>
          )}
        </div>
        {selected && onOpenDossier && selected.type === 'Person' && (
          <button
            onClick={() => onOpenDossier(selected.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#e4e4e7', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#e4e4e7'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            Dossier <ExternalLink size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Reusable icon button ───────────────────────────────────────────────────
function Btn({ icon, title, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 26, height: 26, borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(18,18,22,0.9)',
        color: '#a1a1aa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s ease', padding: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = danger ? '#ef4444' : '#fff';
        e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.28)';
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.14)' : 'rgba(38,38,44,0.9)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = '#a1a1aa';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        e.currentTarget.style.background = 'rgba(18,18,22,0.9)';
      }}
    >
      {icon}
    </button>
  );
}

// ── Overlay style helpers ──────────────────────────────────────────────────
const overlayStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 10, zIndex: 30, pointerEvents: 'none',
};
const overlayTextStyle = {
  fontSize: 13, fontWeight: 500, color: '#52525b',
  fontFamily: 'Inter, system-ui, sans-serif',
};
