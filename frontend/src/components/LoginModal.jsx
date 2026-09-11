import React, { useState } from 'react';
import { Lock, User, AlertTriangle, Loader2, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { login, authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLocalError('Please enter both Officer ID and Password.');
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(9, 9, 11, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        maxWidth: '390px',
        width: '100%',
        borderRadius: '16px',
        background: '#111114',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px -10px rgba(56, 189, 248, 0.15)',
        padding: '32px 28px 28px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        color: '#fafafa',
        position: 'relative'
      }}>
        {/* Header with High-Visibility National Emblem */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '9px'
          }}>
            <img
              src="/Emblem_of_India_no_text.svg"
              alt="Government of India Emblem"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1) drop-shadow(0 2px 8px rgba(255, 255, 255, 0.4))'
              }}
            />
          </div>

          <div>
            <h1 style={{
              fontSize: '17px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#ffffff',
              margin: 0
            }}>
              Criminal Network Intelligence
            </h1>
            <p style={{
              fontSize: '12px',
              color: '#a1a1aa',
              margin: '4px 0 0 0'
            }}>
              Sign in with your officer credentials
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {displayedError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '9px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fca5a5',
            fontSize: '12px'
          }}>
            <AlertTriangle size={15} color="#f87171" style={{ flexShrink: 0 }} />
            <span>{displayedError}</span>
          </div>
        )}

        {/* Minimal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#a1a1aa',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <User size={12} color="#71717a" />
              <span>Officer ID / Username</span>
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              style={{
                width: '100%',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#a1a1aa',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Lock size={12} color="#71717a" />
              <span>Password</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: '#18181b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 38px 10px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Clean Quick Demo Access Option */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 0'
          }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'Admin@Secure2026!')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={12} color="#38bdf8" />
              <span>Fill Demo Credentials (Admin)</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '4px',
              height: '42px',
              borderRadius: '8px',
              background: '#0284c7',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.15s ease'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
