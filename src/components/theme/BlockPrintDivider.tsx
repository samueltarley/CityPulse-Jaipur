import React from 'react';

interface BlockPrintDividerProps {
  className?: string;
  variant?: 'floral' | 'paisley' | 'simple';
}

export const BlockPrintDivider: React.FC<BlockPrintDividerProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`relative my-6 flex w-full items-center justify-center text-[var(--jaipur-terracotta)] opacity-60 ${className}`}
      aria-hidden="true"
    >
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[var(--jaipur-border-strong)] to-transparent" />
      <div className="mx-3 flex items-center gap-1.5 px-2">
        <svg
          className="h-5 w-44 text-current"
          viewBox="0 0 200 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left floral sprig */}
          <circle cx="20" cy="10" r="2" fill="currentColor" />
          <path d="M26 10 C32 6, 38 14, 44 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="44" cy="10" r="1.5" fill="currentColor" />
          <path d="M50 10 C56 6, 62 14, 68 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

          {/* Central Sanganeri Lotus Rosette */}
          <g transform="translate(100, 10)">
            <circle cx="0" cy="0" r="3.5" fill="currentColor" />
            <path
              d="M0 -8 C2 -4, 4 -4, 0 0 C-4 -4, -2 -4, 0 -8 Z"
              fill="currentColor"
            />
            <path
              d="M0 8 C2 4, 4 4, 0 0 C-4 4, -2 4, 0 8 Z"
              fill="currentColor"
            />
            <path
              d="M-8 0 C-4 2, -4 4, 0 0 C-4 -4, -4 -2, -8 0 Z"
              fill="currentColor"
            />
            <path
              d="M8 0 C4 2, 4 4, 0 0 C4 -4, 4 -2, 8 0 Z"
              fill="currentColor"
            />
            <circle cx="-14" cy="0" r="1.5" fill="currentColor" />
            <circle cx="14" cy="0" r="1.5" fill="currentColor" />
          </g>

          {/* Right floral sprig */}
          <path d="M132 10 C138 6, 144 14, 150 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="156" cy="10" r="1.5" fill="currentColor" />
          <path d="M162 10 C168 6, 174 14, 180 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="180" cy="10" r="2" fill="currentColor" />
        </svg>
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[var(--jaipur-border-strong)] to-transparent" />
    </div>
  );
};
