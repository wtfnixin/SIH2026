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
  Activity,
  Network,
  Lock,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Users,
  Building2,
  Database
} from 'lucide-react';

// ------------------------------------------------------------------
// Animated Counter
// ------------------------------------------------------------------
function AnimatedCounter({ target, duration = 800 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0 || target === null || target === undefined) { 
      setCount(0); 
      return; 
    }
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { 
        setCount(target); 
        clearInterval(timer); 
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count.toLocaleString('en-IN')}</>;
}

// ------------------------------------------------------------------
// Live Clock with IST timezone
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
      {fmt(time.getHours())}:{fmt(time.getMinutes())}:{fmt(time.getSeconds())} <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>IST</span>
    </span>
  );
}

// ------------------------------------------------------------------
// Main Executive Command Dashboard
// ------------------------------------------------------------------
export default function Dashboard({
  criminals = [],
  kingpins = [],
  alertsData = null,
  loading = false,
  onNavigate,
}) {
  const totalEntities = criminals.length;
  const criticalAlerts = alertsData?.critical_count ?? 0;
  const firCount = criminals.reduce((s, c) => s + (c.fir_count || 0), 0) || 30;
  const vehicleCount = criminals.reduce((s, c) => s + (c.vehicle_count || 0), 0);
  const highRiskCount = criminals.filter(
    c => c.threat_level === 'CRITICAL' || c.threat_level === 'HIGH RISK'
  ).length;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const kpis = [
    {
      label: 'Tracked Entities',
      value: totalEntities,
      sub: 'Multi-hop Link Registry',
      icon: Layers,
      iconColor: '#38bdf8',
      iconBg: 'rgba(56,189,248,0.12)',
      trend: '+12% this week',
      danger: false,
    },
    {
      label: 'Active Threat Alerts',
      value: criticalAlerts,
      sub: 'Hawala · Burners · Convoys',
      icon: ShieldAlert,
      iconColor: '#f43f5e',
      iconBg: 'rgba(244,63,94,0.12)',
      trend: 'CRITICAL ATTENTION',
      danger: true,
    },
    {
      label: 'FIR Incident Files',
      value: firCount,
      sub: 'State Police Intercepts',
      icon: Scale,
      iconColor: '#a78bfa',
      iconBg: 'rgba(139,92,246,0.12)',
      trend: 'Unified CCTNS Sync',
      danger: false,
    },
    {
      label: 'ANPR Sightings',
      value: vehicleCount || 68,
      sub: 'Toll & Gantry Sensors',
      icon: Car,
      iconColor: '#34d399',
      iconBg: 'rgba(52,211,153,0.12)',
      trend: 'Live Triangulation',
      danger: false,
    },
    {
      label: 'High-Risk Suspects',
      value: highRiskCount,
      sub: 'Syndicate Operators',
      icon: AlertTriangle,
      iconColor: '#fb923c',
      iconBg: 'rgba(251,146,60,0.12)',
      trend: 'Priority Surveillance',
      danger: true,
    },
  ];

  const primaryModules = [
    {
      key: 'threats',
      icon: ShieldAlert,
      label: 'Live Threat Feed & Syndicates',
      desc: 'Real-time financial anomaly triggers, burner phone collocations, and cross-case syndicate clusters.',
      color: '#f43f5e',
      badge: `${criticalAlerts} Alerts`,
      badgeClass: 'db-badge-critical',
      tag: 'SURVEILLANCE'
    },
    {
      key: 'geo_map',
      icon: MapPin,
      label: 'ANPR Movement & Geospatial GIS',
      desc: 'Interactive toll gantry trajectories, vehicle convoy clustering, and cell-tower radius heatmaps.',
      color: '#06b6d4',
      badge: 'Live Map',
      badgeClass: 'db-badge-live',
      tag: 'GEOSPATIAL'
    },
    {
      key: 'dossiers',
      icon: FileText,
      label: 'Suspect Dossiers & Profiling',
      desc: 'Comprehensive suspect profiles with Hawala financial trails, vehicle logs, and 65B court evidence.',
      color: '#38bdf8',
      badge: `${totalEntities} Profiles`,
      badgeClass: 'db-badge-info',
      tag: 'INVESTIGATION'
    },
    {
      key: 'firs',
      icon: Scale,
      label: 'FIR Incident Directory',
      desc: 'Centralized directory of First Information Reports linked with suspects, IPC sections, and evidence records.',
      color: '#a78bfa',
      badge: `${firCount} Records`,
      badgeClass: 'db-badge-purple',
      tag: 'LEGAL REGISTRY'
    },
    {
      key: 'sathi',
      icon: Bot,
      label: 'Sathi AI Investigation Copilot',
      desc: 'Bilingual AI forensic assistant with voice query analysis, automated graph generation, and hypothesis synthesis.',
      color: '#10b981',
      badge: 'LLaMA-3 Powered',
      badgeClass: 'db-badge-live',
      tag: 'AI COPILOT'
    },
    {
      key: 'security',
      icon: Lock,
      label: 'Zero-Trust Security Center',
      desc: 'Cryptographic SHA-256 evidence vault, Merkle hash-chained audit ledger, and Break-Glass controls.',
      color: '#38bdf8',
      badge: 'Defense-In-Depth',
      badgeClass: 'db-badge-info',
      tag: 'GOVERNANCE'
    }
  ];

  const topKingpins = (kingpins.length > 0 ? kingpins : [
    { name: 'Vikramaditya Singhania', score: 0.0892, role: 'Syndicate Kingpin' },
    { name: 'Sameer Sheikh', score: 0.0654, role: 'Hawala Financier' },
    { name: 'Rajesh Sharma', score: 0.0521, role: 'Logistics Facilitator' },
    { name: 'Karan Malhotra', score: 0.0418, role: 'Border Smuggling Lead' }
  ]).slice(0, 4);

  const renderValue = (val) => {
    if (loading) return <span className="db-kpi-loading">...</span>;
    if (val === null || val === undefined) return <span className="db-kpi-loading">—</span>;
    return <AnimatedCounter target={val} />;
  };

  return (
    <div className="dashboard-page">

      {/* 1. HERO BANNER */}
      <div className="db-hero">
        <div className="db-hero-left">
          <img
            src="/Emblem_of_India_no_text.svg"
            alt="Emblem of India"
            className="db-hero-emblem"
          />
          <div className="db-hero-text">
            <div className="db-hero-ministry">
              Ministry of Home Affairs &bull; Indian Cyber Crime Coordination Centre (I4C)
            </div>
            <h1 className="db-hero-title">Criminal Network Intelligence Command</h1>
            <p className="db-hero-sub">
              Multi-Source Investigation, Entity Resolution & Dynamic Threat Analytics Platform
            </p>
          </div>
        </div>

        <div className="db-hero-right">
          <div className="db-system-pill">
            <div className="db-system-dot" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
          <div className="db-datetime">
            <LiveClock />
            <span className="db-date">{today}</span>
          </div>
        </div>
      </div>

      {/* 2. TOP METRIC CARDS */}
      <div className="db-kpi-strip">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div className="db-kpi-card" key={kpi.label}>
              <div 
                className="db-kpi-icon"
                style={{ background: kpi.iconBg, color: kpi.iconColor }}
              >
                <Icon size={20} />
              </div>
              <div className="db-kpi-body">
                <span className="db-kpi-label">{kpi.label}</span>
                <span className={`db-kpi-value${kpi.danger ? ' db-kpi-danger' : ''}`}>
                  {renderValue(kpi.value)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span className="db-kpi-sub">{kpi.sub}</span>
                  <span style={{ 
                    fontSize: '8.5px', 
                    fontWeight: 700, 
                    color: kpi.danger ? '#f43f5e' : '#38bdf8',
                    fontFamily: 'JetBrains Mono, monospace' 
                  }}>
                    {kpi.trend}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. CORE INTELLIGENCE MODULES (3x2 Balanced Grid) */}
      <div className="db-modules-section">
        <div className="db-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} color="#f59e0b" />
            <span>OPERATIONAL INTELLIGENCE DISPATCH</span>
          </div>
          <div className="db-activity-live-pill">
            <div className="db-system-dot" style={{ width: '5px', height: '5px' }} />
            <span>6 ACTIVE MODULES</span>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '14px' 
        }}>
          {primaryModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.key}
                className="db-module-card"
                style={{ '--mod-color': mod.color }}
                onClick={() => onNavigate && onNavigate(mod.key)}
                title={`Launch ${mod.label}`}
              >
                <div className="db-mod-top">
                  <div 
                    className="db-mod-icon"
                    style={{ background: `${mod.color}15`, color: mod.color, border: `1px solid ${mod.color}30` }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '8.5px', 
                      fontFamily: 'JetBrains Mono, monospace', 
                      color: '#a1a1aa',
                      background: '#18181b',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #27272a'
                    }}>
                      {mod.tag}
                    </span>
                    {mod.badge && (
                      <span className={`db-badge ${mod.badgeClass}`}>{mod.badge}</span>
                    )}
                  </div>
                </div>

                <div className="db-mod-label" style={{ fontSize: '13.5px', marginTop: '2px' }}>
                  {mod.label}
                </div>
                <div className="db-mod-desc" style={{ minHeight: '36px' }}>
                  {mod.desc}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)',
                  marginTop: 'auto'
                }}>
                  <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}>
                    COMMAND ACCESS &rarr;
                  </span>
                  <div className="db-mod-arrow" style={{ opacity: 1, transform: 'none', color: mod.color }}>
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. TACTICAL OVERVIEW TWO-PANEL SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
        
        {/* LEFT PANEL: High Priority Threats & Tactical Highlights */}
        <div style={{ 
          background: 'var(--card)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={15} color="#f43f5e" />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Priority Tactical Alerts
              </span>
            </div>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '10px', padding: '2px 8px' }}
              onClick={() => onNavigate && onNavigate('threats')}
            >
              View All Alerts &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '10px', 
              padding: '10px 12px', 
              background: 'rgba(244,63,94,0.06)', 
              border: '1px solid rgba(244,63,94,0.25)', 
              borderRadius: '6px' 
            }}>
              <AlertTriangle size={16} color="#f43f5e" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#f43f5e' }}>
                    Multi-Account Hawala Smurfing Intercept
                  </span>
                  <span style={{ fontSize: '9px', color: '#a1a1aa', fontFamily: 'JetBrains Mono, monospace' }}>Active</span>
                </div>
                <p style={{ fontSize: '10.5px', color: 'var(--muted-foreground)', margin: '3px 0 0' }}>
                  Coordinated structured financial layer detected across 4 shadow entities totaling ₹84.5 Lakhs.
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '10px', 
              padding: '10px 12px', 
              background: 'rgba(251,146,60,0.06)', 
              border: '1px solid rgba(251,146,60,0.25)', 
              borderRadius: '6px' 
            }}>
              <Car size={16} color="#fb923c" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#fb923c' }}>
                    ANPR Gantry Convoy Collocation
                  </span>
                  <span style={{ fontSize: '9px', color: '#a1a1aa', fontFamily: 'JetBrains Mono, monospace' }}>Toll Toll-4</span>
                </div>
                <p style={{ fontSize: '10.5px', color: 'var(--muted-foreground)', margin: '3px 0 0' }}>
                  Vehicles KA-01-AB-1234 & DL-04-XY-9876 sighted traveling in tight formation within 45 seconds interval.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Top Syndicate Kingpins by PageRank */}
        <div style={{ 
          background: 'var(--card)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={15} color="#38bdf8" />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Top Network Kingpins
              </span>
            </div>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '10px', padding: '2px 8px' }}
              onClick={() => onNavigate && onNavigate('dossiers')}
            >
              Dossiers &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topKingpins.map((kp, idx) => (
              <div 
                key={kp.name || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '4px', 
                    background: '#27272a', 
                    color: '#38bdf8', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{kp.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>{kp.role || 'Syndicate Figure'}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '9px', 
                    color: '#34d399', 
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'rgba(52,211,153,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(52,211,153,0.25)'
                  }}>
                    Score: {typeof kp.score === 'number' ? kp.score.toFixed(4) : '0.0892'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. CLASSIFICATION FOOTER */}
      <div className="db-classification-bar">
        <Shield size={12} />
        <span>RESTRICTED — AUTHORISED LAW ENFORCEMENT ACCESS ONLY — I4C MHA NATIONAL INTELLIGENCE PLATFORM</span>
        <Shield size={12} />
      </div>

    </div>
  );
}
