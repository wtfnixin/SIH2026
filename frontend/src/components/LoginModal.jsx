import React, { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, KeyRound, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { login, authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLocalError('Please enter both Officer ID/Username and Password.');
      return;
    }

    setLocalError('');
    setIsSubmitting(true);
    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card glass-card">
        {/* Top Header Badge */}
        <div className="login-terminal-header">
          <div className="login-emblem-badge">
            <Shield size={28} color="#38bdf8" />
          </div>
          <div className="login-header-text">
            <h2 className="login-title">CRIMINAL INVESTIGATION COMMAND CENTER</h2>
            <p className="login-subtitle">OFFICER AUTHENTICATION & ACCESS GATEWAY</p>
          </div>
        </div>

        <div className="login-restricted-pill">
          <ShieldCheck size={12} color="#34d399" />
          <span>RESTRICTED LAW ENFORCEMENT & INTELLIGENCE ACCESS ONLY</span>
        </div>

        {/* Error Alert Box */}
        {displayedError && (
          <div className="login-error-box">
            <AlertTriangle size={16} color="#f87171" className="flex-shrink-0" />
            <div className="login-error-text">
              <span>{displayedError}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-label">
              <User size={13} color="#94a3b8" />
              <span>OFFICER BADGE ID / USERNAME</span>
            </label>
            <div className="login-input-wrapper">
              <input
                type="text"
                autoComplete="username"
                autoFocus
                className="login-input"
                placeholder="e.g. admin or officer_sharma"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label">
              <Lock size={13} color="#94a3b8" />
              <span>ACCESS PASSPHRASE</span>
            </label>
            <div className="login-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="login-input"
                placeholder="Enter authorized credential"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>VERIFYING CREDENTIALS...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>AUTHENTICATE & ENTER SYSTEM</span>
              </>
            )}
          </button>
        </form>

        {/* Legal & Security Compliance Warning */}
        <div className="login-security-notice">
          <div className="notice-header">
            <AlertTriangle size={11} color="#eab308" />
            <span>OFFICIAL SURVEILLANCE & AUDIT NOTICE</span>
          </div>
          <p className="notice-body">
            Access to this intelligence system is monitored and recorded. All database queries, entity dossier inspections, and wiretap analytics are linked to your badge credentials and logged into tamper-resistant audit trails under the IT Act 2000.
          </p>
        </div>
      </div>
    </div>
  );
}
