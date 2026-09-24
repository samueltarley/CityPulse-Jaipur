import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { toCompactAlert, CompactAlertItem } from '../../utils/alertUtils';
import { EventCategory, EventSeverity } from '../../types';
import {
  Bell,
  BellOff,
  Minus,
  Maximize2,
  X,
  Car,
  Droplets,
  Zap,
  Wind,
  Trash2,
  Train,
  CloudRain,
  ChevronRight,
  Sparkles,
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
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${color}`} />;
};

export const LiveAlertsBox: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    events,
    isLiveAlertsOpen,
    isLiveAlertsMinimized,
    isAlertToastsMuted,
    setIsLiveAlertsOpen,
    setIsLiveAlertsMinimized,
    toggleAlertToastsMuted,
    setSelectedZoneId,
    setHighlightedEventIds,
    setActiveTab,
  } = useAppStore();

  const [filterMode, setFilterMode] = useState<'all' | 'high'>('all');

  // Convert raw events to compact alert items (newest first, latest 6)
  const compactAlerts = useMemo(() => {
    const list = events.map((e) => toCompactAlert(e, language));
    if (filterMode === 'high') {
      return list.filter((a) => a.severity === 'high' || a.severity === 'critical').slice(0, 6);
    }
    return list.slice(0, 6);
  }, [events, language, filterMode]);

  if (!isLiveAlertsOpen) {
    return null;
  }

  const handleRowClick = (item: CompactAlertItem) => {
    setSelectedZoneId(item.zoneId);
    setHighlightedEventIds([item.eventId]);
    setActiveTab('dashboard');

    // Smooth scroll to map
    setTimeout(() => {
      const mapEl = document.getElementById('jaipur-city-map-container');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // On mobile screens, close the modal after selection
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsLiveAlertsOpen(false);
    }
  };

  const handleViewAllClick = () => {
    setActiveTab('dashboard');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('expand-live-events-stream'));
    }
    setTimeout(() => {
      const el = document.getElementById('live-events-feed') || document.getElementById('live-event-stream-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsLiveAlertsOpen(false);
    }
  };

  // Minimized Pill state (Desktop only; on mobile full modal is shown)
  if (isLiveAlertsMinimized) {
    return (
      <div className="hidden md:block fixed top-[56px] right-6 z-40 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => setIsLiveAlertsMinimized(false)}
          className="flex items-center gap-2 rounded-full border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-3.5 py-1.5 text-xs font-bold text-[#0F3E48] dark:text-[#F0FCFD] shadow-[0_4px_16px_rgba(15,62,72,0.12)] hover:border-[#0891B2] hover:bg-[#F7FCFD] dark:hover:bg-[#341228] transition-all cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <Bell className="h-3.5 w-3.5 text-[#0891B2]" />
          <span>
            {language === 'hi'
              ? `🔔 ${compactAlerts.length} अलर्ट`
              : `🔔 ${compactAlerts.length} alerts`}
          </span>
          <Maximize2 className="h-3 w-3 text-[#3E6B75] dark:text-[#94A3B8] ml-1" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Backdrop & Bottom Sheet */}
      <div
        className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
        onClick={() => setIsLiveAlertsOpen(false)}
      >
        <div
          className="w-full max-h-[80vh] rounded-t-3xl bg-white dark:bg-[#280D1F] border-t border-[#CCF1F4] dark:border-[#521E3B] shadow-2xl p-4 flex flex-col animate-in slide-in-from-bottom duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top handle bar */}
          <div className="mx-auto w-12 h-1.5 bg-[#CCF1F4] dark:bg-[#521E3B] rounded-full mb-3" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E0F2F5] dark:border-[#521E3B]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h3 className="font-display text-sm font-bold text-[#0F3E48] dark:text-[#F0FCFD]">
                {t('liveAlerts')}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2F5] dark:bg-[#3B1429] text-[#0891B2] dark:text-[#E0F2F5]">
                {compactAlerts.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLiveAlertsOpen(false)}
              className="p-1.5 text-[#3E6B75] dark:text-[#94A3B8] hover:text-[#0F3E48] dark:hover:text-white rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filters & Mute Toggle */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                  filterMode === 'all'
                    ? 'bg-[#0891B2] text-white shadow-xs'
                    : 'bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-[#1F4E5A] dark:text-[#CBD5E1]'
                }`}
              >
                {t('filterAll')}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('high')}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                  filterMode === 'high'
                    ? 'bg-[#0891B2] text-white shadow-xs'
                    : 'bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-[#1F4E5A] dark:text-[#CBD5E1]'
                }`}
              >
                {t('filterHighOnly')}
              </button>
            </div>

            <button
              type="button"
              onClick={toggleAlertToastsMuted}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                isAlertToastsMuted
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  : 'border-[#CCF1F4] dark:border-[#521E3B] text-[#3E6B75] dark:text-[#94A3B8] hover:bg-[#F7FCFD] dark:hover:bg-[#341228]'
              }`}
            >
              {isAlertToastsMuted ? (
                <>
                  <BellOff className="h-3 w-3 text-amber-600" />
                  <span>{t('popupsMuted')}</span>
                </>
              ) : (
                <>
                  <Bell className="h-3 w-3 text-[#0891B2]" />
                  <span>{t('mutePopups')}</span>
                </>
              )}
            </button>
          </div>

          {/* Alert List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E0F2F5]/70 dark:divide-[#521E3B]/70 pr-1">
            {compactAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#3E6B75] dark:text-[#94A3B8]">
                {t('noLiveAlertsNow')}
              </div>
            ) : (
              compactAlerts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-[#F7FCFD] dark:hover:bg-[#341228] rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <SeverityDot severity={item.severity} />
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#E0F2F5] dark:bg-[#3B1429] text-[#0891B2] dark:text-[#E0F2F5]">
                      <CategoryIcon category={item.category} className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs truncate">
                      <span className="font-bold text-[#0F3E48] dark:text-[#F0FCFD] mr-1.5">
                        {language === 'hi' ? item.areaNameHi : item.areaNameEn}
                      </span>
                      <span className="text-[#0F3E48]/40 dark:text-white/40 mr-1.5">–</span>
                      <span className="text-[#1F4E5A] dark:text-[#E2E8F0] mr-1.5">
                        {language === 'hi' ? item.shortProblemHi : item.shortProblemEn}
                      </span>
                      <span className="text-[11px] text-[#3E6B75] dark:text-[#94A3B8]">
                        ({language === 'hi' ? item.timeAgoHi : item.timeAgoEn})
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#3E6B75] dark:text-[#94A3B8] shrink-0" />
                </div>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="pt-3 mt-2 border-t border-[#E0F2F5] dark:border-[#521E3B] text-center">
            <button
              type="button"
              onClick={handleViewAllClick}
              className="text-xs font-bold text-[#0891B2] hover:underline"
            >
              {t('viewAllUpdatesLink')}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Floating Box */}
      <div className="hidden md:flex flex-col fixed top-[54px] right-6 z-40 w-[340px] max-h-[400px] rounded-2xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] p-3.5 shadow-[0_4px_20px_rgba(15,62,72,0.08)] dark:shadow-none animate-in slide-in-from-top-2 fade-in duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E0F2F5] dark:border-[#521E3B]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <h3 className="font-display text-xs font-bold text-[#0F3E48] dark:text-[#F0FCFD]">
              {t('liveAlerts')}
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E0F2F5] dark:bg-[#3B1429] text-[#0891B2] dark:text-[#E0F2F5]">
              {compactAlerts.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsLiveAlertsMinimized(true)}
              className="p-1 text-[#3E6B75] dark:text-[#94A3B8] hover:text-[#0F3E48] dark:hover:text-white rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={t('minimizeAlerts')}
              aria-label="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsLiveAlertsOpen(false)}
              className="p-1 text-[#3E6B75] dark:text-[#94A3B8] hover:text-[#0F3E48] dark:hover:text-white rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={t('closeAlerts')}
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Chips & Mute Popups Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-[#E0F2F5]/60 dark:border-[#521E3B]/60">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#0891B2] text-white shadow-xs'
                  : 'bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-[#1F4E5A] dark:text-[#CBD5E1] hover:border-[#0891B2]'
              }`}
            >
              {t('filterAll')}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('high')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                filterMode === 'high'
                  ? 'bg-[#0891B2] text-white shadow-xs'
                  : 'bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-[#1F4E5A] dark:text-[#CBD5E1] hover:border-[#0891B2]'
              }`}
            >
              {t('filterHighOnly')}
            </button>
          </div>

          <button
            type="button"
            onClick={toggleAlertToastsMuted}
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
              isAlertToastsMuted
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                : 'border-[#CCF1F4] dark:border-[#521E3B] text-[#3E6B75] dark:text-[#94A3B8] hover:bg-[#F7FCFD] dark:hover:bg-[#341228]'
            }`}
            title={isAlertToastsMuted ? 'Popups muted' : 'Mute popup toasts'}
          >
            {isAlertToastsMuted ? (
              <>
                <BellOff className="h-2.5 w-2.5 text-amber-600" />
                <span>{t('popupsMuted')}</span>
              </>
            ) : (
              <>
                <Bell className="h-2.5 w-2.5 text-[#0891B2]" />
                <span>{t('mutePopups')}</span>
              </>
            )}
          </button>
        </div>

        {/* Rows: Latest 6 Problems (Newest First) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E0F2F5]/60 dark:divide-[#521E3B]/60 my-1 pr-1 custom-scrollbar">
          {compactAlerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#3E6B75] dark:text-[#94A3B8]">
              {t('noLiveAlertsNow')}
            </div>
          ) : (
            compactAlerts.map((item) => (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="py-1.5 px-1.5 flex items-center justify-between gap-1.5 hover:bg-[#F7FCFD] dark:hover:bg-[#341228] rounded-lg transition-colors cursor-pointer group"
                title={`${item.areaNameEn}: ${item.shortProblemEn}`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <SeverityDot severity={item.severity} />
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#E0F2F5] dark:bg-[#3B1429] text-[#0891B2] dark:text-[#E0F2F5]">
                    <CategoryIcon category={item.category} className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs truncate">
                    <span className="font-bold text-[#0F3E48] dark:text-[#F0FCFD] mr-1">
                      {language === 'hi' ? item.areaNameHi : item.areaNameEn}
                    </span>
                    <span className="text-[#0F3E48]/30 dark:text-white/30 mr-1">–</span>
                    <span className="text-[#1F4E5A] dark:text-[#E2E8F0] font-normal mr-1">
                      {language === 'hi' ? item.shortProblemHi : item.shortProblemEn}
                    </span>
                    <span className="text-[10px] text-[#3E6B75] dark:text-[#94A3B8]">
                      ({language === 'hi' ? item.timeAgoHi : item.timeAgoEn})
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-3 w-3 text-[#3E6B75] dark:text-[#94A3B8] group-hover:text-[#0891B2] shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* Footer View All Link */}
        <div className="pt-2 border-t border-[#E0F2F5] dark:border-[#521E3B] text-center shrink-0">
          <button
            type="button"
            onClick={handleViewAllClick}
            className="text-xs font-bold text-[#0891B2] hover:underline cursor-pointer"
          >
            {t('viewAllUpdatesLink')}
          </button>
        </div>
      </div>
    </>
  );
};
