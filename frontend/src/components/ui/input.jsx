import React from 'react';

export function Input({
  className = '',
  style = {},
  type = 'text',
  disabled = false,
  ...props
}) {
  return (
    <input
      type={type}
      disabled={disabled}
      className={`shadcn-input ${className}`}
      style={{
        display: 'flex',
        height: '38px',
        width: '100%',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'var(--surface-input)',
        padding: '8px 14px',
        fontSize: '12.5px',
        color: 'var(--foreground)',
        outline: 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        ...style
      }}
      {...props}
    />
  );
}
