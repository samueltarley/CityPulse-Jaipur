import React, { ReactNode } from 'react';

interface JharokhaCardProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'terracotta' | 'gold';
  noArch?: boolean;
}

export const JharokhaCard: React.FC<JharokhaCardProps> = ({
  children,
  title,
  subtitle,
  badge,
  action,
  className = '',
  variant = 'default',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none transition-all duration-200 ${className}`}
    >
      {/* Header section if title or action provided */}
      {(title || subtitle || badge || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0F2F5] dark:border-[#521E3B] px-6 py-4 bg-white dark:bg-[#36142B]/30">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {title && (
                <h3 className="font-display text-[18px] font-bold text-[#0F3E48] dark:text-[#FFD1DC] truncate">
                  {title}
                </h3>
              )}
              {badge && <div>{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-[13px] text-[#3E6B75] dark:text-[#E3B0C4] mt-0.5 truncate font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      {/* Main Body with consistent 24px (p-6) padding */}
      <div className="p-6">{children}</div>
    </div>
  );
};
