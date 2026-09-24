import React, { ReactNode } from 'react';
import { MarigoldRosette } from './MarigoldRosette';

interface SectionHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  divider?: boolean;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  subtitle,
  badge,
  action,
  className = '',
  size = 'lg',
  divider = false,
}) => {
  const sizeClasses = {
    sm: 'text-[18px]',
    md: 'text-[20px]',
    lg: 'text-[24px]',
  }[size];

  const rosetteSize = size === 'lg' ? 20 : size === 'md' ? 18 : 15;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <MarigoldRosette size={rosetteSize} />
          <h2
            className={`font-display font-bold text-[#0F3E48] dark:text-[#FFD1DC] tracking-normal ${sizeClasses}`}
          >
            {title}
          </h2>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>

      {subtitle && (
        <p className="text-[13px] text-[#3E6B75] dark:text-[#E3B0C4] ml-7 font-medium">
          {subtitle}
        </p>
      )}

      {divider && (
        <div className="pt-2">
          <div className="h-[1px] w-full bg-[#E0F2F5] dark:bg-[#521E3B]" />
        </div>
      )}
    </div>
  );
};
