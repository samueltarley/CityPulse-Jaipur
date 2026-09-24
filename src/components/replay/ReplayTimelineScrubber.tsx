import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { replayController } from '../../replay/replayController';
import { get7DayReplayDataset, ONE_DAY_MS } from '../../replay/seededGenerator';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Clock,
  Calendar,
  AlertTriangle,
  Link2,
  Sparkles,
  Info,
  ChevronRight,
  Flame,
  CloudRain,
  Wind,
  Users,
} from 'lucide-react';
import { ReplayTimelineMarker } from '../../types';

export const ReplayTimelineScrubber: React.FC = () => {
  const { language } = useLanguage();
  const {
    isReplayMode,
    replayCurrentTimestamp,
    replayStartTimestamp,
    replayEndTimestamp,
    isReplayPlaying,
    replaySpeed,
    replayTimelineMarkers,
  } = useAppStore();

  const [activeTooltipMarker, setActiveTooltipMarker] = useState<ReplayTimelineMarker | null>(null);

  const dataset = get7DayReplayDataset();
  const startTs = replayStartTimestamp || dataset.startTimestamp;
  const endTs = replayEndTimestamp || dataset.endTimestamp;
  const totalDuration = endTs - startTs;
  const currentTs = replayCurrentTimestamp || startTs;

  // Percentage progress across 7 days
  const progressPct = Math.max(0, Math.min(100, ((currentTs - startTs) / totalDuration) * 100));

  // Determine current Day (1 to 7)
  const elapsed = currentTs - startTs;
  const currentDayIndex = Math.min(7, Math.max(1, Math.floor(elapsed / ONE_DAY_MS) + 1));

  // Date and Time formatted string
  const formattedDateTime = new Date(currentTs).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const targetTimestamp = startTs + (val / 100) * totalDuration;
    replayController.scrubTo(targetTimestamp);
  };

  const jumpToMarker = (marker: ReplayTimelineMarker) => {
    replayController.scrubTo(marker.timestamp);
    useAppStore.getState().addToast({
      title: `Jumped to ${marker.timeLabel}`,
      message: marker.titleEn,
      type: marker.severity === 'critical' ? 'critical' : 'warning',
    });
  };

  const getMarkerIcon = (marker: ReplayTimelineMarker) => {
    if (marker.scenarioKey === 'monsoon') return <CloudRain className="h-3 w-3 text-sky-400" />;
    if (marker.scenarioKey === 'heatwave') return <Flame className="h-3 w-3 text-rose-400" />;
    if (marker.scenarioKey === 'dust_storm') return <Wind className="h-3 w-3 text-amber-400" />;
    if (marker.scenarioKey === 'festival') return <Users className="h-3 w-3 text-purple-400" />;
    if (marker.type === 'correlation') return <Link2 className="h-3 w-3 text-emerald-400" />;
    return <AlertTriangle className="h-3 w-3 text-amber-300" />;
  };

  return (
    <div className="rounded-2xl border-2 border-[var(--jaipur-terracotta)]/40 bg-[var(--jaipur-surface)] p-5 sm:p-6 shadow-md space-y-5">
      {/* Header with Title and Mode status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--jaipur-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-[var(--jaipur-text)]">
                {language === 'hi' ? '7-दिवसीय ऐतिहासिक समय-नियंत्रक (स्क्रबर)' : '7-Day Historical Timeline Scrubber'}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] font-bold">
                Day {currentDayIndex} of 7
              </span>
            </div>
            <p className="text-xs text-[var(--jaipur-text-secondary)] mt-0.5">
              {language === 'hi'
                ? 'समयरेखा पर स्लाइड करें, किसी घटना मार्कर पर क्लिक करके सीधे उस क्षण पर जाएं।'
                : 'Scrub through Monday to Sunday. Engine recalculates pulse, anomalies, & links in real time.'}
            </p>
          </div>
        </div>

        {/* Current Replay Timestamp Display */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] self-start sm:self-auto font-mono text-xs">
          <Calendar className="h-3.5 w-3.5 text-[var(--jaipur-terracotta)]" />
          <span className="font-bold text-[var(--jaipur-text)]">{formattedDateTime}</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded font-bold">
            IST
          </span>
        </div>
      </div>

      {/* Main Scrubber Control & Visual Timeline */}
      <div className="space-y-3">
        {/* Timeline Day Markers header */}
        <div className="grid grid-cols-7 text-[10px] font-mono font-bold text-[var(--jaipur-text-muted)] text-center">
          <span className={currentDayIndex === 1 ? 'text-[var(--jaipur-terracotta)] underline' : ''}>Day 1 • Mon</span>
          <span className={currentDayIndex === 2 ? 'text-sky-600 font-black underline' : ''}>Day 2 • Flood 🌧️</span>
          <span className={currentDayIndex === 3 ? 'text-[var(--jaipur-terracotta)] underline' : ''}>Day 3 • Wed</span>
          <span className={currentDayIndex === 4 ? 'text-rose-600 font-black underline' : ''}>Day 4 • Heatwave ☀️</span>
          <span className={currentDayIndex === 5 ? 'text-amber-600 font-black underline' : ''}>Day 5 • Dust 🌪️</span>
          <span className={currentDayIndex === 6 ? 'text-purple-600 font-black underline' : ''}>Day 6 • Teej 👑</span>
          <span className={currentDayIndex === 7 ? 'text-[var(--jaipur-terracotta)] underline' : ''}>Day 7 • Sun</span>
        </div>

        {/* The Scrubber Bar with interactive markers */}
        <div className="relative pt-4 pb-2">
          {/* Background track */}
          <div className="relative h-3 w-full rounded-full bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--jaipur-terracotta)] to-[var(--jaipur-peacock)] transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Embedded Timeline Markers on top of track */}
          <div className="relative h-6 w-full -mt-4.5 pointer-events-none">
            {replayTimelineMarkers.map((marker) => {
              const markerPct = Math.max(0, Math.min(100, ((marker.timestamp - startTs) / totalDuration) * 100));
              const isPassed = currentTs >= marker.timestamp;

              return (
                <div
                  key={marker.id}
                  style={{ left: `${markerPct}%` }}
                  className="absolute -translate-x-1/2 pointer-events-auto cursor-pointer group"
                  onClick={() => jumpToMarker(marker)}
                  onMouseEnter={() => setActiveTooltipMarker(marker)}
                  onMouseLeave={() => setActiveTooltipMarker(null)}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 shadow-md flex items-center justify-center transition-all hover:scale-130 ${
                      marker.severity === 'critical'
                        ? 'bg-rose-900 border-rose-400 text-rose-200'
                        : marker.type === 'correlation'
                        ? 'bg-emerald-900 border-emerald-400 text-emerald-200'
                        : 'bg-amber-900 border-amber-400 text-amber-200'
                    } ${isPassed ? 'ring-2 ring-[var(--jaipur-terracotta)]' : 'opacity-80'}`}
                  >
                    {getMarkerIcon(marker)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Native Range Slider for smooth scrubbing */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.05"
            value={progressPct}
            onChange={handleSliderChange}
            className="w-full h-3 cursor-ew-resize opacity-0 absolute top-4 left-0 z-20"
            title="Drag to scrub through 7-day timeline"
          />
        </div>

        {/* Hover/Active Marker Preview Card */}
        {activeTooltipMarker && (
          <div className="rounded-xl bg-neutral-900 text-white p-3 text-xs border border-white/20 shadow-xl animate-in fade-in duration-150 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10 shrink-0">
              {getMarkerIcon(activeTooltipMarker)}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 font-mono">{activeTooltipMarker.timeLabel}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-white/20">
                  {activeTooltipMarker.type}
                </span>
              </div>
              <h5 className="font-semibold text-sm">{language === 'hi' ? activeTooltipMarker.titleHi : activeTooltipMarker.titleEn}</h5>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                {language === 'hi' ? activeTooltipMarker.descriptionHi : activeTooltipMarker.descriptionEn}
              </p>
              <button
                type="button"
                onClick={() => jumpToMarker(activeTooltipMarker)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                <span>Jump to this timestamp</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls & Speed Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--jaipur-border)]">
        {/* Play, Pause, Step Buttons */}
        <div className="flex items-center gap-2">
          {!isReplayMode ? (
            <button
              type="button"
              onClick={() => replayController.enterReplayMode()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta-deep)] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{language === 'hi' ? '7-दिवसीय रिप्ले प्रारंभ करें' : 'Start 7-Day Replay'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => replayController.togglePlay()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow transition-colors cursor-pointer ${
                  isReplayPlaying
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isReplayPlaying ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Resume Playback</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => replayController.scrubTo(startTs)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--jaipur-surface-warm)] hover:bg-[var(--jaipur-border)] text-[var(--jaipur-text)] text-xs font-medium border border-[var(--jaipur-border)] transition-colors cursor-pointer"
                title="Restart from Monday 00:00"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart (Day 1)</span>
              </button>
            </>
          )}
        </div>

        {/* Speed Toggles: 10x, 60x, 360x */}
        <div className="flex items-center gap-1 bg-[var(--jaipur-surface-warm)] p-1 rounded-xl border border-[var(--jaipur-border)]">
          <span className="text-[11px] font-mono text-[var(--jaipur-text-secondary)] px-2 font-medium flex items-center gap-1">
            <FastForward className="h-3 w-3 text-[var(--jaipur-terracotta)]" />
            Speed:
          </span>
          {([10, 60, 360] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => replayController.setSpeed(spd)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                replaySpeed === spd
                  ? 'bg-[var(--jaipur-terracotta)] text-white shadow-sm'
                  : 'text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Scenario Jump Links (Spec 8.5) */}
      <div className="space-y-2 pt-2 border-t border-[var(--jaipur-border)]">
        <div className="flex items-center justify-between text-xs text-[var(--jaipur-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            {language === 'hi' ? 'पूर्व-निर्धारित ऐतिहासिक परिदृश्य (सीधे जाएं)' : 'Embedded Key Scenario Moments (Click to Jump):'}
          </span>
          <span>4 Scripted Milestones</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {replayTimelineMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={() => {
                if (!isReplayMode) {
                  replayController.enterReplayMode(marker.timestamp);
                } else {
                  jumpToMarker(marker);
                }
              }}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--jaipur-surface-warm)]/60 hover:bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)] text-left transition-all cursor-pointer group"
            >
              <div className="p-1.5 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] group-hover:border-[var(--jaipur-terracotta)] text-[var(--jaipur-terracotta)] mt-0.5">
                {getMarkerIcon(marker)}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-[var(--jaipur-terracotta)]">
                    {marker.timeLabel.split('•')[0]}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                    {marker.timeLabel.split('•')[1]}
                  </span>
                </div>
                <h6 className="text-xs font-bold text-[var(--jaipur-text)] truncate">
                  {language === 'hi' ? marker.titleHi : marker.titleEn}
                </h6>
                <p className="text-[10px] text-[var(--jaipur-text-secondary)] line-clamp-1">
                  {language === 'hi' ? marker.descriptionHi : marker.descriptionEn}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
