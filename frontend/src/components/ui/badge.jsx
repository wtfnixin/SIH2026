import React from 'react';

export function Badge({
  children,
  variant = 'default',
  className = '',
  style = {},
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
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.28)'
        };
      case 'cyan':
        return {
          background: 'rgba(6, 182, 212, 0.12)',
          color: '#06b6d4',
          border: '1px solid rgba(6, 182, 212, 0.28)'
        };
      case 'destructive':
        return {
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.28)'
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

  return (
    <span
      className={`shadcn-badge shadcn-badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2.5px 8px',
        fontSize: '10px',
        fontWeight: 700,
        lineHeight: 1,
        borderRadius: '9999px',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        transition: 'colors 0.15s ease',
        ...getVariantStyles(),
        ...style
      }}
      {...props}
    >
      {children}
    </span>
  );
}
