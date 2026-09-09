import React, { useEffect, useState } from 'react';
import { X, User, Phone, Car, MapPin, FileText, Share2 } from 'lucide-react';

export default function EntityDossierModal({ entityId, onClose }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/v1/entities/dossier/${encodeURIComponent(entityId)}`)
      .then(res => res.json())
      .then(data => {
        setDossier(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Dossier fetch error:', err);
        setLoading(false);
      });
  }, [entityId]);

  if (!entityId) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <User size={18} />
            </div>
            <div>
              <h2 className="modal-title">{entityId}</h2>
              <p className="modal-subtitle">
                {dossier?.entity_type || 'SUSPECT ENTITY DOSSIER'} • CRIMINAL PROFILE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            title="Close Dossier"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="modal-body">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-emerald-400 space-x-2">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Fetching Criminal Intelligence Dossier...</span>
            </div>
          ) : (
            <>
              {/* Profile Statistics Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Connections</span>
                  <span className="text-xl font-bold text-emerald-400">{dossier?.total_connections || 0}</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Threat Classification</span>
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full inline-block mt-1">HIGH RISK</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Graph Status</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1">RESOLVED</span>
                </div>
              </div>

              {/* Connected Evidence List */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center">
                  <Share2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Connected Evidence Network ({dossier?.connected_evidence?.length || 0})
                </h3>
                <div className="space-y-2">
                  {dossier?.connected_evidence?.map((conn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-white/5 hover:border-emerald-500/30 transition text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        {conn.connected_type === 'Phone' && <Phone className="w-4 h-4 text-amber-400" />}
                        {conn.connected_type === 'Vehicle' && <Car className="w-4 h-4 text-emerald-400" />}
                        {conn.connected_type === 'Location' && <MapPin className="w-4 h-4 text-purple-400" />}
                        {conn.connected_type === 'FIR' && <FileText className="w-4 h-4 text-red-400" />}
                        <span className="font-mono text-slate-200">{conn.connected_entity}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 rounded-md border border-white/5">
                        {conn.relationship}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
