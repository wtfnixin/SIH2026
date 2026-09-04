import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('graph');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
        <div>
          {/* Logo / Header */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
              NC
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-cyan-400 uppercase">SIH26189</h1>
              <p className="text-xs text-slate-400 font-medium">NCRB Network Intel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('graph')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span>🕸️ Network Graph View</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'timeline'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span>⏱️ Timeline & Replay</span>
            </button>
            <button
              onClick={() => setActiveTab('entities')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'entities'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span>👤 Entity Dossiers</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'alerts'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span>🚨 Threat Alerts Feed</span>
            </button>
            <button
              onClick={() => setActiveTab('copilot')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'copilot'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span>🤖 Investigator Copilot</span>
            </button>
          </nav>
        </div>

        {/* System Status Footer */}
        <div className="border-t border-slate-800 pt-4 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>Pipeline Status</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> Ready
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Operation Shadow Link Active</p>
        </div>
      </aside>

      {/* Main Workspace Panel */}
      <main className="flex-1 flex flex-col bg-slate-950">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/40 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Case ID:</span>
            <span className="text-xs font-mono font-bold bg-slate-800 text-cyan-400 px-2.5 py-1 rounded">
              CASE_2026_SHADOW_LINK
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-slate-400">Security Classification: <strong className="text-rose-400">RESTRICTED // LAW ENFORCEMENT</strong></span>
          </div>
        </header>

        {/* Content Body */}
        <section className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-2">
              Criminal Network Intelligence Command Center Base
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Welcome to the SIH26189 AI-Powered Criminal Network Analysis Platform base shell. System engines for Multi-Source Ingestion, NLP Entity Extraction, Entity Resolution, Neo4j Graph Analytics, and Threat Anomaly Engines are ready to be wired.
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <span className="text-[10px] uppercase font-bold text-slate-500">Engine 1 & 2</span>
                <h3 className="text-sm font-semibold text-cyan-400 mt-1">Ingestion & NER</h3>
                <p className="text-xs text-slate-400 mt-1">Multi-source schema parser & RapidFuzz deduplication.</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <span className="text-[10px] uppercase font-bold text-slate-500">Engine 3 & 4</span>
                <h3 className="text-sm font-semibold text-cyan-400 mt-1">Graph & Anomaly ML</h3>
                <p className="text-xs text-slate-400 mt-1">Neo4j PageRank, Betweenness Centrality & Structuring detector.</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <span className="text-[10px] uppercase font-bold text-slate-500">Engine 5</span>
                <h3 className="text-sm font-semibold text-cyan-400 mt-1">AI Copilot</h3>
                <p className="text-xs text-slate-400 mt-1">Evidence-grounded Graph RAG natural language assistant.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
