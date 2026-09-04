import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, Shield, User, Phone, Car, MapPin, FileText } from 'lucide-react';

export default function NetworkGraph({ elements, onSelectNode }) {
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
            'font-size': '11px',
            'font-weight': '600',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-color': 'rgba(15, 23, 42, 0.85)',
            'text-background-opacity': 1,
            'text-background-padding': '4px',
            'text-border-radius': '4px',
            'background-color': '#00f2fe',
            'width': '42px',
            'height': '42px',
            'border-width': '3px',
            'border-color': '#ffffff',
            'border-opacity': 0.8,
            'shadow-blur': 15,
            'shadow-color': '#00f2fe',
            'shadow-opacity': 0.6
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
            'background-color': '#10b981',
            'border-color': '#34d399',
            'shadow-color': '#10b981'
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
            'arrow-scale': 1.2,
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'font-family': 'JetBrains Mono, monospace',
            'color': '#94a3b8',
            'text-rotation': 'autorotate',
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.9,
            'text-background-padding': '3px'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': '5px',
            'border-color': '#00f2fe',
            'width': '50px',
            'height': '50px',
            'shadow-blur': 25,
            'shadow-color': '#00f2fe',
            'shadow-opacity': 1
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        refresh: 20,
        fit: true,
        padding: 50,
        nodeRepulsion: 8000,
        idealEdgeLength: 100
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
  }, [elements]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const resetFit = () => cyRef.current?.fit();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={containerRef} id="cy" />

      {/* Top Floating Controls & Legend */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        display: 'flex',
        gap: '12px',
        zIndex: 20
      }}>
        {/* Entity Color Legend */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          fontSize: '11px',
          fontWeight: 600
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4b4b', boxShadow: '0 0 8px #ff4b4b' }} /> Suspect
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffb703', boxShadow: '0 0 8px #ffb703' }} /> Phone
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} /> Vehicle
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} /> Location
          </span>
        </div>
      </div>

      {/* Floating Canvas Controls */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 20
      }}>
        <button onClick={zoomIn} className="btn-secondary" title="Zoom In"><ZoomIn size={16} /></button>
        <button onClick={zoomOut} className="btn-secondary" title="Zoom Out"><ZoomOut size={16} /></button>
        <button onClick={resetFit} className="btn-secondary" title="Reset Fit"><Maximize2 size={16} /></button>
      </div>
    </div>
  );
}
