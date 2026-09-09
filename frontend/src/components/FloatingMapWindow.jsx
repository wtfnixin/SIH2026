import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal, Maximize2, Minimize2, RotateCcw, Minus, Network } from 'lucide-react';
import NetworkGraph from './NetworkGraph';

export default function FloatingMapWindow({
  elements = [],
  onSelectNode,
  selectedEntityId
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState(null); // null = docked at bottom right
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const windowRef = useRef(null);

  // Count nodes in graph
  const nodeCount = elements.filter(el => !el.data.source).length;
  const edgeCount = elements.filter(el => el.data.source && el.data.target).length;

  // Handle Dragging
  const handlePointerDown = (e) => {
    if (isMaximized || isMinimized) return;
    // Don't drag if clicking buttons inside header
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

    // If currently docked, convert to explicit x,y coordinates
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
    const width = 450;
    const height = 330;
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
        <Network size={16} color="#ffffff" />
        <span className="pill-text">Network Map ({nodeCount} Nodes)</span>
        <div className="pill-expand-icon">
          <Maximize2 size={13} color="#94a3b8" />
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
        width: '450px',
        height: '330px',
        zIndex: 850
      };
    }

    // Default docked at bottom-right
    return {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      width: '450px',
      height: '330px',
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
          {!isMaximized && <GripHorizontal size={16} className="drag-grip-icon" />}
          <div className="status-indicator">
            <span className="live-pulse-dot" />
            <span className="title-text">NETWORK TOPOLOGY MAP</span>
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
        </div>
      </div>

      {/* Embedded Cytoscape Graph Canvas */}
      <div className="floating-map-body">
        <NetworkGraph
          elements={elements}
          onSelectNode={onSelectNode}
          selectedEntityId={selectedEntityId}
          isCompact={!isMaximized}
        />
      </div>
    </div>
  );
}
