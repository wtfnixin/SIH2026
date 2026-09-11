import React from 'react';

export function ScrollArea({
  children,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={`shadcn-scroll-area ${className}`}
      style={{
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
