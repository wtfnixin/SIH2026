import React, { useState, useMemo } from 'react';
import { Crown, Network, FileText, Search, X, Filter, MapPin, User, ShieldAlert, Award, ChevronRight, Activity, TrendingUp } from 'lucide-react';

const DEFAULT_KINGPINS = [
  { rank: 1, entity_id: 'Hebbal Syndicate Cluster', entity_type: 'Location', pagerank_score: 0.0116, degree: 23 },
  { rank: 2, entity_id: 'MG Road Network', entity_type: 'Location', pagerank_score: 0.0102, degree: 29 },
  { rank: 3, entity_id: 'Rahul Sharma', entity_type: 'Person', pagerank_score: 0.0098, degree: 79 },
  { rank: 4, entity_id: 'FIR-2026-1023', entity_type: 'FIR', pagerank_score: 0.0096, degree: 19 },
  { rank: 5, entity_id: 'Whitefield Hawala Hub', entity_type: 'Location', pagerank_score: 0.0091, degree: 22 },
  { rank: 6, entity_id: 'FIR-2026-1024', entity_type: 'FIR', pagerank_score: 0.0088, degree: 21 },
  { rank: 7, entity_id: 'Vikrant Sharma', entity_type: 'Person', pagerank_score: 0.0084, degree: 34 },
  { rank: 8, entity_id: 'Indiranagar Cell', entity_type: 'Location', pagerank_score: 0.0079, degree: 16 }
];

export default function SyndicateLeaderboard({ 
  kingpins = [], 
  onInspectDossier, 
  onInvestigateGraph,
  isFullPage = true
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const rawList = kingpins && kingpins.length > 0 ? kingpins : DEFAULT_KINGPINS;

  // Filter list by search query and entity type
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      const matchesSearch = !searchQuery || 
        item.entity_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.entity_type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || 
        item.entity_type?.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [rawList, searchQuery, filterType]);

  const maxScore = useMemo(() => {
    if (!rawList || rawList.length === 0) return 0.01;
    const scores = rawList.map(k => typeof k.pagerank_score === 'number' ? k.pagerank_score : parseFloat(k.pagerank_score) || 0);
    return Math.max(...scores, 0.01);
  }, [rawList]);

  return (
    <div className={`syndicate-leaderboard-card glass-card ${isFullPage ? 'syndicate-full-page' : ''}`}>
      {/* Header */}
      <div className="syndicate-header">
        <div className="syndicate-header-left">
          <div className="syndicate-icon-wrap">
            <Crown size={20} color="#fbbf24" />
          </div>
          <div>
            <div className="syndicate-title-row">
              <h3 className="syndicate-title">TOP SYNDICATE BOSSES</h3>
              <span className="pagerank-badge">PageRank Centrality</span>
              <span className="syndicate-count-pill">{rawList.length} Tracked Hubs</span>
            </div>
            <p className="syndicate-sub">High-influence network hubs, leadership hierarchy & multi-tier facilitators</p>
          </div>
        </div>

        {isFullPage && (
          <div className="syndicate-header-metrics">
            <div className="syndicate-metric-chip">
              <span className="chip-label">ALGORITHM</span>
              <span className="chip-val">Neo4j PageRank v2</span>
            </div>
            <div className="syndicate-metric-chip">
              <span className="chip-label">TOP CENTRALITY</span>
              <span className="chip-val text-amber">
                {rawList.length > 0 ? (typeof rawList[0].pagerank_score === 'number' ? rawList[0].pagerank_score.toFixed(4) : rawList[0].pagerank_score) : '0.0116'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar (Search & Entity Type Filter) */}
      <div className="syndicate-controls-bar">
        <div className="syndicate-search-box">
          <Search size={14} color="#a1a1aa" />
          <input
            type="text"
            placeholder="Search syndicate bosses, case FIRs, or location hubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="syndicate-search-clear"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="syndicate-filter-chips">
          <button
            className={`syn-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({rawList.length})
          </button>
          <button
            className={`syn-chip ${filterType === 'person' ? 'active' : ''}`}
            onClick={() => setFilterType('person')}
          >
            <User size={12} />
            <span>Persons ({rawList.filter(k => k.entity_type === 'Person').length})</span>
          </button>
          <button
            className={`syn-chip ${filterType === 'location' ? 'active' : ''}`}
            onClick={() => setFilterType('location')}
          >
            <MapPin size={12} />
            <span>Locations ({rawList.filter(k => k.entity_type === 'Location').length})</span>
          </button>
          <button
            className={`syn-chip ${filterType === 'fir' ? 'active' : ''}`}
            onClick={() => setFilterType('fir')}
          >
            <FileText size={12} />
            <span>FIRs ({rawList.filter(k => k.entity_type === 'FIR').length})</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Cards Grid / List */}
      <div className={`syndicate-list ${isFullPage ? 'syndicate-grid-view' : ''}`}>
        {filteredList.map((kp, index) => {
          const rankNum = kp.rank || index + 1;
          const cleanId = kp.entity_id;
          const numScore = typeof kp.pagerank_score === 'number' ? kp.pagerank_score : parseFloat(kp.pagerank_score) || 0;
          const scoreFormatted = numScore.toFixed(4);
          const links = kp.degree || kp.connection_count || 18;
          const pct = Math.min(100, Math.round((numScore / maxScore) * 100));

          // Highlight styling for Top 3
          let rankClass = 'rank-regular';
          if (rankNum === 1) rankClass = 'rank-gold';
          else if (rankNum === 2) rankClass = 'rank-silver';
          else if (rankNum === 3) rankClass = 'rank-bronze';

          return (
            <div key={kp.entity_id || index} className={`syndicate-item ${rankClass}`}>
              <div className="syndicate-item-top">
                <div className={`syndicate-rank-badge ${rankClass}`}>
                  {rankNum === 1 ? '👑 #1' : `#${rankNum}`}
                </div>
                <div className="syndicate-entity-info">
                  <div className="syndicate-name-row">
                    <span className="syndicate-name" title={cleanId}>
                      {kp.entity_type === 'Location' && '📍 '}
                      {kp.entity_type === 'Person' && '👤 '}
                      {kp.entity_type === 'FIR' && '📄 '}
                      {cleanId}
                    </span>
                    <span className={`syndicate-type-tag tag-${(kp.entity_type || 'default').toLowerCase()}`}>
                      {kp.entity_type || 'Syndicate'}
                    </span>
                  </div>
                  <div className="syndicate-meta-row">
                    <span className="pagerank-score-text">PageRank: <strong>{scoreFormatted}</strong></span>
                    <span className="meta-bullet">•</span>
                    <span className="links-count-text"><strong>{links}</strong> Network Links</span>
                  </div>
                </div>
              </div>

              {/* Progress bar visualizing relative centrality score */}
              <div className="syndicate-score-bar-wrap">
                <div className="syndicate-score-bar" style={{ width: `${pct}%` }} />
              </div>

              {/* Action Buttons */}
              <div className="syndicate-item-actions">
                <button
                  className="syn-btn-dossier"
                  onClick={() => onInspectDossier && onInspectDossier(cleanId)}
                  title="View Forensic Intelligence Dossier"
                >
                  <FileText size={13} />
                  <span>Dossier</span>
                </button>
                <button
                  className="syn-btn-graph"
                  onClick={() => onInvestigateGraph && onInvestigateGraph(cleanId)}
                  title="Investigate Neighborhood in Targeted Graph Canvas"
                >
                  <Network size={13} />
                  <span>Investigate Graph</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="syndicate-empty-state">
            <ShieldAlert size={28} color="#71717a" />
            <p>No syndicate bosses matching "{searchQuery}" in category "{filterType}".</p>
            <button 
              className="syndicate-reset-btn"
              onClick={() => { setSearchQuery(''); setFilterType('all'); }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

