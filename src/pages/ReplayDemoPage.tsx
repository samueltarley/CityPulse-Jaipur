import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { replayController } from '../replay/replayController';
import { demoScenarioRunner, DEMO_SCENARIOS } from '../replay/demoScenarioRunner';
import { ReplayTimelineScrubber } from '../components/replay/ReplayTimelineScrubber';
import { JharokhaCard } from '../components/theme/JharokhaCard';
import { HeroPulseCard } from '../components/dashboard/HeroPulseCard';
import { JaipurCityMap } from '../components/dashboard/JaipurCityMap';
import { CorrelationsPanel } from '../components/dashboard/CorrelationsPanel';
import { AnalyticsCharts } from '../components/dashboard/AnalyticsCharts';
import {
  History,
  Play,
  RotateCcw,
  Sparkles,
  CloudRain,
  Sun,
  Wind,
  Users,
  Flame,
  AlertTriangle,
  Radio,
  Zap,
  Clock,
  Layers,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { DemoScenarioId } from '../types';

export const ReplayDemoPage: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    isReplayMode,
    activeDemoScenarioId,
    setActiveTab,
    pulseMetrics,
    events,
    correlations,
  } = useAppStore();

  const handleLaunchScenario = (scenarioId: DemoScenarioId) => {
    // If currently in historical replay, exit first to inject on live
    if (isReplayMode) {
      replayController.exitReplayMode();
    }
    demoScenarioRunner.runScenario(scenarioId);
  };

  const handleResetDemo = () => {
    demoScenarioRunner.resetScenario();
  };

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case 'CloudRain':
        return <CloudRain className="h-5 w-5 text-sky-500" />;
      case 'Sun':
        return <Sun className="h-5 w-5 text-rose-500" />;
      case 'Wind':
        return <Wind className="h-5 w-5 text-amber-500" />;
      case 'Users':
        return <Users className="h-5 w-5 text-purple-500" />;
      case 'Flame':
        return <Flame className="h-5 w-5 text-red-600" />;
      case 'AlertTriangle':
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#280D1F] p-6 sm:p-8 border border-[#E0F2F5] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCF1F4] text-[#0891B2] dark:text-[#38BDF8] text-xs font-bold border border-[#CCF1F4] dark:border-[#521E3B]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Historical Replay & Demo Scenarios (Spec Section 8.5)</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F3E48] dark:text-[#FFD1DC] tracking-tight">
              {language === 'hi' ? 'ऐतिहासिक रिप्ले व लाइव डेमो सिमुलेशन केंद्र' : 'Replay & Live Demo Simulator'}
            </h2>
            <p className="text-sm text-[#3E6B75] dark:text-[#E3B0C4] leading-relaxed">
              {language === 'hi'
                ? 'लाइव जजों व मूल्यांकनकर्ताओं के लिए निर्मित: 7-दिवसीय ऐतिहासिक समयरेखा को स्क्रब करें अथवा लाइव स्ट्रीम पर 60-90 सेकंड के पूर्व-लिखित बहु-सिस्टम नागरिक संकट परिदृश्यों को इंजेक्ट करें।'
                : 'Designed for live evaluation: Scrub through a deterministic 7-day identical-every-run historical dataset, or inject scripted 60–90s multi-source stress scenarios on top of live telemetry.'}
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {isReplayMode ? (
              <button
                type="button"
                onClick={() => replayController.exitReplayMode()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-rose-900 hover:bg-amber-50 font-bold text-xs shadow-md transition-colors cursor-pointer border border-rose-300"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{language === 'hi' ? 'लाइव टेलीमेट्री पर लौटें' : 'Back to Live Stream'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => replayController.enterReplayMode()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <History className="h-4 w-4" />
                <span>{language === 'hi' ? '7-दिवसीय रिप्ले लोड करें' : 'Launch 7-Day Replay'}</span>
              </button>
            )}

            {activeDemoScenarioId && (
              <button
                type="button"
                onClick={handleResetDemo}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{language === 'hi' ? 'सक्रिय डेमो रीसेट करें' : 'Reset Active Demo'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SECTION 1: 7-DAY DETERMINISTIC HISTORICAL REPLAY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--jaipur-border)] pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)]">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                {language === 'hi' ? '1. ऐतिहासिक रिप्ले (7-दिवसीय डेटासेट)' : '1. Historical Replay (7-Day Seeded Dataset)'}
              </h3>
              <p className="text-xs text-[var(--jaipur-text-secondary)]">
                {language === 'hi'
                  ? 'समान बीजारोपण (सीडेड) डेटासेट: डे 2 जलभराव, डे 4 लू, डे 5 आंधी, डे 6 तीज उत्सव। संपूर्ण इंजन रिप्ले पर दौड़ता है।'
                  : 'Identical-every-run generator passed through real adapters with 10x, 60x, 360x speeds & jump markers.'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Scrubber Component */}
        <ReplayTimelineScrubber />
      </section>

      {/* 3. SECTION 2: LIVE DEMO SCENARIOS (6 PROGRESSIVE SCRIPTED INJECTIONS) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--jaipur-border)] pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--jaipur-peacock)]/15 text-[var(--jaipur-peacock)]">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                {language === 'hi' ? '2. लाइव डेमो परिदृश्य (60–90 सेकंड स्क्रिप्टेड)' : '2. Live Demo Stress Scenarios (60–90s Injected)'}
              </h3>
              <p className="text-xs text-[var(--jaipur-text-secondary)]">
                {language === 'hi'
                  ? 'लाइव स्ट्रीम पर तात्कालिक परीक्षण: मौसम/एक्यूआई ओवरराइड, मल्टी-सोर्स विसंगतियां, नब्ज़ एजेंट व जेमिनी सारांश ऑटो-ट्रिगर।'
                  : 'Inject staged multi-source events over 60–90 seconds. Nabz Agent and Gemini immediately react.'}
              </p>
            </div>
          </div>

          {activeDemoScenarioId && (
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                Active: {activeDemoScenarioId.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={handleResetDemo}
                className="text-xs px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Reset Demo
              </button>
            </div>
          )}
        </div>

        {/* The 6 Demo Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEMO_SCENARIOS.map((sc) => {
            const isActive = activeDemoScenarioId === sc.id;

            return (
              <div
                key={sc.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-5 ${
                  isActive
                    ? 'border-rose-500 bg-rose-500/10 shadow-lg ring-2 ring-rose-500/50'
                    : 'border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] hover:border-[var(--jaipur-terracotta)] shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)]">
                        {getScenarioIcon(sc.iconName)}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-[var(--jaipur-text)] leading-snug">
                          {language === 'hi' ? sc.titleHi : sc.titleEn}
                        </h4>
                        <span className="text-[11px] font-mono text-[var(--jaipur-text-muted)]">
                          {sc.zones.map((z) => z.replace('_', ' ')).join(', ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-[var(--jaipur-text-secondary)] font-bold">
                      {sc.durationSeconds}s
                    </span>
                  </div>

                  {/* Description of staged cascade */}
                  <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
                    {language === 'hi' ? sc.descriptionHi : sc.descriptionEn}
                  </p>

                  {/* Weather Override details */}
                  {sc.weatherOverride && (
                    <div className="p-2 rounded-lg bg-[var(--jaipur-surface-warm)]/70 border border-[var(--jaipur-border)] text-[11px] font-mono text-[var(--jaipur-text-muted)] space-y-0.5">
                      <span className="font-bold text-[10px] text-[var(--jaipur-terracotta)] block">
                        OVERRIDE METRICS (TAGGED [DEMO]):
                      </span>
                      {sc.weatherOverride.temperatureC !== undefined && (
                        <span>Temp: {sc.weatherOverride.temperatureC}°C • </span>
                      )}
                      {sc.weatherOverride.rainMm !== undefined && (
                        <span>Rain: {sc.weatherOverride.rainMm} mm/h • </span>
                      )}
                      {sc.weatherOverride.aqi !== undefined && (
                        <span>AQI: {sc.weatherOverride.aqi} ({sc.weatherOverride.aqiCategory}) • </span>
                      )}
                      {sc.weatherOverride.windGustsKmh !== undefined && (
                        <span>Gusts: {sc.weatherOverride.windGustsKmh} km/h</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Button */}
                <div className="pt-4 mt-3 border-t border-[var(--jaipur-border)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--jaipur-text-muted)]">
                    {isActive ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                        Injected & Running
                      </span>
                    ) : (
                      '4-stage injection'
                    )}
                  </span>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={handleResetDemo}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLaunchScenario(sc.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta-deep)] text-white font-bold text-xs shadow transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>{language === 'hi' ? 'इंजेक्ट करें' : 'Inject Demo'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. SECTION 3: EMBEDDED DASHBOARD MONITOR */}
      {/* Enables judges to see the heartbeat, map, and links reacting right on this page */}
      <section className="space-y-4 pt-4 border-t border-[var(--jaipur-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--jaipur-border)] pb-2">
          <div>
            <h3 className="font-display text-lg font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center gap-2">
              <span>{language === 'hi' ? 'लाइव सिमुलेशन मॉनिटर' : 'Real-Time Simulation Monitor'}</span>
              <span className="text-xs normal-case px-2 py-0.5 rounded-full bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] font-mono font-bold">
                Pulse: {pulseMetrics.cityScore} • {events.length} Events Active
              </span>
            </h3>
            <p className="text-xs text-[var(--jaipur-text-secondary)]">
              {language === 'hi'
                ? 'रिप्ले व डेमो परिदृश्यों के दौरान नक्शा, नब्ज़ स्कोर और संभावित संबंध वास्तविक समय में प्रतिक्रिया देते हैं।'
                : 'The entire intelligence stack (ECG heartbeat, GIS map, possible links, and charts) reacts synchronously.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-1 text-xs font-bold text-[var(--jaipur-terracotta)] hover:underline self-start sm:self-auto cursor-pointer"
          >
            <span>View Full City Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Live ECG Heartbeat & AI Assessment Card */}
        <HeroPulseCard />

        {/* Split Grid: Interactive Map + Correlations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <JaipurCityMap />
          </div>
          <div className="lg:col-span-1">
            <CorrelationsPanel />
          </div>
        </div>

        {/* Telemetry Charts */}
        <AnalyticsCharts />
      </section>
    </div>
  );
};
