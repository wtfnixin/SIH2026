import React, { useState } from 'react';
import { Upload, X, CheckCircle, FileText } from 'lucide-react';

export default function FileUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/v1/ingest/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResult(data);
      setUploading(false);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel-glow rounded-2xl p-6 overflow-hidden shadow-2xl border border-cyan-500/30">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Ingest New Evidence Data</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-slate-100">Ingestion Successful!</h3>
            <p className="text-xs text-slate-400 font-mono">{result.message}</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Close & Refresh Graph
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-8 text-center bg-slate-900/40 transition">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
                accept=".csv,.txt,.json"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
                <FileText className="w-10 h-10 text-cyan-400 mx-auto" />
                <p className="text-xs text-slate-200 font-medium">
                  {file ? file.name : 'Click to select CDR CSV, Bank Log, or FIR Narrative'}
                </p>
                <p className="text-[10px] text-slate-500">Supports .CSV, .TXT (FIR Narrative), .JSON</p>
              </label>
            </div>

            {file && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Parsing & Writing to Graph...</span>
                  </>
                ) : (
                  <span>Trigger Ingestion Pipeline</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
