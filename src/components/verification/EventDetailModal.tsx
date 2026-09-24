import React, { useState } from 'react';
import { CivicEvent } from '../../types';
import { X, Copy, Check, ArrowRight, Code, ShieldAlert, MapPin, Clock } from 'lucide-react';

interface EventDetailModalProps {
  event: CivicEvent | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedNorm, setCopiedNorm] = useState(false);

  if (!event) return null;

  const rawPayload = event.metadata?.rawPayload || {
    message: 'Raw payload encapsulated in metadata',
    origin: event.metadata?.origin || 'simulated',
    event_id: event.id,
  };

  const rawJson = JSON.stringify(rawPayload, null, 2);

  // Normalized schema without duplicating rawPayload in display to keep it clean
  const normalizedSchema: Record<string, unknown> = {
    id: event.id,
    timestamp: event.timestamp,
    timestamp_ist: new Date(event.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    zoneId: event.zoneId,
    category: event.category,
    severity: event.severity,
    titleEn: event.titleEn,
    titleHi: event.titleHi,
    descriptionEn: event.descriptionEn,
    descriptionHi: event.descriptionHi,
    locationName: event.locationName,
    coordinates: event.coordinates,
    source: event.source,
    status: event.status,
    affectedRadiusMeters: event.affectedRadiusMeters,
    origin: event.metadata?.origin || 'simulated',
  };

  const normJson = JSON.stringify(normalizedSchema, null, 2);

  const copyToClipboard = (text: string, isRaw: boolean) => {
    navigator.clipboard.writeText(text);
    if (isRaw) {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } else {
      setCopiedNorm(true);
      setTimeout(() => setCopiedNorm(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] border border-[var(--jaipur-terracotta)]/30">
                {event.category.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--jaipur-peacock)]/15 text-[var(--jaipur-peacock)] border border-[var(--jaipur-peacock)]/30">
                {event.metadata?.origin?.toUpperCase() || 'SIMULATED'}
              </span>
              <span className="text-xs text-[var(--jaipur-text-muted)] font-mono">
                {event.id}
              </span>
            </div>
            <h2 className="text-base font-bold font-display text-[var(--jaipur-text)]">
              {event.titleEn}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[var(--jaipur-border)] hover:bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Side-by-Side */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 bg-[var(--jaipur-surface)]">
          {/* Left: Raw Data */}
          <div className="flex flex-col rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/30 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/80">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-[var(--jaipur-peacock)]" />
                <span className="font-mono text-xs font-bold text-[var(--jaipur-text)] uppercase">
                  Raw Feed Ingest Payload
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(rawJson, true)}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-terracotta)] cursor-pointer"
              >
                {copiedRaw ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3 text-[11px] text-[var(--jaipur-text-secondary)] border-b border-[var(--jaipur-border)]/50 bg-[var(--jaipur-surface-warm)]/10">
              Source telemetry format with source-specific timestamps (e.g. Unix seconds, text zones, or &apos;DD/MM/YYYY hh:mm A&apos;).
            </div>
            <pre className="flex-1 p-3.5 font-mono text-[11px] text-[var(--jaipur-text)] overflow-x-auto bg-[#F0FCFD] dark:bg-black/30 rounded-b-xl leading-relaxed select-all">
              {rawJson}
            </pre>
          </div>

          {/* Right: Normalized CivicEvent */}
          <div className="flex flex-col rounded-xl border border-[var(--jaipur-terracotta)]/30 bg-[var(--jaipur-surface-warm)]/30 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--jaipur-border)] bg-[var(--jaipur-terracotta)]/10">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
                <span className="font-mono text-xs font-bold text-[var(--jaipur-terracotta)] uppercase">
                  Normalized CivicEvent Schema
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(normJson, false)}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-terracotta)] cursor-pointer"
              >
                {copiedNorm ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedNorm ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3 text-[11px] text-[var(--jaipur-text-secondary)] border-b border-[var(--jaipur-border)]/50 bg-[var(--jaipur-surface-warm)]/10">
              Standardized IST timestamp, Haversine nearest zone mapping, severity evaluation, and bilingual titles.
            </div>
            <pre className="flex-1 p-3.5 font-mono text-[11px] text-[var(--jaipur-text)] overflow-x-auto bg-[#F0FCFD] dark:bg-black/30 rounded-b-xl leading-relaxed select-all">
              {normJson}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60 text-xs text-[var(--jaipur-text-secondary)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[var(--jaipur-terracotta)]" />
              Zone: <strong className="text-[var(--jaipur-text)]">{event.zoneId}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[var(--jaipur-peacock)]" />
              Severity: <strong className="text-[var(--jaipur-text)] uppercase">{event.severity}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--jaipur-terracotta)] text-white text-xs font-semibold hover:bg-[var(--jaipur-terracotta-dark)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
