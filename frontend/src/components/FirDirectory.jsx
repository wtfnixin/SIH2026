import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Scale,
  RefreshCw,
  BookOpen,
  User,
  MapPin,
  Network,
  ChevronDown,
  X
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  ScrollArea
} from './ui';

export default function FirDirectory({
  theme = 'dark',
  onOpenDossier,
  onInvestigateGraph
}) {
  const isLight = theme === 'light';

  const [firsData, setFirsData] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [expandedFir, setExpandedFir] = useState(null);
  const [selectedModalFir, setSelectedModalFir] = useState(null);

  const fetchFirs = () => {
    setLoading(true);
    fetch('http://localhost:8000/api/v1/entities/firs?limit=150')
      .then(res => res.json())
      .then(data => {
        setFirsData(data.firs || []);
        setStations(data.stations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching FIR directory:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFirs();
  }, []);

  // Filtered FIRs
  const filteredFirs = useMemo(() => {
    return firsData.filter(f => {
      if (selectedStation !== 'ALL' && !f.police_station?.toLowerCase().includes(selectedStation.toLowerCase())) {
        return false;
      }
      if (selectedStatus !== 'ALL' && !f.status?.toLowerCase().includes(selectedStatus.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== 'ALL' && !f.crime_category?.toLowerCase().includes(categoryFilter.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const firNoMatch = f.fir_no?.toLowerCase().includes(q);
        const psMatch = f.police_station?.toLowerCase().includes(q);
        const catMatch = f.crime_category?.toLowerCase().includes(q);
        const narrativeMatch = f.narrative?.toLowerCase().includes(q);
        const suspectMatch = f.suspects?.some(s => s.toLowerCase().includes(q));
        const vehicleMatch = f.vehicles?.some(v => v.toLowerCase().includes(q));
        const locationMatch = f.locations?.some(l => l.toLowerCase().includes(q));
        const sectionMatch = f.sections?.some(sec => sec.toLowerCase().includes(q));

        return firNoMatch || psMatch || catMatch || narrativeMatch || suspectMatch || vehicleMatch || locationMatch || sectionMatch;
      }
      return true;
    });
  }, [firsData, selectedStation, selectedStatus, categoryFilter, searchQuery]);

  const categoryChips = [
    { label: 'All Cases', value: 'ALL' },
    { label: 'Armed Robbery', value: 'ROBBERY' },
    { label: 'Hawala & Illicit Cash', value: 'HAWALA' },
    { label: 'Cyber Crime', value: 'CYBER' }
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
      {/* ── TOP ACTION BAR (SLEEK, COMPACT & MINIMALIST) ── */}
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
            color: isLight ? '#0f172a' : '#fafafa'
          }}>
            <Scale size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '15px',
                fontWeight: 700,
                color: isLight ? '#0f172a' : '#fafafa',
                letterSpacing: '-0.01em'
              }}>
                STATE POLICE FIR DIRECTORY
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '2px 7px',
                borderRadius: '4px',
                background: isLight ? '#e2e8f0' : '#18181b',
                border: `1px solid ${isLight ? '#cbd5e1' : '#27272a'}`,
                color: isLight ? '#475569' : '#a1a1aa'
              }}>
                {filteredFirs.length} Records
              </span>
            </div>
            <p style={{ fontSize: '11px', color: isLight ? '#64748b' : '#71717a', margin: '1px 0 0 0' }}>
              CCTNS Incident Registry • State Criminal Repository
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchFirs}
          title="Refresh FIR Case Records"
          style={{
            height: '32px',
            padding: '0 12px',
            fontSize: '11.5px',
            background: isLight ? '#ffffff' : '#18181b',
            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
            color: isLight ? '#0f172a' : '#fafafa'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Sync CCTNS</span>
        </Button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS TOOLBAR ── */}
      <div style={{
        padding: '12px 22px 0 22px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* Search Bar */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search
            size={14}
            color={isLight ? '#64748b' : '#71717a'}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FIR No, suspect name, vehicle plate, station, section..."
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

        {/* Station Filter Dropdown */}
        <select
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
          style={{
            background: isLight ? '#ffffff' : '#121215',
            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: isLight ? '#0f172a' : '#fafafa',
            outline: 'none',
            cursor: 'pointer',
            height: '36px'
          }}
        >
          <option value="ALL">All Police Stations</option>
          {stations.map((st, i) => (
            <option key={i} value={st}>{st}</option>
          ))}
        </select>

        {/* Status Filter Dropdown */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            background: isLight ? '#ffffff' : '#121215',
            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: isLight ? '#0f172a' : '#fafafa',
            outline: 'none',
            cursor: 'pointer',
            height: '36px'
          }}
        >
          <option value="ALL">All Case Statuses</option>
          <option value="ACTIVE">Active Investigation</option>
          <option value="CHARGE SHEET">Charge Sheet Filed</option>
        </select>
      </div>

      {/* Category Filter Chips */}
      <div style={{
        padding: '8px 22px 0 22px',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {categoryChips.map((c, i) => {
          const isActive = categoryFilter === c.value;
          return (
            <button
              key={i}
              onClick={() => setCategoryFilter(c.value)}
              style={{
                background: isActive
                  ? (isLight ? '#0f172a' : '#fafafa')
                  : (isLight ? '#ffffff' : '#141418'),
                color: isActive
                  ? (isLight ? '#ffffff' : '#09090b')
                  : (isLight ? '#64748b' : '#a1a1aa'),
                border: `1px solid ${isActive ? (isLight ? '#0f172a' : '#fafafa') : (isLight ? '#e2e8f0' : '#27272a')}`,
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── FIR CARDS SCROLLABLE VIEWPORT ── */}
      <div style={{
        flex: 1,
        padding: '12px 22px 20px 22px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ScrollArea style={{ flex: 1, paddingRight: '4px' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '240px',
              gap: '10px',
              color: isLight ? '#64748b' : '#a1a1aa'
            }}>
              <RefreshCw size={20} className="spin-anim" />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Loading State Police FIR Registry...</span>
            </div>
          ) : filteredFirs.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '240px',
              gap: '8px',
              textAlign: 'center'
            }}>
              <Scale size={36} color={isLight ? '#94a3b8' : '#52525b'} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: isLight ? '#0f172a' : '#fafafa' }}>
                No FIRs Match Your Filters
              </div>
              <p style={{ fontSize: '12px', color: isLight ? '#64748b' : '#71717a', margin: 0 }}>
                Try adjusting your search keyword or resetting the police station filter.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '14px',
              paddingTop: '6px',
              paddingBottom: '24px'
            }}>
              {filteredFirs.map((fir, idx) => {
                const isExpanded = expandedFir === fir.fir_no;
                return (
                  <Card
                    key={fir.fir_no || idx}
                    className="fir-case-card"
                    style={{
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: isLight ? '#ffffff' : '#101013',
                      border: `1px solid ${isLight ? '#e2e8f0' : '#222226'}`
                    }}
                  >
                    {/* Card Header: FIR No, Station/Date & Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isLight ? '#0f172a' : '#fafafa',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.01em'
                        }}>
                          {fir.fir_no}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: isLight ? '#64748b' : '#71717a',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap'
                        }}>
                          <span>{fir.police_station || 'Station'}</span>
                          <span>•</span>
                          <span>{fir.incident_date ? fir.incident_date.replace(/T.*$/, '') : 'Recorded'}</span>
                          {fir.crime_category && (
                            <>
                              <span>•</span>
                              <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 600, color: isLight ? '#475569' : '#a1a1aa' }}>
                                {fir.crime_category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        fontFamily: "'JetBrains Mono', monospace",
                        whiteSpace: 'nowrap',
                        background: fir.status?.includes('CHARGE')
                          ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)')
                          : (isLight ? '#f1f5f9' : '#18181b'),
                        color: fir.status?.includes('CHARGE') ? '#10b981' : (isLight ? '#475569' : '#a1a1aa'),
                        border: `1px solid ${fir.status?.includes('CHARGE') ? 'rgba(16, 185, 129, 0.3)' : (isLight ? '#e2e8f0' : '#27272a')}`
                      }}>
                        {fir.status || 'ACTIVE'}
                      </span>
                    </div>

                    {/* Law Sections & Accused Tags Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {fir.sections?.map((sec, sIdx) => (
                        <span
                          key={sIdx}
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isLight ? '#f1f5f9' : '#18181b',
                            color: isLight ? '#334155' : '#d4d4d8',
                            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`
                          }}
                        >
                          {sec}
                        </span>
                      ))}

                      {fir.suspects?.map((sus, susIdx) => (
                        <button
                          key={susIdx}
                          onClick={() => onOpenDossier && onOpenDossier(sus)}
                          title={`Inspect dossier for ${sus}`}
                          style={{
                            background: isLight ? '#f8fafc' : '#18181b',
                            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                            color: isLight ? '#0f172a' : '#fafafa',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <User size={10} color={isLight ? '#64748b' : '#a1a1aa'} />
                          <span>{sus}</span>
                        </button>
                      ))}

                      {fir.locations?.map((loc, lIdx) => (
                        <span
                          key={lIdx}
                          style={{
                            fontSize: '10px',
                            color: isLight ? '#64748b' : '#71717a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <MapPin size={10} />
                          <span>{loc}</span>
                        </span>
                      ))}

                      {fir.vehicles?.map((veh, vIdx) => (
                        <span
                          key={vIdx}
                          style={{
                            fontSize: '9.5px',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                            color: isLight ? '#2563eb' : '#60a5fa',
                            border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(96,165,250,0.25)'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <span>🚗 {veh}</span>
                        </span>
                      ))}

                      {fir.money_values > 0 && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.12)',
                            color: isLight ? '#b45309' : '#fbbf24',
                            border: `1px solid ${isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.3)'}`
                          }}
                        >
                          ₹{Number(fir.money_values).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Narrative Text */}
                    <div style={{
                      fontSize: '11.5px',
                      lineHeight: '1.5',
                      color: isLight ? '#475569' : '#a1a1aa'
                    }}>
                      <div style={{
                        display: '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'unset' : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {fir.narrative}
                      </div>
                      {fir.narrative && fir.narrative.length > 120 && (
                        <button
                          onClick={() => setExpandedFir(isExpanded ? null : fir.fir_no)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isLight ? '#0284c7' : '#93c5fd',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span>{isExpanded ? 'Less' : 'More'}</span>
                          <ChevronDown size={10} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </button>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '8px',
                      borderTop: `1px solid ${isLight ? '#f1f5f9' : '#1c1c20'}`
                    }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedModalFir(fir)}
                        title="View Full Police Incident Sheet"
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          fontSize: '11px',
                          background: isLight ? '#f1f5f9' : '#18181b',
                          border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                          color: isLight ? '#0f172a' : '#fafafa'
                        }}
                      >
                        <BookOpen size={11} />
                        <span>Case Sheet</span>
                      </Button>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {onInvestigateGraph && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onInvestigateGraph(fir.fir_no)}
                            title="Investigate FIR Linkages on Graph"
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              fontSize: '11px',
                              background: isLight ? '#0f172a' : '#fafafa',
                              border: 'none',
                              color: isLight ? '#ffffff' : '#09090b'
                            }}
                          >
                            <Network size={11} />
                            <span>Case Graph</span>
                          </Button>
                        )}

                        {fir.suspects?.[0] && onOpenDossier && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenDossier(fir.suspects[0])}
                            title={`Open Dossier for ${fir.suspects[0]}`}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              fontSize: '11px',
                              background: isLight ? '#f1f5f9' : '#18181b',
                              border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                              color: isLight ? '#0f172a' : '#fafafa'
                            }}
                          >
                            <User size={11} />
                            <span>Dossier</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── CASE SHEET MODAL (ORIGINAL REPORT VIEWER) ── */}
      {selectedModalFir && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <Card style={{
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: isLight ? '#ffffff' : '#0c0c0e',
            border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Scale size={18} color={isLight ? '#0f172a' : '#fafafa'} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: isLight ? '#0f172a' : '#fafafa' }}>
                    POLICE FIRST INFORMATION REPORT RECORD
                  </div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#71717a' }}>
                    Official CCTNS Incident Filing • State Criminal Archive
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedModalFir(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#64748b' : '#a1a1aa',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <ScrollArea style={{ flex: 1, padding: '20px' }}>
              <div style={{
                border: `1px dashed ${isLight ? '#cbd5e1' : '#27272a'}`,
                borderRadius: '12px',
                padding: '18px',
                background: isLight ? '#f8fafc' : '#121215',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                <div style={{ textAlign: 'center', borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`, paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isLight ? '#0f172a' : '#fafafa', letterSpacing: '0.06em' }}>
                    GOVERNMENT OF KARNATAKA / STATE POLICE DEPARTMENT
                  </div>
                  <div style={{ fontSize: '10.5px', color: isLight ? '#64748b' : '#71717a', marginTop: '2px' }}>
                    FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ color: isLight ? '#64748b' : '#71717a' }}>FIR NUMBER: </span>
                    <strong style={{ color: isLight ? '#0f172a' : '#fafafa' }}>{selectedModalFir.fir_no}</strong>
                  </div>
                  <div>
                    <span style={{ color: isLight ? '#64748b' : '#71717a' }}>POLICE STATION: </span>
                    <strong>{selectedModalFir.police_station}</strong>
                  </div>
                  <div>
                    <span style={{ color: isLight ? '#64748b' : '#71717a' }}>DATE: </span>
                    <strong>{selectedModalFir.incident_date?.replace(/T.*$/, '')}</strong>
                  </div>
                  <div>
                    <span style={{ color: isLight ? '#64748b' : '#71717a' }}>STATUS: </span>
                    <strong style={{ color: '#10b981' }}>{selectedModalFir.status}</strong>
                  </div>
                  {selectedModalFir.money_values > 0 && (
                    <div>
                      <span style={{ color: isLight ? '#64748b' : '#71717a' }}>FINANCIAL VALUE: </span>
                      <strong style={{ color: '#f59e0b' }}>₹{Number(selectedModalFir.money_values).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {selectedModalFir.source_file && (
                    <div>
                      <span style={{ color: isLight ? '#64748b' : '#71717a' }}>SOURCE FILE: </span>
                      <strong>{selectedModalFir.source_file}</strong>
                    </div>
                  )}
                  {selectedModalFir.vehicles?.length > 0 && (
                    <div>
                      <span style={{ color: isLight ? '#64748b' : '#71717a' }}>VEHICLE: </span>
                      <strong style={{ color: isLight ? '#2563eb' : '#60a5fa' }}>{selectedModalFir.vehicles.join(', ')}</strong>
                    </div>
                  )}
                  {(selectedModalFir.organization || selectedModalFir.organizations?.length > 0) && (
                    <div>
                      <span style={{ color: isLight ? '#64748b' : '#71717a' }}>ORGANIZATION: </span>
                      <strong>{selectedModalFir.organization || selectedModalFir.organizations.join(', ')}</strong>
                    </div>
                  )}
                </div>

                {selectedModalFir.evidence && (
                  <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                    <span style={{ color: isLight ? '#64748b' : '#71717a', fontWeight: 600 }}>RECOVERED EVIDENCE: </span>
                    <span style={{ color: isLight ? '#0f172a' : '#fafafa', fontWeight: 600 }}>{selectedModalFir.evidence}</span>
                  </div>
                )}

                {selectedModalFir.reason && (
                  <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                    <span style={{ color: isLight ? '#64748b' : '#71717a', fontWeight: 600 }}>CAUSE / MOTIVE: </span>
                    <span style={{ color: isLight ? '#334155' : '#cbd5e1' }}>{selectedModalFir.reason}</span>
                  </div>
                )}

                <div style={{ fontSize: '11px', marginBottom: '14px' }}>
                  <div style={{ color: isLight ? '#64748b' : '#71717a', marginBottom: '4px' }}>APPLICABLE LAW SECTIONS:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedModalFir.sections?.map((sec, idx) => (
                      <span key={idx} style={{ background: isLight ? '#e2e8f0' : '#18181b', border: `1px solid ${isLight ? '#cbd5e1' : '#27272a'}`, padding: '2px 6px', borderRadius: '4px', color: isLight ? '#0f172a' : '#fafafa' }}>
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`, paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#64748b' : '#71717a', marginBottom: '6px' }}>
                    ORIGINAL INCIDENT NARRATIVE / OFFICER STATEMENT:
                  </div>
                  <div style={{ fontSize: '11.5px', lineHeight: '1.6', color: isLight ? '#1e293b' : '#d4d4d8', whiteSpace: 'pre-wrap' }}>
                    {selectedModalFir.narrative}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedModalFir(null)}
                style={{
                  height: '30px',
                  background: isLight ? '#f1f5f9' : '#18181b',
                  border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                  color: isLight ? '#0f172a' : '#fafafa'
                }}
              >
                Close
              </Button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {onInvestigateGraph && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const firId = selectedModalFir.fir_no;
                      setSelectedModalFir(null);
                      onInvestigateGraph(firId);
                    }}
                    style={{
                      height: '30px',
                      background: isLight ? '#0f172a' : '#fafafa',
                      border: 'none',
                      color: isLight ? '#ffffff' : '#09090b'
                    }}
                  >
                    <Network size={12} />
                    <span>Investigate on Graph</span>
                  </Button>
                )}

                {selectedModalFir.suspects?.[0] && onOpenDossier && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const sus = selectedModalFir.suspects[0];
                      setSelectedModalFir(null);
                      onOpenDossier(sus);
                    }}
                    style={{
                      height: '30px',
                      background: isLight ? '#f1f5f9' : '#18181b',
                      border: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
                      color: isLight ? '#0f172a' : '#fafafa'
                    }}
                  >
                    <User size={12} />
                    <span>Open Suspect Dossier</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
