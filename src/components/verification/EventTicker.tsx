import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage } from '../../i18n/LanguageContext';
import { CivicEvent, EventOrigin, EventCategory } from '../../types';
import { EventDetailModal } from './EventDetailModal';
import {
  Radio,
  Train,
  Bus,
  CloudSun,
  AlertCircle,
  Zap,
  Clock,
  MapPin,
  ExternalLink,
  Filter,
} from 'lucide-react';

export const EventTicker: React.FC = () => {
  const { events } = useAppStore();
  const { language } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<CivicEvent | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredEvents = events.filter((e) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'live_api') return e.metadata?.origin === 'live_api';
    if (filterCategory === 'fallback') return e.metadata?.origin === 'simulated_fallback';
    return e.category === filterCategory;
  });

  const getSourceIcon = (event: CivicEvent) => {
    switch (event.source) {
      case 'metro_feed':
        return <Train className="h-4 w-4 text-purple-500 shrink-0" />;
      case 'traffic_camera':
        return <Bus className="h-4 w-4 text-blue-500 shrink-0" />;
      case 'weather_station':
        return <CloudSun className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'resident_report':
        return <AlertCircle className="h-4 w-4 text-[var(--jaipur-terracotta)] shrink-0" />;
      case 'iot_sensor':
        return <Zap className="h-4 w-4 text-yellow-500 shrink-0" />;
      default:
        return <Radio className="h-4 w-4 text-[var(--jaipur-peacock)] shrink-0" />;
    }
  };

  const getOriginBadge = (origin?: EventOrigin) => {
    switch (origin) {
      case 'live_api':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-400/30 uppercase">
            LIVE API
          </span>
        );
      case 'simulated_fallback':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/30 uppercase">
            FALLBACK
          </span>
        );
      case 'simulated':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-[var(--jaipur-peacock)]/10 text-[var(--jaipur-peacock)] border border-[var(--jaipur-peacock)]/30 uppercase">
            SIMULATED
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: CivicEvent['severity']) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'low':
      default:
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-4 shadow-sm transition-colors duration-300">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-[var(--jaipur-border)]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[var(--jaipur-terracotta)] animate-pulse" />
            <h3 className="font-display text-base font-bold text-[var(--jaipur-text)]">
              Real-Time Normalized Event Stream
            </h3>
          </div>
          <p className="text-xs text-[var(--jaipur-text-secondary)] mt-0.5">
            Capped at 3,000 events ({events.length} ingested) • Click any event to inspect Raw Payload vs Normalized Schema
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <Filter className="h-3.5 w-3.5 text-[var(--jaipur-text-muted)] shrink-0 mr-1" />
          {[
            { id: 'all', label: 'All' },
            { id: 'live_api', label: 'Live APIs' },
            { id: 'transit', label: 'Transit' },
            { id: 'water', label: 'Water' },
            { id: 'power', label: 'Power' },
            { id: 'sanitation', label: 'Sanitation' },
            { id: 'air_quality', label: 'Air Quality' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                filterCategory === cat.id
                  ? 'bg-[var(--jaipur-terracotta)] text-white'
                  : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] border border-[var(--jaipur-border)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="divide-y divide-[var(--jaipur-border)]/60 max-h-[460px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--jaipur-text-secondary)]">
            Waiting for telemetry packets... Feeds are actively polling.
          </div>
        ) : (
          filteredEvents.slice(0, 100).map((event) => {
            const timeStr = new Date(event.timestamp).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour12: true,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group p-3 hover:bg-[var(--jaipur-surface-warm)]/70 transition-all cursor-pointer rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Icon, Title & Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] group-hover:border-[var(--jaipur-terracotta)]/40 transition-colors">
                    {getSourceIcon(event)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getOriginBadge(event.metadata?.origin)}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border uppercase ${getSeverityBadge(
                          event.severity
                        )}`}
                      >
                        {event.severity}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--jaipur-text-secondary)] flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[var(--jaipur-terracotta)]" />
                        {event.locationName}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[var(--jaipur-text)] group-hover:text-[var(--jaipur-terracotta)] transition-colors truncate">
                      {language === 'hi' ? event.titleHi : event.titleEn}
                    </h4>
                    <p className="text-[11px] text-[var(--jaipur-text-secondary)] line-clamp-1 mt-0.5">
                      {language === 'hi' ? event.descriptionHi : event.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Right: Timestamp & Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 text-right">
                  <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeStr} IST
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--jaipur-terracotta)] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Inspect JSON <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};
