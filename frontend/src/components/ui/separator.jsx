import React from 'react';

export function Separator({
  orientation = 'horizontal',
  className = '',
  style = {},
  ...props
}) {
  const isHorizontal = orientation === 'horizontal';
  return (
    <div
      role="separator"
      className={`shadcn-separator ${className}`}
      style={{
        flexShrink: 0,
        background: 'var(--border)',
        height: isHorizontal ? '1px' : '100%',
        width: isHorizontal ? '100%' : '1px',
        ...style
      }}
      {...props}
    />
  );
}
