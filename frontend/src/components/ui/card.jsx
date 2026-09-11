import React from 'react';

export function Card({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`shadcn-card ${className}`}
      style={{
        background: 'var(--card)',
        color: 'var(--card-foreground)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`shadcn-card-header ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '18px 20px',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', style = {}, ...props }) {
  return (
    <h3
      className={`shadcn-card-title ${className}`}
      style={{
        margin: 0,
        fontSize: '15px',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: 'var(--foreground)',
        ...style
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', style = {}, ...props }) {
  return (
    <p
      className={`shadcn-card-description ${className}`}
      style={{
        margin: 0,
        fontSize: '12px',
        color: 'var(--muted-foreground)',
        lineHeight: 1.5,
        ...style
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`shadcn-card-content ${className}`}
      style={{
        padding: '0 20px 20px 20px',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`shadcn-card-footer ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 20px',
        borderTop: '1px solid var(--border)',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
