import React from 'react';
import { Layers, ShieldAlert, Crown, Activity, Database, CheckCircle } from 'lucide-react';

export default function OperationalKpis({ monitoredCount = 540, alertsCount = 9, syndicatesCount = 4 }) {
  return (
    <div className="operational-kpi-row">
      {/* KPI 1: Monitored Entities */}
      <div className="op-kpi-card op-kpi-entities">
        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
          <Layers size={18} />
        </div>
        <div className="op-kpi-content">
          <span className="op-kpi-title">MONITORED ENTITIES</span>
          <div className="op-kpi-val-row">
            <span className="op-kpi-number">{monitoredCount}</span>
            <span className="op-kpi-pill pill-blue">Targets</span>
          </div>
          <span className="op-kpi-sub">Phones, Persons, Vehicles & Locations</span>
        </div>
      </div>

      {/* KPI 2: Active Threat Alerts */}
      <div className="op-kpi-card op-kpi-threats">
        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' }}>
          <ShieldAlert size={18} />
        </div>
        <div className="op-kpi-content">
          <span className="op-kpi-title">ACTIVE THREAT ALERTS</span>
          <div className="op-kpi-val-row">
            <span className="op-kpi-number">{alertsCount}</span>
            <span className="op-kpi-pill pill-rose">Critical Threats</span>
          </div>
          <span className="op-kpi-sub">Hawala Smurfing, Burners & Convoys</span>
        </div>
      </div>

      {/* KPI 3: Identified Syndicates */}
      <div className="op-kpi-card op-kpi-syndicates">
        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}>
          <Crown size={18} />
        </div>
        <div className="op-kpi-content">
          <span className="op-kpi-title">CRIME SYNDICATES</span>
          <div className="op-kpi-val-row">
            <span className="op-kpi-number">{syndicatesCount}</span>
            <span className="op-kpi-pill pill-amber">Active Modules</span>
          </div>
          <span className="op-kpi-sub">PageRank Centrality Clusters</span>
        </div>
      </div>

      {/* KPI 4: System Health */}
      <div className="op-kpi-card op-kpi-health">
        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
          <Activity size={18} />
        </div>
        <div className="op-kpi-content">
          <span className="op-kpi-title">SYSTEM HEALTH</span>
          <div className="op-kpi-val-row">
            <span className="op-kpi-status-text">
              <span className="live-pulse-dot" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
              Neo4j & Postgres Online
            </span>
          </div>
          <span className="op-kpi-sub">GDS Graph Engine • API Healthy</span>
        </div>
      </div>
    </div>
  );
}
