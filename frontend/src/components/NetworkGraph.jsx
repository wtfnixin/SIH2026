import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { ZoomIn, ZoomOut, Maximize2, X, Info, Users } from 'lucide-react';

// Register cola layout engine (idempotent)
try { cytoscape.use(cola); } catch (_) {}

// ── Node type meta ─────────────────────────────────────────────────────────
const NODE_META = {
  Person:   { color: '#e11d48', border: '#f43f5e', label: 'Suspect',  shape: 'ellipse' },
  Phone:    { color: '#d97706', border: '#f59e0b', label: 'Phone',    shape: 'round-rectangle' },
  Vehicle:  { color: '#0284c7', border: '#38bdf8', label: 'Vehicle',  shape: 'diamond' },
  Location: { color: '#7c3aed', border: '#a78bfa', label: 'Location', shape: 'pentagon' },
  FIR:      { color: '#059669', border: '#34d399', label: 'Case',     shape: 'round-tag' },
  default:  { color: '#6b7280', border: '#9ca3af', label: 'Entity',   shape: 'ellipse' },
};
const MAX_NODES = 30;
function getMeta(t) { return NODE_META[t] || NODE_META.default; }

// ── Trim node list to keep graph readable ─────────────────────────────────
function trimElements(rawElements, targetId) {
  const nodes = rawElements.filter(e => !e.data.source);
  const edges = rawElements.filter(e => e.data.source && e.data.target);
  if (nodes.length <= MAX_NODES) return { elements: rawElements, hidden: 0 };

  const directIds = new Set(
    edges
      .filter(e => e.data.source === targetId || e.data.target === targetId)
      .flatMap(e => [e.data.source, e.data.target])
      .filter(id => id !== targetId)
  );
  const degreeCounts = {};
  edges.forEach(e => {
    degreeCounts[e.data.source] = (degreeCounts[e.data.source] || 0) + 1;
    degreeCounts[e.data.target] = (degreeCounts[e.data.target] || 0) + 1;
  });
  const secondHop = nodes
    .filter(n => n.data.id !== targetId && !directIds.has(n.data.id))
    .sort((a, b) => (degreeCounts[b.data.id] || 0) - (degreeCounts[a.data.id] || 0));
  const budget = Math.max(0, MAX_NODES - 1 - directIds.size);
  const kept = new Set([targetId, ...directIds]);
  secondHop.slice(0, budget).forEach(n => kept.add(n.data.id));

  const keptNodes = nodes.filter(n => kept.has(n.data.id));
  const keptEdges = edges.filter(e => kept.has(e.data.source) && kept.has(e.data.target));
  return { elements: [...keptNodes, ...keptEdges], hidden: nodes.length - kept.size };
}

// ── Detect topology ──────────────────────────────────────────────────────
function detectTopology(nodes, edges, targetId) {
  if (nodes.length === 0) return 'empty';
  if (nodes.length <= 2) return 'ego';
  if (!targetId) return 'clustered';
  const targetEdges = edges.filter(
    e => e.data.source === targetId || e.data.target === targetId
  ).length;
  return (edges.length > 0 && targetEdges / edges.length > 0.5) ? 'ego' : 'clustered';
}

// ── Cytoscape stylesheet ─────────────────────────────────────────────────
function buildStyle() {
  const labelBg   = 'rgba(9,9,11,0.90)';
  const labelFg   = '#e4e4e7';
  const edgeColor = 'rgba(113,113,122,0.4)';

  const typedStyles = Object.entries(NODE_META).map(([type, m]) => ({
    selector: `node[node_type = "${type}"]`,
    style: { 'background-color': m.color, 'border-color': m.border, 'shape': m.shape },
  }));

  return [
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'color': labelFg,
        'font-size': '10px',
        'font-weight': '600',
        'font-family': 'Inter, system-ui, sans-serif',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'text-background-color': labelBg,
        'text-background-opacity': 1,
        'text-background-padding': '2px 5px',
        'text-border-radius': '4px',
        'text-wrap': 'ellipsis',
        'text-max-width': '80px',
        'background-color': '#6b7280',
        'border-width': 2,
        'border-color': '#9ca3af',
        'width': '36px',
        'height': '36px',
        'shape': 'ellipse',
        'transition-property': 'opacity, border-width, border-color, width, height',
        'transition-duration': '180ms',
      },
    },
    ...typedStyles,
    {
      selector: 'node[?isTarget]',
      style: { 'width': '52px', 'height': '52px', 'font-size': '11px', 'font-weight': '800', 'border-width': 3, 'z-index': 10 },
    },
    { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#ffffff', 'width': '46px', 'height': '46px', 'z-index': 20 } },
    { selector: 'node.dimmed',   style: { 'opacity': 0.18 } },
    { selector: 'edge.dimmed',   style: { 'opacity': 0.05 } },
    {
      selector: 'edge',
      style: {
        'width': 1.2,
        'line-color': edgeColor,
        'target-arrow-color': edgeColor,
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
        'transition-duration': '180ms',
      },
    },
    { selector: 'edge.highlighted', style: { 'width': 2.2, 'line-color': 'rgba(255,255,255,0.5)', 'target-arrow-color': 'rgba(255,255,255,0.5)', 'z-index': 15 } },
  ];
}

// ── Safely run layout with a double-fit fallback ──────────────────────────
function runLayout(cy, config, padding) {
  try {
    const layout = cy.layout(config);
    layout.on('layoutstop', () => {
      // First fit
      cy.fit(cy.elements(), padding);
      // Safety second fit after browser paint
      requestAnimationFrame(() => {
        if (cy && !cy.destroyed()) cy.fit(cy.elements(), padding);
      });
    });
    layout.run();
  } catch (err) {
    // Fallback to built-in circle layout if plugin fails
    console.warn('Layout failed, falling back to circle:', err);
    cy.layout({ name: 'circle', fit: true, padding, animate: true, animationDuration: 600 }).run();
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function NetworkGraph({
  elements = [],
  onSelectNode,
  selectedEntityId,
  isCompact = false,
  isDark = true,
  targetEntityId = null,
}) {
  const containerRef  = useRef(null);
  const cyRef         = useRef(null);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [hoverInfo,    setHoverInfo]    = useState(null);
  const [hiddenCount,  setHiddenCount]  = useState(0);

  // ── Mount / rebuild Cytoscape ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    // Destroy any previous instance
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    const rawNodes = elements.filter(e => !e.data.source);
    const rawEdges = elements.filter(e => e.data.source && e.data.target);
    const { elements: trimmed, hidden } = trimElements(elements, targetEntityId);
    setHiddenCount(hidden);
    setSelectedInfo(null);
    setHoverInfo(null);

    // Deduplicate edges (multi-edges cause visual clutter)
    const seenEdges = new Set();
    const cyElements = trimmed
      .map(el => {
        if (el.data.source && el.data.target) {
          const key = [el.data.source, el.data.target].sort().join('|');
          if (seenEdges.has(key)) return null;
          seenEdges.add(key);
          return {
            group: 'edges',
            data: {
              id:     `e-${el.data.source}-${el.data.target}`,
              source:  el.data.source,
              target:  el.data.target,
              label:   el.data.relationship || el.data.label || '',
            },
          };
        }
        return {
          group: 'nodes',
          data: {
            id:        el.data.id,
            label:     el.data.label,
            node_type: el.data.node_type || 'default',
            isTarget:  (el.data.id === targetEntityId) || undefined,
          },
        };
      })
      .filter(Boolean);

    const pad  = isCompact ? 28 : 48;
    const topo = detectTopology(rawNodes, rawEdges, targetEntityId);

    // ── Direct neighbours of target (needed for concentric rings) ──
    const directIds = new Set(
      rawEdges
        .filter(e => e.data.source === targetEntityId || e.data.target === targetEntityId)
        .flatMap(e => [e.data.source, e.data.target])
        .filter(id => id !== targetEntityId)
    );

    // ── Choose layout ──
    let layoutConfig;
    if (topo === 'ego') {
      layoutConfig = {
        name: 'concentric',
        fit: true,
        padding: pad,
        startAngle: (3 / 2) * Math.PI,
        sweep: 2 * Math.PI,
        clockwise: true,
        equidistant: false,
        minNodeSpacing: isCompact ? 20 : 28,
        animate: true,
        animationDuration: 650,
        animationEasing: 'ease-in-out-cubic',
        concentric: node => {
          const id = node.id();
          if (id === targetEntityId) return 100;
          if (directIds.has(id))     return 50;
          return 10;
        },
        levelWidth: () => 1,
      };
    } else {
      layoutConfig = {
        name: 'cola',
        animate: true,
        animationDuration: 750,
        fit: true,
        padding: pad,
        nodeSpacing:  () => isCompact ? 18 : 28,
        edgeLength:   () => isCompact ? 95 : 145,
        maxSimulationTime: 2200,
        convergenceThreshold: 0.008,
        randomize: false,
        infinite: false,
        avoidOverlap: true,
      };
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements:  cyElements,
      style:     buildStyle(),
      // Higher wheel sensitivity so zooming feels snappy
      minZoom:           0.1,
      maxZoom:           5,
      wheelSensitivity:  0.35, // faster scroll-wheel zoom
    });

    runLayout(cy, layoutConfig, pad);

    // ── Hover: dim neighbourhood ──
    cy.on('mouseover', 'node', evt => {
      const node = evt.target;
      const pos  = node.renderedPosition();
      setHoverInfo({ id: node.id(), label: node.data('label'), type: node.data('node_type'), x: pos.x, y: pos.y });
      cy.elements().addClass('dimmed');
      node.closedNeighborhood().removeClass('dimmed');
      node.closedNeighborhood().edges().addClass('highlighted');
    });
    cy.on('mouseout', 'node', () => {
      setHoverInfo(null);
      cy.elements().removeClass('dimmed highlighted');
    });

    // ── Select ──
    cy.on('tap', 'node', evt => {
      const node = evt.target;
      setSelectedInfo({ id: node.id(), label: node.data('label'), type: node.data('node_type'), degree: node.degree(false) });
      if (onSelectNode) onSelectNode(node.id(), node.data('node_type'));
    });
    cy.on('tap', evt => {
      if (evt.target === cy) {
        setSelectedInfo(null);
        cy.elements().removeClass('dimmed highlighted');
      }
    });

    cyRef.current = cy;
    return () => {
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, isCompact, targetEntityId]);

  // ── Keep canvas sharp when window is resized / dragged ────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (cyRef.current && !cyRef.current.destroyed()) {
        cyRef.current.resize();
        cyRef.current.fit(cyRef.current.elements(), isCompact ? 28 : 48);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompact]);

  // ── Externally controlled selection / centring ────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || !selectedEntityId) return;
    const node = cy.getElementById(selectedEntityId);
    if (node && node.length > 0) {
      cy.elements().unselect();
      node.select();
      cy.animate({ center: { eles: node }, zoom: isCompact ? 1.6 : 2.0, duration: 420, easing: 'ease-in-out-cubic' });
    }
  }, [selectedEntityId, isCompact]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const ZOOM_STEP = 1.35; // zoom in/out per button click
  const zoomIn  = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.zoom({ level: cy.zoom() * ZOOM_STEP, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);
  const zoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.zoom({ level: cy.zoom() / ZOOM_STEP, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);
  const fitAll  = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.fit(cy.elements(), isCompact ? 28 : 48);
  }, [isCompact]);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const labelBg   = 'rgba(9,9,11,0.92)';
  const labelFg   = '#f4f4f5';
  const subtleBdr = 'rgba(255,255,255,0.1)';
  const presentTypes = [...new Set(
    elements.filter(e => !e.data.source).map(e => e.data.node_type).filter(Boolean)
  )];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#09090b', borderRadius: '0 0 12px 12px' }}>

      {/* Cytoscape canvas — must fill the full parent */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Empty state */}
      {elements.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#52525b', gap: '10px', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
          pointerEvents: 'none',
        }}>
          <Info size={28} strokeWidth={1.5} />
          <span>Select a suspect to view their network</span>
        </div>
      )}

      {/* Legend (top-left) — only types present in data */}
      {elements.length > 0 && presentTypes.length > 0 && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 20,
          background: labelBg, backdropFilter: 'blur(10px)',
          border: `1px solid ${subtleBdr}`, borderRadius: '8px',
          padding: isCompact ? '5px 8px' : '7px 11px',
        }}>
          {presentTypes.map(type => {
            const m = getMeta(type);
            return (
              <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: isCompact ? '9px' : '10px', fontWeight: 600, color: m.color, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: type === 'Vehicle' ? '2px' : '50%', background: m.color, flexShrink: 0 }} />
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      {/* +N more badge */}
      {hiddenCount > 0 && (
        <div style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
          background: labelBg, backdropFilter: 'blur(10px)',
          border: `1px solid ${subtleBdr}`, borderRadius: '20px',
          padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px',
          zIndex: 20, fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
          color: '#a1a1aa', whiteSpace: 'nowrap',
        }}>
          <Users size={11} /> +{hiddenCount} more (capped at {MAX_NODES})
        </div>
      )}

      {/* Hover tooltip */}
      {hoverInfo && containerRef.current && (
        <div style={{
          position: 'absolute',
          left: `${Math.min(hoverInfo.x + 16, (containerRef.current.clientWidth || 400) - 155)}px`,
          top:  `${Math.max(hoverInfo.y - 14, 4)}px`,
          background: labelBg, backdropFilter: 'blur(14px)',
          border: `1px solid ${getMeta(hoverInfo.type).border}55`,
          borderLeft: `3px solid ${getMeta(hoverInfo.type).color}`,
          borderRadius: '7px', padding: '6px 10px',
          zIndex: 50, pointerEvents: 'none', minWidth: '100px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: labelFg, fontFamily: 'Inter, sans-serif' }}>{hoverInfo.label}</div>
          <div style={{ fontSize: '9px', color: getMeta(hoverInfo.type).color, fontFamily: 'JetBrains Mono, monospace', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{getMeta(hoverInfo.type).label}</div>
        </div>
      )}

      {/* Selected node panel (bottom-left) */}
      {selectedInfo && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '10px',
          background: labelBg, backdropFilter: 'blur(14px)',
          border: `1px solid ${getMeta(selectedInfo.type).border}55`,
          borderLeft: `3px solid ${getMeta(selectedInfo.type).color}`,
          borderRadius: '8px', padding: '8px 12px', zIndex: 25,
          display: 'flex', flexDirection: 'column', gap: '3px',
          minWidth: '140px', maxWidth: isCompact ? '160px' : '210px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', color: getMeta(selectedInfo.type).color, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
              {getMeta(selectedInfo.type).label}
            </span>
            <button onClick={() => { setSelectedInfo(null); cyRef.current?.elements().unselect(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: 0, display: 'flex' }} title="Dismiss">
              <X size={12} />
            </button>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: labelFg, fontFamily: 'Inter, sans-serif', wordBreak: 'break-word' }}>{selectedInfo.label}</div>
          <div style={{ fontSize: '10px', color: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}>
            {selectedInfo.degree} connection{selectedInfo.degree !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Zoom controls (top-right) */}
      {elements.length > 0 && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '3px', zIndex: 20 }}>
          {[
            { icon: <ZoomIn size={isCompact ? 12 : 13} />,    fn: zoomIn,  title: 'Zoom In'  },
            { icon: <ZoomOut size={isCompact ? 12 : 13} />,   fn: zoomOut, title: 'Zoom Out' },
            { icon: <Maximize2 size={isCompact ? 12 : 13} />, fn: fitAll,  title: 'Fit All'  },
          ].map(({ icon, fn, title }) => (
            <button key={title} onClick={fn} title={title} style={{
              width: isCompact ? '26px' : '28px', height: isCompact ? '26px' : '28px',
              borderRadius: '6px', border: `1px solid ${subtleBdr}`,
              background: labelBg, backdropFilter: 'blur(8px)',
              color: '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = subtleBdr; }}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
