import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { replayController } from '../../replay/replayController';
import { demoScenarioRunner } from '../../replay/demoScenarioRunner';
import {
  History,
  RotateCcw,
  Play,
  Pause,
  FastForward,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export const ReplayBanner: React.FC = () => {
  const { language } = useLanguage();
  const {
    isReplayMode,
    replayCurrentTimestamp,
    isReplayPlaying,
    replaySpeed,
    activeDemoScenarioId,
    setActiveTab,
  } = useAppStore();

  if (!isReplayMode && !activeDemoScenarioId) {
    return null;
  }

  // Format current replay time in IST
  const formattedReplayTime = replayCurrentTimestamp
    ? new Date(replayCurrentTimestamp).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '';

  return (
    <div className="sticky top-[57px] sm:top-[65px] z-30 w-full transition-all duration-300">
      {/* 1. If in 7-Day Historical Replay Mode */}
      {isReplayMode && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white shadow-lg border-b border-amber-400/40 px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
            {/* Left badge & status */}
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-black/25 text-amber-200 border border-white/20 animate-pulse">
                <History className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black tracking-wider uppercase bg-black/30 px-2 py-0.5 rounded border border-white/20 text-amber-200">
                    {language === 'hi' ? 'ऐतिहासिक रिप्ले मोड सक्रिय' : 'REPLAY MODE ACTIVE'}
                  </span>
                  <span className="text-xs font-semibold hidden md:inline-block text-white/90">
                    {language === 'hi'
                      ? 'संपूर्ण डैशबोर्ड 7-दिवसीय ऐतिहासिक टेलीमेट्री पर चल रहा है'
                      : 'Entire dashboard & engine running on 7-day seeded replay'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-amber-100 font-mono">
                  <Clock className="h-3 w-3" />
                  <span>{formattedReplayTime} (IST)</span>
                  <span className="opacity-70">|</span>
                  <span className="font-bold">{replaySpeed}x Speed</span>
                </div>
              </div>
            </div>

            {/* Quick Controls & Back to Live Button */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => replayController.togglePlay()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/30 transition-colors cursor-pointer"
                title={isReplayPlaying ? 'Pause replay' : 'Play replay'}
              >
                {isReplayPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('replay')}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 text-amber-200 text-xs font-medium border border-white/20 transition-colors cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Scrubber & Scenarios</span>
              </button>

              <button
                type="button"
                onClick={() => replayController.exitReplayMode()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-rose-900 hover:bg-amber-100 font-bold text-xs shadow-md transition-transform hover:scale-105 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'लाइव पर वापस जाएं' : 'Back to Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. If a Live Injected Demo Scenario is actively running */}
      {activeDemoScenarioId && !isReplayMode && (
        <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 text-white shadow-lg border-b border-purple-400/40 px-3 sm:px-6 py-2.5">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-400/30 animate-spin" style={{ animationDuration: '4s' }}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black tracking-wider uppercase bg-purple-600/40 px-2 py-0.5 rounded border border-purple-400/40 text-purple-200">
                    DEMO SCENARIO INJECTED
                  </span>
                  <span className="text-xs font-medium text-purple-100">
                    Live municipal sensors overridden with scripted multi-system stress telemetry (60s).
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => demoScenarioRunner.resetScenario()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Demo to Live</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
