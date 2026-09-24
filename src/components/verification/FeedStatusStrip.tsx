import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage } from '../../i18n/LanguageContext';
import { FeedManager } from '../../engine/feedManager';
import {
  Activity,
  RefreshCw,
  Radio,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const FeedStatusStrip: React.FC = () => {
  const { feedStatuses } = useAppStore();
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fm = FeedManager.getInstance();
      await Promise.all([fm.fetchWeather(), fm.fetchAirQuality()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-3 sm:p-4 shadow-sm transition-colors duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-[var(--jaipur-border)]">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[var(--jaipur-terracotta)] animate-pulse" />
          <h3 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
            Multi-Modal Telemetry Ingestion Hub
          </h3>
          <span className="text-xs text-[var(--jaipur-text-muted)] hidden sm:inline">
            ({feedStatuses.length} Data Feeds Active)
          </span>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-xs font-semibold text-[var(--jaipur-text)] hover:border-[var(--jaipur-terracotta)] hover:text-[var(--jaipur-terracotta)] transition-colors cursor-pointer disabled:opacity-50"
          title="Force refresh Open-Meteo Weather & AQI APIs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[var(--jaipur-terracotta)]' : ''}`} />
          <span>{isRefreshing ? 'Polling APIs...' : 'Poll Live APIs Now'}</span>
        </button>
      </div>

      {/* Feeds status chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {feedStatuses.map((feed) => {
          const isLiveApi = feed.origin === 'live_api';
          const isFallback = feed.status === 'fallback';
          const isSimulated = feed.origin === 'simulated';

          const badgeBg = isFallback
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/30'
            : isLiveApi
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/30'
            : 'bg-[var(--jaipur-peacock)]/10 text-[var(--jaipur-peacock)] border-[var(--jaipur-peacock)]/30';

          const statusText = isFallback
            ? 'FALLBACK'
            : isLiveApi
            ? 'LIVE API'
            : 'SIMULATED';

          return (
            <div
              key={feed.feedId}
              className="flex flex-col justify-between p-2.5 rounded-lg border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 text-xs"
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="font-bold text-[var(--jaipur-text)] truncate text-[11px]" title={feed.nameEn}>
                  {language === 'hi' ? feed.nameHi : feed.nameEn}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border shrink-0 uppercase ${badgeBg}`}
                >
                  {statusText}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[var(--jaipur-text-secondary)] mt-1 pt-1.5 border-t border-[var(--jaipur-border)]/60">
                <span className="flex items-center gap-1 font-mono">
                  <Activity className="h-3 w-3 text-[var(--jaipur-terracotta)]" />
                  {feed.eventsPerMin} evt/min
                </span>
                <span className="font-mono text-[var(--jaipur-text-muted)]">
                  {feed.latencyMs > 0 ? `${feed.latencyMs}ms` : '<10ms'}
                </span>
              </div>

              {feed.lastError && (
                <div className="mt-1 text-[9px] text-amber-600 dark:text-amber-400 truncate" title={feed.lastError}>
                  Fallback: {feed.lastError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
