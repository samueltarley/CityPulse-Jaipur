import React from 'react';

interface RosetteSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const RosetteSpinner: React.FC<RosetteSpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <svg
        className={`animate-spin text-[var(--jaipur-terracotta)] ${sizeMap[size]}`}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="status"
        aria-label="Loading..."
      >
        {/* Central hub */}
        <circle cx="32" cy="32" r="5" fill="currentColor" />
        <circle
          cx="32"
          cy="32"
          r="24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.3"
        />

        {/* 12-petaled floral mandala rosette radiating outward */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => (
          <g key={angle} transform={`rotate(${angle} 32 32)`} opacity={0.35 + (idx % 3) * 0.3}>
            <path
              d="M32 12 C34 20, 34 24, 32 27 C30 24, 30 20, 32 12 Z"
              fill="currentColor"
            />
            <circle cx="32" cy="8" r="1.8" fill="currentColor" />
          </g>
        ))}
      </svg>
      {label && (
        <span className="font-display text-xs tracking-wider text-[var(--jaipur-text-secondary)]">
          {label}
        </span>
      )}
    </div>
  );
};
