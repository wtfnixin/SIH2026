import React from 'react';
import { FileSpreadsheet, CheckCircle2, Clock, UploadCloud, Database, ShieldCheck } from 'lucide-react';

const RECENT_INGESTIONS = [
  {
    fileName: 'calls.csv',
    recordCount: '4,469 records',
    sourceType: 'Burner CDR & Cell Tower Telemetry',
    status: 'ANALYZED',
    timestamp: '12 mins ago'
  },
  {
    fileName: 'transactions.csv',
    recordCount: '2,500 records',
    sourceType: 'Banking UPI & Hawala Intercepts',
    status: 'ANALYZED',
    timestamp: '28 mins ago'
  },
  {
    fileName: 'vehicle_sightings.csv',
    recordCount: '3,120 records',
    sourceType: 'ANPR Toll Gantry Camera Logs',
    status: 'ANALYZED',
    timestamp: '1 hour ago'
  },
  {
    fileName: 'fir_records.json',
    recordCount: '12 police cases',
    sourceType: 'State Police NCR FIR Citations',
    status: 'LINKED',
    timestamp: '2 hours ago'
  }
];

export default function AuditLoggerPanel({ onOpenUpload }) {
  return (
    <div className="audit-logger-panel glass-card">
      <div className="audit-panel-header">
        <div className="audit-header-left">
          <FileSpreadsheet size={16} color="#38bdf8" />
          <div>
            <span className="audit-panel-title">EVIDENCE INGESTION AUDIT LOGGER</span>
            <span className="audit-panel-sub">Live provenance audit trail of parsed forensic feeds</span>
          </div>
        </div>
        <div className="audit-header-right">
          <div className="audit-sync-pill">
            <span className="live-pulse-dot" style={{ background: '#34d399', width: '6px', height: '6px' }} />
            <span>PostgreSQL & Neo4j Ingestion Pipeline Synced</span>
          </div>
          {onOpenUpload && (
            <button className="audit-ingest-btn" onClick={onOpenUpload}>
              <UploadCloud size={13} />
              <span>+ Ingest Evidence</span>
            </button>
          )}
        </div>
      </div>

      <div className="audit-files-grid">
        {RECENT_INGESTIONS.map((file, idx) => (
          <div key={idx} className="audit-file-card">
            <div className="audit-file-top">
              <span className="audit-file-icon">📄</span>
              <div className="audit-file-details">
                <span className="audit-filename">{file.fileName}</span>
                <span className="audit-file-count">{file.recordCount}</span>
              </div>
              <span className="audit-status-badge">
                <CheckCircle2 size={10} color="#34d399" />
                {file.status}
              </span>
            </div>
            <div className="audit-file-bottom">
              <span className="audit-source-type">{file.sourceType}</span>
              <span className="audit-time">
                <Clock size={10} /> {file.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
