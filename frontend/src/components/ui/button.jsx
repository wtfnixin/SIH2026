import React from 'react';

export function Button({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  style = {},
  disabled = false,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          background: 'var(--secondary)',
          color: 'var(--secondary-foreground)',
          border: '1px solid var(--border)'
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--foreground)',
          border: '1px solid var(--border)'
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--foreground)',
          border: 'none'
        };
      case 'destructive':
        return {
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        };
      case 'default':
      default:
        return {
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          border: 'none'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '5px 10px',
          fontSize: '11px',
          borderRadius: '10px'
        };
      case 'lg':
        return {
          padding: '12px 24px',
          fontSize: '14px',
          borderRadius: '16px'
        };
      case 'icon':
        return {
          padding: '8px',
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        };
      case 'default':
      default:
        return {
          padding: '8px 16px',
          fontSize: '12.5px',
          borderRadius: '12px'
        };
    }
  };

  return (
    <button
      className={`shadcn-button shadcn-button-${variant} ${className}`}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
