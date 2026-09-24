import React from 'react';

interface JaaliPatternProps {
  className?: string;
  opacity?: number;
}

export const JaaliPattern: React.FC<JaaliPatternProps> = ({
  className = '',
  opacity = 0.07,
}) => {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full text-[#D9707E] dark:text-[#F08B9B] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="jaali-grid-pattern"
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          {/* Authentic Jaipur 8-pointed star & octagonal lattice motif */}
          <path
            d="M24 0 L32 16 L48 24 L32 32 L24 48 L16 32 L0 24 L16 16 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="24" cy="24" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="0" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="48" cy="0" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="48" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="48" cy="48" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            d="M0 24 L16 24 M32 24 L48 24 M24 0 L24 16 M24 32 L24 48"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#jaali-grid-pattern)" />
    </svg>
  );
};
