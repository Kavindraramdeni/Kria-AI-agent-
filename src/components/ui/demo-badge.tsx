import React from 'react';

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
      title="Sample data for demonstration purposes"
    >
      DEMO DATA
    </span>
  );
}
