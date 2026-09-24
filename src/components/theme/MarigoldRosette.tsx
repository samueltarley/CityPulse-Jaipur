import React from 'react';

interface MarigoldRosetteProps {
  className?: string;
  size?: number;
}

export const MarigoldRosette: React.FC<MarigoldRosetteProps> = ({
  className = '',
  size = 18,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 text-[#F2A93B] filter drop-shadow-[0_1px_2px_rgba(242,169,59,0.3)] ${className}`}
      aria-hidden="true"
    >
      {/* 8-petal Marigold flower rosette motif */}
      <g transform="translate(12, 12)">
        {/* Layer 1 Petals (Outer) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <path
            key={i}
            d="M0 0 C-2 -7 -3 -10 0 -11 C3 -10 2 -7 0 0 Z"
            fill="#F2A93B"
            transform={`rotate(${angle})`}
            opacity="0.95"
          />
        ))}
        {/* Layer 2 Petals (Inner Orange Accent) */}
        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => (
          <path
            key={`inner-${i}`}
            d="M0 0 C-1.5 -5 -2 -7.5 0 -8.5 C2 -7.5 1.5 -5 0 0 Z"
            fill="#E08320"
            transform={`rotate(${angle})`}
          />
        ))}
        {/* Central core */}
        <circle cx="0" cy="0" r="3.2" fill="#0891B2" />
        <circle cx="0" cy="0" r="2" fill="#FFFAF5" />
      </g>
    </svg>
  );
};
