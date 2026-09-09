import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, Shield, User, Phone, Car, MapPin, FileText } from 'lucide-react';

export default function NetworkGraph({ elements = [], onSelectNode, selectedEntityId, isCompact = false }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cyElements = elements.map(el => {
      if (el.data.source && el.data.target) {
        return {
          group: 'edges',
          data: {
            id: `${el.data.source}-${el.data.target}`,
            source: el.data.source,
            target: el.data.target,
            label: el.data.relationship
          }
        };
      }
      return {
        group: 'nodes',
        data: {
          id: el.data.id,
          label: el.data.label,
          node_type: el.data.node_type
        }
      };
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': isCompact ? '9px' : '11px',
            'font-weight': '600',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-background-color': 'rgba(15, 23, 42, 0.85)',
            'text-background-opacity': 1,
            'text-background-padding': '3px',
            'text-border-radius': '4px',
            'background-color': '#ffffff',
            'width': isCompact ? '32px' : '42px',
            'height': isCompact ? '32px' : '42px',
            'border-width': '2px',
            'border-color': '#ffffff',
            'border-opacity': 0.8,
            'shadow-blur': 12,
            'shadow-color': '#ffffff',
            'shadow-opacity': 0.4
          }
        },
        {
          selector: 'node[node_type = "Person"]',
          style: {
            'background-color': '#ff4b4b',
            'border-color': '#ff7676',
            'shadow-color': '#ff4b4b'
          }
        },
        {
          selector: 'node[node_type = "Phone"]',
          style: {
            'background-color': '#ffb703',
            'border-color': '#ffd166',
            'shadow-color': '#ffb703'
          }
        },
        {
          selector: 'node[node_type = "Vehicle"]',
          style: {
            'background-color': '#38bdf8',
            'border-color': '#7dd3fc',
            'shadow-color': '#38bdf8'
          }
        },
        {
          selector: 'node[node_type = "Location"]',
          style: {
            'background-color': '#a855f7',
            'border-color': '#c084fc',
            'shadow-color': '#a855f7'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': 'rgba(148, 163, 184, 0.35)',
            'target-arrow-color': 'rgba(148, 163, 184, 0.5)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': isCompact ? 0.9 : 1.2,
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': isCompact ? '8px' : '10px',
            'font-family': 'JetBrains Mono, monospace',
            'color': '#cbd5e1',
            'text-rotation': 'autorotate',
            'text-background-color': '#09090b',
            'text-background-opacity': 0.9,
            'text-background-padding': '2px'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': '4px',
            'border-color': '#ffffff',
            'width': isCompact ? '38px' : '50px',
            'height': isCompact ? '38px' : '50px',
            'shadow-blur': 22,
            'shadow-color': '#ffffff',
            'shadow-opacity': 0.9
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 700,
        refresh: 20,
        fit: true,
        padding: isCompact ? 25 : 50,
        nodeRepulsion: isCompact ? 4000 : 8000,
        idealEdgeLength: isCompact ? 60 : 100
      }
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNodeInfo({ id: node.data('id'), type: node.data('node_type') });
      if (onSelectNode) {
        onSelectNode(node.data('id'), node.data('node_type'));
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [elements, isCompact]);

  // Handle ResizeObserver to keep canvas sharp on floating window drag/resize
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Center on selectedEntityId when changed
  useEffect(() => {
    if (!cyRef.current || !selectedEntityId) return;
    const node = cyRef.current.getElementById(selectedEntityId);
    if (node && node.length > 0) {
      cyRef.current.elements().unselect();
      node.select();
      cyRef.current.animate({
        center: { eles: node },
        zoom: isCompact ? 1.4 : 1.8,
        duration: 500
      });
    }
  }, [selectedEntityId, isCompact]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const resetFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, isCompact ? 25 : 50);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden' }}>
      <div ref={containerRef} id="cy" />

      {/* Top Floating Controls & Legend */}
      <div style={{
        position: 'absolute',
        top: isCompact ? '8px' : '14px',
        left: isCompact ? '8px' : '14px',
        display: 'flex',
        gap: '8px',
        zIndex: 20
      }}>
        {/* Entity Color Legend */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: isCompact ? '4px 8px' : '6px 12px',
          display: 'flex',
          gap: isCompact ? '8px' : '12px',
          alignItems: 'center',
          fontSize: isCompact ? '9px' : '11px',
          fontWeight: 600
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4b4b', boxShadow: '0 0 6px #ff4b4b' }} /> Suspect
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffb703', boxShadow: '0 0 6px #ffb703' }} /> Phone
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7dd3fc' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} /> Vehicle
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} /> Location
          </span>
        </div>
      </div>

      {/* Floating Canvas Controls */}
      <div style={{
        position: 'absolute',
        bottom: isCompact ? '8px' : '14px',
        right: isCompact ? '8px' : '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 20
      }}>
        <button onClick={zoomIn} className="btn-secondary" style={{ padding: isCompact ? '5px' : '7px' }} title="Zoom In">
          <ZoomIn size={isCompact ? 13 : 15} />
        </button>
        <button onClick={zoomOut} className="btn-secondary" style={{ padding: isCompact ? '5px' : '7px' }} title="Zoom Out">
          <ZoomOut size={isCompact ? 13 : 15} />
        </button>
        <button onClick={resetFit} className="btn-secondary" style={{ padding: isCompact ? '5px' : '7px' }} title="Reset Fit">
          <Maximize2 size={isCompact ? 13 : 15} />
        </button>
      </div>
    </div>
  );
}
