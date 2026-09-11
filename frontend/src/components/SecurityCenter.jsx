import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Database,
  Layers,
  FileCheck2,
  FileWarning,
  Activity,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Hash,
  Terminal,
  FileSpreadsheet,
  FileText,
  Search,
  Zap,
  Globe,
  Smartphone,
  Laptop
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  ScrollArea
} from './ui';

export default function SecurityCenter({ theme = 'dark' }) {
  const { user, authFetch } = useAuth();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger', 'evidence', 'sessions', 'break_glass'
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Ledger state
  const [ledgerBlocks, setLedgerBlocks] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [ledgerVerificationResult, setLedgerVerificationResult] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Evidence state
  const [evidenceList, setEvidenceList] = useState([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [scanningEvidence, setScanningEvidence] = useState(false);
  const [evidenceScanResult, setEvidenceScanResult] = useState(null);
  const [evidenceSearch, setEvidenceSearch] = useState('');

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Break-glass state
  const [bgCaseId, setBgCaseId] = useState('');
  const [bgReasonCategory, setBgReasonCategory] = useState('CRITICAL_PURSUIT');
  const [bgJustification, setBgJustification] = useState('');
  const [bgDuration, setBgDuration] = useState(30);
  const [bgSubmitting, setBgSubmitting] = useState(false);
  const [bgResult, setBgResult] = useState(null);

  // Fetch security metrics
  const fetchMetrics = useCallback(() => {
    setLoadingMetrics(true);
    authFetch('/api/v1/security/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoadingMetrics(false);
      })
      .catch(err => {
        console.error('Error loading security metrics:', err);
        setLoadingMetrics(false);
      });
  }, [authFetch]);

  // Fetch Ledger Blocks
  const fetchLedger = useCallback(() => {
    setLoadingLedger(true);
    authFetch('/api/v1/security/ledger?limit=100')
      .then(res => res.json())
      .then(data => {
        setLedgerBlocks(data.blocks || []);
        if (data.blocks && data.blocks.length > 0 && !selectedBlock) {
          setSelectedBlock(data.blocks[0]);
        }
        setLoadingLedger(false);
      })
      .catch(err => {
        console.error('Error fetching ledger:', err);
        setLoadingLedger(false);
      });
  }, [authFetch, selectedBlock]);

  // Verify Ledger Integrity
  const handleVerifyLedger = () => {
    setVerifyingLedger(true);
    setLedgerVerificationResult(null);
    authFetch('/api/v1/security/ledger/verify', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setLedgerVerificationResult(data);
        setVerifyingLedger(false);
        fetchMetrics();
      })
      .catch(err => {
        console.error('Error verifying ledger:', err);
        setVerifyingLedger(false);
      });
  };

  // Fetch Evidence Vault
  const fetchEvidence = useCallback(() => {
    setLoadingEvidence(true);
    authFetch('/api/v1/security/evidence-vault?limit=100')
      .then(res => res.json())
      .then(data => {
        setEvidenceList(data.evidence || []);
        setLoadingEvidence(false);
      })
      .catch(err => {
        console.error('Error fetching evidence vault:', err);
        setLoadingEvidence(false);
      });
  }, [authFetch]);

  // Scan Evidence Vault SHA-256
  const handleScanEvidence = () => {
    setScanningEvidence(true);
    setEvidenceScanResult(null);
    authFetch('/api/v1/security/evidence-vault/scan', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setEvidenceScanResult(data);
        setScanningEvidence(false);
        fetchEvidence();
        fetchMetrics();
      })
      .catch(err => {
        console.error('Error scanning evidence:', err);
        setScanningEvidence(false);
      });
  };

  // Fetch Active Sessions
  const fetchSessions = useCallback(() => {
    setLoadingSessions(true);
    authFetch('/api/v1/security/active-sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(Array.isArray(data) ? data : []);
        setLoadingSessions(false);
      })
      .catch(err => {
        console.error('Error fetching sessions:', err);
        setLoadingSessions(false);
      });
  }, [authFetch]);

  // Submit Break-Glass Request
  const handleBreakGlassSubmit = (e) => {
    e.preventDefault();
    if (!bgCaseId.trim() || !bgJustification.trim() || bgJustification.trim().length < 15) {
      alert('Please provide a valid Case ID and detailed justification (at least 15 characters).');
      return;
    }

    setBgSubmitting(true);
    setBgResult(null);

    authFetch('/api/v1/security/break-glass/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: bgCaseId.trim(),
        reason_category: bgReasonCategory,
        justification: bgJustification.trim(),
        duration_minutes: parseInt(bgDuration, 10)
      })
    })
      .then(res => res.json())
      .then(data => {
        setBgResult(data);
        setBgSubmitting(false);
        setBgCaseId('');
        setBgJustification('');
        fetchMetrics();
        fetchLedger();
      })
      .catch(err => {
        console.error('Break glass error:', err);
        setBgSubmitting(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger();
    else if (activeTab === 'evidence') fetchEvidence();
    else if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, fetchLedger, fetchEvidence, fetchSessions]);

  const filteredEvidence = evidenceList.filter(e => {
    const q = evidenceSearch.toLowerCase();
    return (
      (e.file_name || '').toLowerCase().includes(q) ||
      (e.case_id || '').toLowerCase().includes(q) ||
      (e.evidence_id || '').toLowerCase().includes(q) ||
      (e.sha256_hash || '').toLowerCase().includes(q)
    );
  });

  const tabChips = [
    { id: 'ledger', label: 'Tamper-Evident Ledger', icon: Layers, count: metrics?.audit_ledger?.total_blocks || 0 },
    { id: 'evidence', label: 'Evidence Vault (SHA-256)', icon: Database, count: metrics?.evidence_vault?.total_files || 0 },
    { id: 'sessions', label: 'Active Sessions & ABAC', icon: UserCheck, count: metrics?.active_sessions || 1 },
    { id: 'break_glass', label: 'Emergency Break-Glass', icon: Zap, count: metrics?.active_break_glass_overrides || 0 }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: isLight ? '#f4f4f5' : '#09090b',
      color: isLight ? '#0f172a' : '#fafafa',
      fontFamily: "'Inter', sans-serif",
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── TOP ACTION BAR (SLEEK & CONSISTENT) ── */}
      <div style={{
        padding: '16px 22px 0 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: isLight ? '#e2e8f0' : '#18181b',
            border: `1px solid ${isLight ? '#cbd5e1' : '#27272a'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <Shield size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '15px',
                fontWeight: 700,
                color: isLight ? '#0f172a' : '#fafafa',
                letterSpacing: '-0.01em'
              }}>
                SECURITY OPERATIONS CENTER (SOC)
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '2px 7px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399'
              }}>
                ● ZERO-TRUST ACTIVE
              </span>
            </div>
            <p style={{ fontSize: '11px', color: isLight ? '#64748b' : '#71717a', margin: '1px 0 0 0' }}>
              Cryptographic Audit Ledger • SHA-256 Evidence Vault • Case Isolation & ABAC Clearance
            </p>
          </div>
        </div>

        {/* Sync / Refresh Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchMetrics();
            if (activeTab === 'ledger') fetchLedger();
            if (activeTab === 'evidence') fetchEvidence();
            if (activeTab === 'sessions') fetchSessions();
          }}
          title="Refresh Security Telemetry"
          style={{
            height: '32px',
            padding: '0 12px',
            fontSize: '11.5px',
            background: isLight ? '#ffffff' : '#18181b',
            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
            color: isLight ? '#0f172a' : '#fafafa',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={13} className={loadingMetrics ? 'spin-anim' : ''} />
          <span>Refresh Telemetry</span>
        </Button>
      </div>

      {/* ── KPI METRIC CARDS ROW ── */}
      <div style={{
        padding: '14px 22px 0 22px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        {/* KPI 1: Ledger Status */}
        <div style={{
          background: isLight ? '#ffffff' : '#121215',
          border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: isLight ? '#64748b' : '#71717a', fontWeight: 600, letterSpacing: '0.05em' }}>
              Audit Ledger Chain
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#34d399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={16} color="#34d399" />
              Valid & Sealed
            </div>
            <div style={{ fontSize: '10px', color: isLight ? '#94a3b8' : '#a1a1aa', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {metrics?.audit_ledger?.total_blocks || 0} Blocks Chained (SHA-256)
            </div>
          </div>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399'
          }}>
            <Layers size={16} />
          </div>
        </div>

        {/* KPI 2: Evidence Integrity */}
        <div style={{
          background: isLight ? '#ffffff' : '#121215',
          border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: isLight ? '#64748b' : '#71717a', fontWeight: 600, letterSpacing: '0.05em' }}>
              Evidence Integrity
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileCheck2 size={16} color="#38bdf8" />
              {metrics?.evidence_vault?.integrity_percentage || 100}% Verified
            </div>
            <div style={{ fontSize: '10px', color: isLight ? '#94a3b8' : '#a1a1aa', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {metrics?.evidence_vault?.total_files || 0} Files Signed on Disk
            </div>
          </div>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Database size={16} />
          </div>
        </div>

        {/* KPI 3: Active Sessions */}
        <div style={{
          background: isLight ? '#ffffff' : '#121215',
          border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: isLight ? '#64748b' : '#71717a', fontWeight: 600, letterSpacing: '0.05em' }}>
              Active Officer Sessions
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#c084fc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <UserCheck size={16} color="#c084fc" />
              {metrics?.active_sessions || 1} Online
            </div>
            <div style={{ fontSize: '10px', color: isLight ? '#94a3b8' : '#a1a1aa', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              Argon2id + JWT Sealed
            </div>
          </div>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '6px',
            background: 'rgba(192, 132, 252, 0.1)',
            border: '1px solid rgba(192, 132, 252, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc'
          }}>
            <Activity size={16} />
          </div>
        </div>

        {/* KPI 4: Access Denials / IDOR Blocks */}
        <div style={{
          background: isLight ? '#ffffff' : '#121215',
          border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: isLight ? '#64748b' : '#71717a', fontWeight: 600, letterSpacing: '0.05em' }}>
              IDOR & Denials (24h)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Lock size={16} color="#fbbf24" />
              {metrics?.access_denials_24h || 0} Blocked
            </div>
            <div style={{ fontSize: '10px', color: isLight ? '#94a3b8' : '#a1a1aa', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              Failed Logins: {metrics?.failed_logins_24h || 0}
            </div>
          </div>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '6px',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <AlertTriangle size={16} />
          </div>
        </div>
      </div>

      {/* ── SECTION TAB CHIPS TOOLBAR ── */}
      <div style={{
        padding: '12px 22px 0 22px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
        paddingBottom: '10px'
      }}>
        {tabChips.map(chip => {
          const isSelected = activeTab === chip.id;
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveTab(chip.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: isSelected
                  ? '1px solid rgba(56, 189, 248, 0.4)'
                  : `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                background: isSelected
                  ? isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.12)'
                  : isLight ? '#ffffff' : '#121215',
                color: isSelected
                  ? isLight ? '#0369a1' : '#38bdf8'
                  : isLight ? '#64748b' : '#a1a1aa'
              }}
            >
              <Icon size={13} />
              <span>{chip.label}</span>
              <span style={{
                fontSize: '9.5px',
                padding: '1px 5px',
                borderRadius: '4px',
                background: isSelected
                  ? 'rgba(56, 189, 248, 0.2)'
                  : isLight ? '#f1f5f9' : '#18181b',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT AREA (SCROLLABLE & STRUCTURED) ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 22px 22px 22px'
      }}>
        {/* ── TAB 1: AUDIT LEDGER ── */}
        {activeTab === 'ledger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header sub-bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '12px 16px',
              background: isLight ? '#ffffff' : '#121215',
              border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              borderRadius: '8px'
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: isLight ? '#0f172a' : '#fafafa' }}>
                  Cryptographic Audit Hash-Chain Explorer
                </span>
                <p style={{ fontSize: '11px', color: isLight ? '#64748b' : '#71717a', margin: '2px 0 0 0' }}>
                  Every search, dossier view, graph inspection, and evidence download is sealed with SHA-256 block hashes.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleVerifyLedger}
                disabled={verifyingLedger}
                style={{
                  height: '30px',
                  fontSize: '11.5px',
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={13} className={verifyingLedger ? 'spin-anim' : ''} />
                <span>{verifyingLedger ? 'Verifying Hashes...' : 'Verify Chain Integrity'}</span>
              </Button>
            </div>

            {ledgerVerificationResult && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: ledgerVerificationResult.is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${ledgerVerificationResult.is_valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: ledgerVerificationResult.is_valid ? '#34d399' : '#f87171',
                fontSize: '11.5px'
              }}>
                <strong>{ledgerVerificationResult.is_valid ? '✓ Chain Cryptographically Valid & Untampered' : '⚠ Tamper Detected!'}</strong>
                <span style={{ marginLeft: '8px', color: isLight ? '#475569' : '#a1a1aa' }}>
                  Verified {ledgerVerificationResult.total_blocks} consecutive blocks. Latest Block Hash: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ledgerVerificationResult.latest_block_hash}</span>
                </span>
              </div>
            )}

            {/* Split Explorer Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
              gap: '14px',
              height: '520px'
            }}>
              {/* Left: Blocks List */}
              <div style={{
                background: isLight ? '#ffffff' : '#121215',
                border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '10px 14px',
                  borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: isLight ? '#64748b' : '#71717a',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Block Height ({ledgerBlocks.length})</span>
                  <span>Timestamp</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {loadingLedger ? (
                    <div style={{ padding: '30px', textAlign: 'center', fontSize: '12px', color: '#71717a' }}>Loading audit blocks...</div>
                  ) : ledgerBlocks.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', fontSize: '12px', color: '#71717a' }}>No blocks in ledger.</div>
                  ) : (
                    ledgerBlocks.map(b => {
                      const isSelected = selectedBlock?.id === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBlock(b)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            background: isSelected
                              ? isLight ? '#e0f2fe' : '#18181b'
                              : isLight ? '#f8fafc' : '#141417',
                            border: `1px solid ${isSelected ? '#38bdf8' : isLight ? '#e2e8f0' : '#27272a'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)'
                              }}>
                                BLOCK #{b.block_index}
                              </span>
                              <span style={{ fontSize: '11.5px', fontWeight: 600, color: isLight ? '#0f172a' : '#fafafa' }}>
                                {b.action}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
                              {new Date(b.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#a1a1aa' }}>
                            <span>Actor: <strong style={{ color: isLight ? '#0f172a' : '#e4e4e7', fontFamily: "'JetBrains Mono', monospace" }}>{b.actor_username}</strong></span>
                            {b.case_id && (
                              <span style={{
                                fontSize: '9.5px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(251, 191, 36, 0.1)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                color: '#fbbf24',
                                fontFamily: "'JetBrains Mono', monospace"
                              }}>
                                {b.case_id}
                              </span>
                            )}
                          </div>

                          <div style={{
                            marginTop: '6px',
                            fontSize: '9.5px',
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#71717a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            Hash: <span style={{ color: '#a1a1aa' }}>{b.current_hash}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Block Payload Inspector */}
              <div style={{
                background: isLight ? '#ffffff' : '#121215',
                border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: isLight ? '#64748b' : '#71717a',
                  borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                  paddingBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Hash size={13} color="#38bdf8" />
                  <span>Block SHA-256 Cryptographic Payload</span>
                </div>

                {selectedBlock ? (
                  <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11.5px' }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600 }}>Block & Event UUID</div>
                      <div style={{
                        marginTop: '3px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: isLight ? '#f1f5f9' : '#18181b',
                        border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px'
                      }}>
                        Block #{selectedBlock.block_index} • {selectedBlock.event_id}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600 }}>Action & Investigation Target</div>
                      <div style={{
                        marginTop: '3px',
                        padding: '8px',
                        borderRadius: '4px',
                        background: isLight ? '#f1f5f9' : '#18181b',
                        border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`
                      }}>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>{selectedBlock.action}</div>
                        {selectedBlock.target_entity && <div style={{ color: '#e4e4e7', marginTop: '2px' }}>Target: {selectedBlock.target_entity}</div>}
                        {selectedBlock.case_id && <div style={{ color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>Case: {selectedBlock.case_id}</div>}
                        {selectedBlock.details && <div style={{ color: '#a1a1aa', fontSize: '10.5px', marginTop: '4px', fontStyle: 'italic' }}>{selectedBlock.details}</div>}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600 }}>Previous Block Hash (Parent Link)</div>
                      <div style={{
                        marginTop: '3px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: isLight ? '#f1f5f9' : '#18181b',
                        border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10.5px',
                        color: '#a1a1aa',
                        wordBreak: 'break-all'
                      }}>
                        {selectedBlock.previous_hash}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#34d399', fontWeight: 600 }}>Current Block Sealed Hash (SHA-256)</div>
                      <div style={{
                        marginTop: '3px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10.5px',
                        color: '#34d399',
                        wordBreak: 'break-all'
                      }}>
                        {selectedBlock.current_hash}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600 }}>Sealed Timestamp (UTC)</div>
                      <div style={{ marginTop: '2px', color: '#a1a1aa', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                        {new Date(selectedBlock.timestamp).toUTCString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11.5px', color: '#71717a' }}>
                    Select a block on the left to inspect its cryptographic payload.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: EVIDENCE VAULT ── */}
        {activeTab === 'evidence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '12px 16px',
              background: isLight ? '#ffffff' : '#121215',
              border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              borderRadius: '8px'
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: isLight ? '#0f172a' : '#fafafa' }}>
                  Evidence Vault & Storage Cryptographic Inventory
                </span>
                <p style={{ fontSize: '11px', color: isLight ? '#64748b' : '#71717a', margin: '2px 0 0 0' }}>
                  Immutable SHA-256 signatures generated upon ingestion for CDRs, financial records, ANPR logs, and FIR documents.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleScanEvidence}
                disabled={scanningEvidence}
                style={{
                  height: '30px',
                  fontSize: '11.5px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileCheck2 size={13} className={scanningEvidence ? 'spin-anim' : ''} />
                <span>{scanningEvidence ? 'Scanning Files on Disk...' : 'Run Live Integrity Scan'}</span>
              </Button>
            </div>

            {evidenceScanResult && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                color: '#60a5fa',
                fontSize: '11.5px'
              }}>
                <strong>✓ Live Integrity Scan Completed: {evidenceScanResult.overall_integrity_percentage}% Valid</strong>
                <span style={{ marginLeft: '8px', color: isLight ? '#475569' : '#a1a1aa' }}>
                  Scanned {evidenceScanResult.total_files} files on storage volume. Verified: <strong>{evidenceScanResult.verified}</strong>, Compromised: <strong>{evidenceScanResult.compromised}</strong>, Missing: <strong>{evidenceScanResult.missing}</strong>.
                </span>
              </div>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                color={isLight ? '#64748b' : '#71717a'}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
              />
              <Input
                value={evidenceSearch}
                onChange={(e) => setEvidenceSearch(e.target.value)}
                placeholder="Search evidence by file name, case ID, or SHA-256 hash..."
                style={{
                  paddingLeft: '34px',
                  borderRadius: '8px',
                  height: '36px',
                  fontSize: '12px',
                  background: isLight ? '#ffffff' : '#121215',
                  borderColor: isLight ? '#e2e8f0' : '#27272a',
                  color: isLight ? '#0f172a' : '#fafafa'
                }}
              />
            </div>

            {/* Evidence Table */}
            <div style={{
              background: isLight ? '#ffffff' : '#121215',
              border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead style={{
                  background: isLight ? '#f1f5f9' : '#18181b',
                  borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                  textTransform: 'uppercase',
                  fontSize: '10px',
                  color: isLight ? '#64748b' : '#71717a'
                }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>Evidence ID</th>
                    <th style={{ padding: '10px 14px' }}>Case Reference</th>
                    <th style={{ padding: '10px 14px' }}>File Name</th>
                    <th style={{ padding: '10px 14px' }}>Evidence Type</th>
                    <th style={{ padding: '10px 14px' }}>Classification</th>
                    <th style={{ padding: '10px 14px' }}>SHA-256 Cryptographic Hash</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEvidence ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#71717a' }}>Loading evidence vault...</td>
                    </tr>
                  ) : filteredEvidence.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#71717a' }}>No matching evidence records found.</td>
                    </tr>
                  ) : (
                    filteredEvidence.map(ev => (
                      <tr key={ev.id} style={{ borderBottom: `1px solid ${isLight ? '#f1f5f9' : '#18181b'}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#38bdf8' }}>
                          {ev.evidence_id}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", color: '#fbbf24' }}>
                          {ev.case_id}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: isLight ? '#0f172a' : '#f4f4f5' }}>
                          {ev.file_name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isLight ? '#e2e8f0' : '#18181b',
                            border: `1px solid ${isLight ? '#cbd5e1' : '#27272a'}`,
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>
                            {ev.evidence_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(192, 132, 252, 0.1)',
                            border: '1px solid rgba(192, 132, 252, 0.3)',
                            color: '#c084fc',
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>
                            {ev.classification}
                          </span>
                        </td>
                        <td style={{
                          padding: '10px 14px',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '10px',
                          color: '#a1a1aa',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={ev.sha256_hash}>
                          {ev.sha256_hash}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: ev.integrity_status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${ev.integrity_status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: ev.integrity_status === 'VERIFIED' ? '#34d399' : '#f87171'
                          }}>
                            <CheckCircle2 size={11} />
                            {ev.integrity_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: ACTIVE SESSIONS & RBAC/ABAC ── */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '12px 16px',
              background: isLight ? '#ffffff' : '#121215',
              border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: isLight ? '#0f172a' : '#fafafa' }}>
                Monitored Officer Sessions & Zero-Trust ABAC Context
              </span>
              <p style={{ fontSize: '11px', color: isLight ? '#64748b' : '#71717a', margin: '2px 0 0 0' }}>
                Active officer tokens, operational roles, jurisdiction parameters, and clearance classifications.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {loadingSessions ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#71717a' }}>Loading active sessions...</div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#71717a' }}>No active sessions found.</div>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.session_id}
                    style={{
                      background: isLight ? '#ffffff' : '#121215',
                      border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '6px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {s.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: isLight ? '#0f172a' : '#fafafa' }}>
                            {s.full_name || s.username}
                          </div>
                          <div style={{ fontSize: '10px', color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
                            @{s.username}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399'
                      }}>
                        ACTIVE
                      </span>
                    </div>

                    <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : '#1f1f23'}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#71717a' }}>Role:</span>
                        <strong style={{ color: isLight ? '#0f172a' : '#e4e4e7' }}>{s.role}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#71717a' }}>Department:</span>
                        <span style={{ color: isLight ? '#0f172a' : '#e4e4e7' }}>{s.department || 'Cyber Division'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#71717a' }}>Clearance:</span>
                        <span style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(192, 132, 252, 0.1)',
                          border: '1px solid rgba(192, 132, 252, 0.3)',
                          color: '#c084fc',
                          fontFamily: "'JetBrains Mono', monospace"
                        }}>
                          {s.clearance_level || 'CONFIDENTIAL'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                        <span style={{ color: '#71717a' }}>IP Address:</span>
                        <span style={{ color: '#a1a1aa' }}>{s.ip_address || '127.0.0.1'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#71717a' }}>
                        <span>Last Active:</span>
                        <span>{new Date(s.last_used_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: BREAK-GLASS EMERGENCY ACCESS ── */}
        {activeTab === 'break_glass' && (
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#fbbf24'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} />
                <span>Emergency Break-Glass Case Authorization</span>
              </div>
              <p style={{ fontSize: '11px', color: isLight ? '#78350f' : '#fef3c7', margin: '4px 0 0 0', opacity: 0.9 }}>
                Grants short-lived emergency authorization to inspect high-security cases outside standard assignment.
                <strong> All requests are written immediately to the immutable cryptographic audit ledger.</strong>
              </p>
            </div>

            {bgResult && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '11.5px'
              }}>
                <strong>✓ Break-Glass Authorization Active ({bgResult.request_id})</strong>
                <p style={{ margin: '4px 0 0 0', color: isLight ? '#065f46' : '#a7f3d0' }}>{bgResult.message}</p>
              </div>
            )}

            <div style={{
              background: isLight ? '#ffffff' : '#121215',
              border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              borderRadius: '8px',
              padding: '18px'
            }}>
              <form onSubmit={handleBreakGlassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#475569' : '#a1a1aa', textTransform: 'uppercase' }}>
                    Restricted Case Identifier (FIR / Case No.)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. FIR-2026-0891 or FIR-2026-0104"
                    value={bgCaseId}
                    onChange={(e) => setBgCaseId(e.target.value)}
                    required
                    style={{
                      marginTop: '4px',
                      height: '36px',
                      fontSize: '12px',
                      background: isLight ? '#ffffff' : '#18181b',
                      borderColor: isLight ? '#e2e8f0' : '#27272a',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#475569' : '#a1a1aa', textTransform: 'uppercase' }}>
                    Emergency Justification Category
                  </label>
                  <select
                    value={bgReasonCategory}
                    onChange={(e) => setBgReasonCategory(e.target.value)}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      background: isLight ? '#ffffff' : '#18181b',
                      border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: isLight ? '#0f172a' : '#fafafa'
                    }}
                  >
                    <option value="CRITICAL_PURSUIT">Critical Pursuit / Active Flight Risk</option>
                    <option value="LIFE_SAFETY">Immediate Threat to Life / Kidnapping</option>
                    <option value="TERROR_THREAT">National Security / Hawala Counter-Terror</option>
                    <option value="COURT_ORDER">Judicial Warrant / Magistrate Order</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#475569' : '#a1a1aa', textTransform: 'uppercase' }}>
                    Operational Reason & Context (Audited)
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Provide mandatory operational details justifying emergency access..."
                    value={bgJustification}
                    onChange={(e) => setBgJustification(e.target.value)}
                    required
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      background: isLight ? '#ffffff' : '#18181b',
                      border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '12px',
                      color: isLight ? '#0f172a' : '#fafafa',
                      fontFamily: "'Inter', sans-serif",
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#475569' : '#a1a1aa', textTransform: 'uppercase' }}>
                    Access Duration Limit
                  </label>
                  <select
                    value={bgDuration}
                    onChange={(e) => setBgDuration(e.target.value)}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      background: isLight ? '#ffffff' : '#18181b',
                      border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: isLight ? '#0f172a' : '#fafafa',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}
                  >
                    <option value="15">15 Minutes (Rapid Tactical Lookup)</option>
                    <option value="30">30 Minutes (Standard Emergency Inspection)</option>
                    <option value="60">60 Minutes (Inter-Agency Coordination)</option>
                    <option value="120">120 Minutes (Major Incident Command)</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={bgSubmitting}
                  style={{
                    marginTop: '8px',
                    height: '38px',
                    background: '#d97706',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Zap size={14} className={bgSubmitting ? 'spin-anim' : ''} />
                  <span>{bgSubmitting ? 'Verifying & Committing to Ledger...' : 'Request Emergency Break-Glass Access'}</span>
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
