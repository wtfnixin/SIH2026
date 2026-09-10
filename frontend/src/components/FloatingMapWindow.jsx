import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GripHorizontal, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Minus, 
  Network, 
  X, 
  ExternalLink 
} from 'lucide-react';
import NetworkGraph from './NetworkGraph';

export default function FloatingMapWindow({
  isOpen = true,
  onClose,
  targetEntity = null,
  elements = [],
  onSelectNode,
  selectedEntityId,
  onOpenDossier,
  isMinimized: propMinimized,
  setIsMinimized: propSetMinimized
}) {
  const [localMinimized, setLocalMinimized] = useState(false);
  const isMinimized = propMinimized !== undefined ? propMinimized : localMinimized;
  const setIsMinimized = propSetMinimized !== undefined ? propSetMinimized : setLocalMinimized;

  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState(null); // null = docked at bottom right
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const windowRef = useRef(null);

  // Ego network data for targetEntity
  const [egoData, setEgoData] = useState(null);
  const [loadingEgo, setLoadingEgo] = useState(false);

  // Fetch ego network when targetEntity changes
  useEffect(() => {
    if (!targetEntity) {
      setEgoData(null);
      return;
    }
    setLoadingEgo(true);
    fetch(`http://localhost:8000/api/v1/graph/dossier-network/${encodeURIComponent(targetEntity)}`)
      .then(res => {
        if (!res.ok) throw new Error('Ego network error');
        return res.json();
      })
      .then(data => {
        setEgoData(data);
        setLoadingEgo(false);
      })
      .catch(err => {
        console.warn('Ego network fallback:', err);
        setEgoData(null);
        setLoadingEgo(false);
      });
  }, [targetEntity]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Active elements: use specific ego network if available, otherwise global elements
  const activeElements = (egoData && egoData.elements && egoData.elements.length > 0)
    ? egoData.elements
    : elements;

  // Count nodes in graph
  const nodeCount = activeElements.filter(el => !el.data.source).length;
  const edgeCount = activeElements.filter(el => el.data.source && el.data.target).length;

  // Handle Dragging
  const handlePointerDown = (e) => {
    if (isMaximized || isMinimized) return;
    if (e.target.closest('button')) return;

    e.preventDefault();
    const rect = windowRef.current ? windowRef.current.getBoundingClientRect() : null;
    if (!rect) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: rect.left,
      startPosY: rect.top
    };

    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }

    setIsDragging(true);
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const newX = dragRef.current.startPosX + deltaX;
    const newY = dragRef.current.startPosY + deltaY;

    // Bounds checking to stay within viewport
    const width = 480;
    const height = 360;
    const clampedX = Math.max(12, Math.min(window.innerWidth - width - 12, newX));
    const clampedY = Math.max(70, Math.min(window.innerHeight - height - 12, newY));

    setPosition({ x: clampedX, y: clampedY });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Reset to default docked bottom-right position
  const resetPosition = () => {
    setPosition(null);
  };

  // If minimized, display a sleek compact floating trigger pill at bottom-right
  if (isMinimized) {
    return (
      <div
        className="floating-map-pill"
        onClick={() => setIsMinimized(false)}
        title="Restore Network Graph Map"
      >
        <span className="live-pulse-dot" />
        <Network size={16} color="#38bdf8" />
        <span className="pill-text">
          {targetEntity ? `${targetEntity} Map` : 'Network Map'} ({nodeCount} Nodes)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <div className="pill-expand-icon" title="Expand Map">
            <Maximize2 size={12} color="#a1a1aa" />
          </div>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="control-btn control-btn-close"
              style={{ width: '22px', height: '22px', border: 'none', background: 'transparent' }}
              title="Close Graph Window (Esc)"
              aria-label="Close graph window"
            >
              <X size={13} color="#a1a1aa" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Determine window positioning style
  const getWindowStyle = () => {
    if (isMaximized) {
      return {
        position: 'fixed',
        top: '76px',
        left: '20px',
        right: '20px',
        bottom: '20px',
        width: 'auto',
        height: 'auto',
        zIndex: 900
      };
    }

    if (position) {
      return {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '480px',
        height: '360px',
        zIndex: 850
      };
    }

    // Default docked at bottom-right
    return {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      width: '480px',
      height: '360px',
      zIndex: 850
    };
  };

  return (
    <div
      ref={windowRef}
      style={getWindowStyle()}
      className={`floating-map-container ${isMaximized ? 'maximized' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
      {/* Draggable Header Bar */}
      <div
        className="floating-map-header"
        onPointerDown={handlePointerDown}
        style={{ cursor: isMaximized ? 'default' : 'grab' }}
      >
        <div className="floating-map-title">
          {!isMaximized && <GripHorizontal size={15} className="drag-grip-icon" />}
          <div className="status-indicator">
            <span className="live-pulse-dot" />
            <span className="title-text">
              {targetEntity ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>MAP:</span>
                  <span className="floating-target-tag" title={targetEntity}>{targetEntity}</span>
                </span>
              ) : (
                'NETWORK TOPOLOGY'
              )}
            </span>
          </div>
          <span className="node-badge">
            {nodeCount} Nodes • {edgeCount} Edges
          </span>
        </div>

        {/* Window Controls */}
        <div className="floating-map-controls">
          {position && !isMaximized && (
            <button
              onClick={resetPosition}
              className="control-btn"
              title="Dock to Bottom-Right"
            >
              <RotateCcw size={13} />
            </button>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="control-btn"
            title={isMaximized ? 'Restore Window Size' : 'Maximize Map'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {!isMaximized && (
            <button
              onClick={() => setIsMinimized(true)}
              className="control-btn"
              title="Minimize Map"
            >
              <Minus size={13} />
            </button>
          )}

          {onClose && (
            <button
              id="close-floating-map-btn"
              onClick={onClose}
              className="control-btn control-btn-close"
              title="Close Graph Window (Esc)"
              aria-label="Close graph window"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Embedded Cytoscape Graph Canvas */}
      <div className="floating-map-body">
        <NetworkGraph
          elements={activeElements}
          onSelectNode={onSelectNode}
          selectedEntityId={selectedEntityId || targetEntity}
          isCompact={!isMaximized}
          targetEntityId={targetEntity}
          isDark={true}
        />
      </div>

      {/* Relevant Information Bar at the Bottom */}
      <div className="floating-map-infobar">
        <div className="infobar-left">
          <span className="infobar-label">FOCUS:</span>
          <span className="infobar-value" title={selectedEntityId || targetEntity || 'Network'}>
            {selectedEntityId || targetEntity || 'Global Network'}
          </span>
          {egoData?.breakdown && (
            <span className="infobar-stats">
              • {egoData.breakdown.total_connections} links • {egoData.breakdown.fir_count || 0} FIRs • {egoData.breakdown.vehicle_count || 0} veh
            </span>
          )}
        </div>
        {selectedEntityId && onOpenDossier && (
          <button
            className="infobar-inspect-btn"
            onClick={() => onOpenDossier(selectedEntityId)}
            title={`Open dossier for ${selectedEntityId}`}
          >
            <span>Dossier</span>
            <ExternalLink size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
