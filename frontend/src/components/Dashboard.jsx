import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  FileText,
  MapPin,
  Bot,
  Car,
  AlertTriangle,
  Layers,
  Scale,
  ArrowRight,
  Zap,
} from 'lucide-react';

// ------------------------------------------------------------------
// Animated counter (only used with real non-zero values)
// ------------------------------------------------------------------
function AnimatedCounter({ target, duration = 1000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count.toLocaleString('en-IN')}</>;
}

// ------------------------------------------------------------------
// Live clock
// ------------------------------------------------------------------
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n) => String(n).padStart(2, '0');
  return (
    <span className="db-clock">
      {fmt(time.getHours())}:{fmt(time.getMinutes())}:{fmt(time.getSeconds())}
    </span>
  );
}

// ------------------------------------------------------------------
// Main Dashboard — only real data from props, no mock/fallback values
// ------------------------------------------------------------------
export default function Dashboard({
  criminals = [],
  kingpins = [],
  alertsData = null,
  loading = false,
  onNavigate,
}) {
  // Computed entirely from real API data — no hardcoded fallbacks
  const totalEntities = criminals.length;
  const criticalAlerts = alertsData?.critical_count ?? null;
  const firCount = criminals.reduce((s, c) => s + (c.fir_count || 0), 0);
  const vehicleCount = criminals.reduce((s, c) => s + (c.vehicle_count || 0), 0);
  const highRiskCount = criminals.filter(
    c => c.threat_level === 'CRITICAL' || c.threat_level === 'HIGH RISK'
  ).length;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const kpis = [
    {
      label: 'Monitored Entities',
      value: totalEntities,
      sub: 'Persons · Phones · Vehicles',
      icon: Layers,
      iconColor: '#38bdf8',
      iconBg: 'rgba(56,189,248,0.12)',
      danger: false,
    },
    {
      label: 'Active Threat Alerts',
      value: criticalAlerts,
      sub: 'Hawala · Burners · ANPR',
      icon: ShieldAlert,
      iconColor: '#f43f5e',
      iconBg: 'rgba(244,63,94,0.12)',
      danger: true,
    },
    {
      label: 'FIR Cases',
      value: firCount,
      sub: 'Linked to suspects',
      icon: Scale,
      iconColor: '#a78bfa',
      iconBg: 'rgba(139,92,246,0.12)',
      danger: false,
    },
    {
      label: 'Tracked Vehicles',
      value: vehicleCount,
      sub: 'ANPR · FIR linked',
      icon: Car,
      iconColor: '#34d399',
      iconBg: 'rgba(52,211,153,0.12)',
      danger: false,
    },
    {
      label: 'High-Risk Suspects',
      value: highRiskCount,
      sub: 'Critical · High Risk',
      icon: AlertTriangle,
      iconColor: '#fb923c',
      iconBg: 'rgba(251,146,60,0.12)',
      danger: true,
    },
  ];

  const modules = [
    {
      key: 'threats',
      icon: ShieldAlert,
      label: 'Live Threat Feed',
      desc: 'Real-time criminal intelligence alerts and syndicate activity',
      color: '#f43f5e',
      badge: criticalAlerts !== null ? criticalAlerts + ' Active' : null,
      badgeClass: 'db-badge-critical',
    },
    {
      key: 'geo_map',
      icon: MapPin,
      label: 'ANPR Movement Map',
      desc: 'Geospatial vehicle trajectory and toll-post surveillance',
      color: '#06b6d4',
      badge: null,
      badgeClass: '',
    },
    {
      key: 'dossiers',
      icon: FileText,
      label: 'Suspect Dossiers',
      desc: 'Full forensic profiles with connection graph and FIR linkage',
      color: '#38bdf8',
      badge: totalEntities > 0 ? totalEntities + ' Suspects' : null,
      badgeClass: 'db-badge-info',
    },
    {
      key: 'firs',
      icon: Scale,
      label: 'FIR Directory',
      desc: 'Centralised FIR registry across all state police forces',
      color: '#8b5cf6',
      badge: firCount > 0 ? firCount + ' FIRs' : null,
      badgeClass: 'db-badge-purple',
    },
    {
      key: 'sathi',
      icon: Bot,
      label: 'Sathi AI Copilot',
      desc: 'AI-powered investigation assistant and pattern analyser',
      color: '#34d399',
      badge: null,
      badgeClass: '',
    },
  ];

  const renderValue = (val) => {
    if (loading) return <span className="db-kpi-loading">...</span>;
    if (val === null || val === undefined) return <span className="db-kpi-loading">—</span>;
    return <AnimatedCounter target={val} />;
  };

  return (
    <div className="dashboard-page">

      {/* HERO HEADER */}
      <div className="db-hero">
        <div className="db-hero-left">
          <img
            src="/Emblem_of_India_no_text.svg"
            alt="Emblem of India"
            className="db-hero-emblem"
          />
          <div className="db-hero-text">
            <div className="db-hero-ministry">Ministry of Home Affairs  |  I4C  |  Government of India</div>
            <h1 className="db-hero-title">Criminal Network Intelligence System</h1>
            <p className="db-hero-sub">National Cyber Crime Coordination Centre — Executive Command Dashboard</p>
          </div>
        </div>
        <div className="db-hero-right">
          <div className="db-datetime">
            <LiveClock />
            <span className="db-date">{today}</span>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="db-kpi-strip">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div className="db-kpi-card" key={kpi.label}>
              <div className="db-kpi-icon">
                <Icon size={20} />
              </div>
              <div className="db-kpi-body">
                <span className="db-kpi-label">{kpi.label}</span>
                <span className={`db-kpi-value${kpi.danger ? ' db-kpi-danger' : ''}`}>
                  {renderValue(kpi.value)}
                </span>
                <span className="db-kpi-sub">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODULE GRID — full width, no fake activity panel */}
      <div className="db-modules-section">
        <div className="db-section-header">
          <Zap size={14} />
          <span>Intelligence Modules</span>
        </div>
        <div className="db-modules-grid db-modules-grid--wide">
          {modules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.key}
                className="db-module-card"
                style={{ '--mod-color': mod.color }}
                onClick={() => onNavigate && onNavigate(mod.key)}
                title={'Open ' + mod.label}
              >
                <div className="db-mod-top">
                  <div className="db-mod-icon">
                    <Icon size={19} />
                  </div>
                  {mod.badge && (
                    <span className={'db-badge ' + mod.badgeClass}>{mod.badge}</span>
                  )}
                </div>
                <div className="db-mod-label">{mod.label}</div>
                <div className="db-mod-desc">{mod.desc}</div>
                <div className="db-mod-arrow">
                  <ArrowRight size={14} />
                  <span>Open Module</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CLASSIFICATION FOOTER */}
      <div className="db-classification-bar">
        <Shield size={12} />
        <span>RESTRICTED — AUTHORISED PERSONNEL ONLY — I4C NATIONAL SECURITY SYSTEM — GOVERNMENT OF INDIA</span>
        <Shield size={12} />
      </div>

    </div>
  );
}
