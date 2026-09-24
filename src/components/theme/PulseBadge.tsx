import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { getPulseBand, getBandDetails } from '../../engine/pulseScore';
import { Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface PulseBadgeProps {
  compact?: boolean;
}

export const PulseBadge: React.FC<PulseBadgeProps> = ({ compact = false }) => {
  const { language, t } = useLanguage();
  const { pulseMetrics } = useAppStore();
  const { cityScore, trend } = pulseMetrics;

  const band = getPulseBand(cityScore);
  const bandInfo = getBandDetails(band);
  const bandLabel = language === 'hi' ? bandInfo.labelHi : bandInfo.labelEn;

  const TrendIcon = trend === 'improving' ? ArrowUpRight : trend === 'deteriorating' ? ArrowDownRight : Minus;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${bandInfo.bgClass}`}
        title={`${t('cityPulse')}: ${cityScore}/100 - ${bandLabel}`}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: bandInfo.color }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: bandInfo.color }}
          />
        </span>
        <span className="font-display font-bold">{cityScore}</span>
        <span className="hidden sm:inline text-[11px] opacity-90">{bandLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-3 px-3 py-1.5 rounded-xl border border-white/40 bg-white/95 dark:bg-[#280D1F] backdrop-blur-md transition-all duration-300 shadow-sm"
      style={{ boxShadow: `0 0 14px ${bandInfo.ringColor}` }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center text-current"
          style={{ backgroundColor: `${bandInfo.color}25` }}
        >
          <Activity
            className="h-4 w-4 animate-pulse"
            style={{ color: bandInfo.color }}
          />
        </div>
        <span
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full pulse-beacon"
          style={{ backgroundColor: bandInfo.color }}
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#0F3E48] dark:text-[#FFD1DC]">
            {t('cityPulse')}
          </span>
          <span className="flex items-center text-[10px] text-[#0F3E48] dark:text-[#FFD1DC]">
            <TrendIcon className="h-3 w-3 inline" />
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-bold leading-none text-[#0F3E48] dark:text-[#FFF0F5]">
            {cityScore}
          </span>
          <span className="text-[10px] font-bold text-[#3E6B75] dark:text-[#E3B0C4]">/100</span>
          <span
            className="text-xs font-bold ml-1"
            style={{ color: bandInfo.color }}
          >
            {bandLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
