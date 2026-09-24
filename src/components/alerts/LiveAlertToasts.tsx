import React, { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { LiveAlertToast, EventCategory, EventSeverity } from '../../types';
import { formatTimeAgo } from '../../utils/alertUtils';
import {
  Car,
  Droplets,
  Zap,
  Wind,
  Trash2,
  Train,
  CloudRain,
  AlertTriangle,
  X,
} from 'lucide-react';

const CategoryIcon: React.FC<{ category: EventCategory; className?: string }> = ({
  category,
  className = 'h-3.5 w-3.5',
}) => {
  switch (category) {
    case 'traffic':
      return <Car className={className} />;
    case 'water':
      return <Droplets className={className} />;
    case 'power':
      return <Zap className={className} />;
    case 'air_quality':
      return <Wind className={className} />;
    case 'sanitation':
      return <Trash2 className={className} />;
    case 'transit':
      return <Train className={className} />;
    default:
      return <CloudRain className={className} />;
  }
};

const SeverityDot: React.FC<{ severity: EventSeverity }> = ({ severity }) => {
  let color = 'bg-amber-400';
  if (severity === 'high' || severity === 'critical') {
    color = 'bg-rose-500 animate-pulse';
  } else if (severity === 'medium') {
    color = 'bg-orange-500';
  }
  return <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />;
};

interface SingleToastProps {
  toast: LiveAlertToast;
  onDismiss: (id: string) => void;
  onClick: (toast: LiveAlertToast) => void;
}

const SingleToastItem: React.FC<SingleToastProps> = ({ toast, onDismiss, onClick }) => {
  const { language } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const areaName = language === 'hi' ? toast.areaNameHi : toast.areaNameEn;
  const shortProblem = language === 'hi' ? toast.shortTextHi : toast.shortTextEn;
  const timeStr = formatTimeAgo(toast.timestamp, language);

  return (
    <div
      onClick={() => onClick(toast)}
      className="pointer-events-auto group relative flex items-center justify-between gap-2.5 rounded-2xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white/95 dark:bg-[#280D1F]/95 p-3 sm:py-2.5 sm:px-3.5 shadow-[0_4px_18px_rgba(15,62,72,0.12)] backdrop-blur-md transition-all duration-200 hover:scale-[1.01] hover:border-[#0891B2] cursor-pointer animate-in slide-in-from-top-3 fade-in"
      role="alert"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SeverityDot severity={toast.severity} />
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#E0F2F5] dark:bg-[#3B1429] text-[#0891B2] dark:text-[#E0F2F5]">
          <CategoryIcon category={toast.category} className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1 text-xs truncate">
          <span className="font-bold text-[#0F3E48] dark:text-[#F0FCFD] mr-1.5">
            {areaName}
          </span>
          <span className="text-[#0F3E48]/40 dark:text-white/40 mr-1.5">–</span>
          <span className="text-[#1F4E5A] dark:text-[#E2E8F0] font-medium mr-1.5">
            {shortProblem}
          </span>
          <span className="text-[11px] text-[#3E6B75] dark:text-[#94A3B8] font-normal">
            ({timeStr})
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        className="shrink-0 p-1 text-[#3E6B75] dark:text-[#94A3B8] hover:text-[#0F3E48] dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const LiveAlertToasts: React.FC = () => {
  const { liveAlertToasts, dismissLiveToast, setSelectedZoneId, setHighlightedEventIds, setActiveTab } =
    useAppStore();

  const handleToastClick = (toast: LiveAlertToast) => {
    setSelectedZoneId(toast.zoneId);
    setHighlightedEventIds([toast.eventId]);
    setActiveTab('dashboard');
    dismissLiveToast(toast.id);

    // Smooth scroll to map or zone section
    setTimeout(() => {
      const mapEl = document.getElementById('jaipur-city-map-container');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  if (!liveAlertToasts || liveAlertToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-14 sm:top-16 left-3 right-3 sm:left-auto sm:right-6 z-50 flex flex-col gap-2 max-w-none sm:max-w-[360px] pointer-events-none">
      {liveAlertToasts.slice(0, 3).map((toast) => (
        <SingleToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissLiveToast}
          onClick={handleToastClick}
        />
      ))}
    </div>
  );
};
