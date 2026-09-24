import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { getPulseBand, getBandDetails } from '../../engine/pulseScore';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Clock,
} from 'lucide-react';
import { RosetteSpinner } from '../theme/RosetteSpinner';
import { CityVitalRhythm } from '../theme/CityVitalRhythm';
import { InfoTooltip } from '../common/InfoTooltip';

export const HeroPulseCard: React.FC = () => {
  const { language } = useLanguage();
  const { pulseMetrics, citySummary, theme } = useAppStore();
  const { cityScore, trend, band, zoneDetails, summaryEn, summaryHi } = pulseMetrics;

  // First impression requirement: Hero card shows rosette loader for 2-3 seconds on initial launch
  const [isCalibrating, setIsCalibrating] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window as any).__citypulse_calibrated) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!isCalibrating) return;
    const timer = setTimeout(() => {
      setIsCalibrating(false);
      if (typeof window !== 'undefined') {
        (window as any).__citypulse_calibrated = true;
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [isCalibrating]);

  const bandInfo = getBandDetails(band);
  const bandLabel = language === 'hi' ? bandInfo.labelHi : bandInfo.labelEn;
  const currentSummary = citySummary
    ? language === 'hi'
      ? citySummary.hi
      : citySummary.en
    : language === 'hi'
    ? summaryHi
    : summaryEn;

  const TrendIcon = trend === 'improving' ? ArrowUpRight : trend === 'deteriorating' ? ArrowDownRight : Minus;
  const trendLabel =
    trend === 'improving'
      ? language === 'hi' ? 'सुधार की ओर (+)' : 'Improving (+)'
      : trend === 'deteriorating'
      ? language === 'hi' ? 'दबाव बढ़ रहा है (-)' : 'Deteriorating (-)'
      : language === 'hi' ? 'स्थिर स्थिति (=)' : 'Stable (=)';

  // Count zones by band
  const bandCounts = {
    calm: 0,
    watch: 0,
    stressed: 0,
    critical: 0,
  };
  Object.values(zoneDetails).forEach((z) => {
    if (bandCounts[z.band] !== undefined) {
      bandCounts[z.band]++;
    }
  });

  if (isCalibrating) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] p-8 sm:p-12 shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none flex flex-col items-center justify-center min-h-[240px] text-center transition-all duration-300">
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-md">
          <RosetteSpinner size="lg" />
          <div className="flex flex-col items-center gap-1.5 mt-1">
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#0F3E48] dark:text-[#FFD1DC] tracking-wide">
              {language === 'hi'
                ? 'शहर की नब्ज़ देख रहे हैं...'
                : "Checking your city's pulse..."}
            </h3>
            <p className="text-[13px] text-[#3E6B75] dark:text-[#E3B0C4] font-medium">
              {language === 'hi'
                ? 'जयपुर के सभी 9 प्रशासनिक इलाकों से ताज़ा अपडेट संकलित किए जा रहे हैं'
                : 'Collecting latest updates across all 9 Jaipur neighborhoods'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] p-6 shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none transition-all duration-200 animate-card-fade-in hover-lift">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Score & 10-Second Assessment */}
        <div className="flex-1 max-w-2xl">
          {/* Header pill */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${bandInfo.bgClass}`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'जयपुर की नब्ज़' : 'Citywide Pulse'}</span>
              <span>•</span>
              <span className="uppercase">{bandLabel}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F3E48] dark:text-[#E3B0C4] bg-[#CCF1F4] dark:bg-[#36142B] px-2.5 py-1 rounded-lg border border-[#CCF1F4] dark:border-[#521E3B]">
              <TrendIcon className="h-3.5 w-3.5 text-[#0891B2]" />
              <span>{trendLabel}</span>
            </span>

            <InfoTooltip
              title={language === 'hi' ? 'सिटी पल्स क्या है?' : 'What is City Pulse?'}
              content={
                language === 'hi'
                  ? 'सिटी पल्स (0-100) यह दिखाता है कि पूरे जयपुर में ट्रैफ़िक, सफ़ाई, हवा की गुणवत्ता और बिजली-पानी की व्यवस्था अभी कितनी सुचारू रूप से चल रही है।'
                  : 'City Pulse (0-100) measures how smoothly traffic, sanitation, air quality, water, and power are running across Jaipur right now.'
              }
            />
          </div>

          {/* Big Pulse Score Number */}
          <div className="flex items-baseline gap-3 my-2">
            <span
              className="font-display text-5xl sm:text-6xl font-bold tracking-tight transition-colors duration-300"
              style={{ color: bandInfo.color }}
            >
              {cityScore}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#3E6B75] dark:text-[#E3B0C4]">/ 100</span>
              <div className="flex items-center gap-1">
                <span
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: bandInfo.color }}
                >
                  {language === 'hi' ? `स्थिति: ${bandLabel}` : `STATUS: ${bandLabel}`}
                </span>
                <InfoTooltip
                  title={language === 'hi' ? 'स्थिति के स्तर' : 'Pulse Levels'}
                  content={
                    language === 'hi'
                      ? 'शांत (80-100): सब सामान्य। सतर्क (60-79): हल्की देरी। तनावग्रस्त (40-59): ट्रैफ़िक या शिकायतें। गंभीर (0-39): तत्काल सुधार कार्य जारी।'
                      : 'Calm (80-100): Normal & peaceful. Watch (60-79): Minor rush. Stressed (40-59): Heavy traffic or delays. Critical (0-39): Urgent attention needed.'
                  }
                />
              </div>
            </div>
          </div>

          {/* Citizen Pulse Brief */}
          <div className="mt-4 rounded-xl bg-[#F0FCFD] dark:bg-[#36142B]/40 border border-[#E0F2F5] dark:border-[#521E3B] p-4 transition-all">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E0F2F5] dark:border-[#521E3B]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E0F7FA] text-[#0F3E48] text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-[#0891B2]" />
                  <span>{language === 'hi' ? 'यहाँ क्या हो रहा है' : "What's Happening in Jaipur"}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {citySummary?.timeLabel && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3E6B75] dark:text-[#E3B0C4] font-semibold">
                    <Clock className="h-3.5 w-3.5 text-[#0891B2]" />
                    <span>
                      {language === 'hi'
                        ? `समय: ${citySummary.timeLabel}`
                        : `Updated: ${citySummary.timeLabel}`}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-base leading-relaxed text-[#1F4E5A] dark:text-[#FFF0F5] font-normal">
              {currentSummary}
            </p>
          </div>

          {/* Zone Distribution Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[13px] font-bold text-[#0F3E48] dark:text-[#E3B0C4]">
              {language === 'hi' ? '9 प्रशासनिक इलाके:' : '9 Jaipur Areas:'}
            </span>
            {bandCounts.calm > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs">
                {bandCounts.calm} {language === 'hi' ? 'शांत' : 'Calm'}
              </span>
            )}
            {bandCounts.watch > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 font-bold text-xs">
                {bandCounts.watch} {language === 'hi' ? 'सतर्क' : 'Watch'}
              </span>
            )}
            {bandCounts.stressed > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/15 text-orange-800 dark:text-orange-400 border border-orange-500/30 font-bold text-xs">
                {bandCounts.stressed} {language === 'hi' ? 'तनावग्रस्त' : 'Stressed'}
              </span>
            )}
            {bandCounts.critical > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-800 dark:text-rose-400 border border-rose-500/30 font-bold text-xs">
                {bandCounts.critical} {language === 'hi' ? 'गंभीर' : 'Critical'}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Animated ECG Oscilloscope Display */}
        <div className="w-full lg:w-[380px] flex flex-col rounded-xl border border-[#E0F2F5] dark:border-[#521E3B] bg-[#F0FCFD] dark:bg-black/40 overflow-hidden shrink-0 max-w-full">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#E0F2F5] dark:border-[#521E3B] bg-[#CCF1F4] dark:bg-[#36142B]/60 text-[11px] gap-1 flex-nowrap">
            <div className="flex items-center gap-1.5 font-mono font-bold text-[#0F3E48] dark:text-[#FFD1DC] shrink-0 truncate">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: bandInfo.color }}
              />
              <span className="truncate text-[10px] sm:text-[11px]">{language === 'hi' ? 'नागरिक जीवन की लय' : 'CITY VITAL RHYTHM'}</span>
            </div>
            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#0F3E48] dark:text-[#FFD1DC] shrink-0 whitespace-nowrap">
              {band === 'calm'
                ? (language === 'hi' ? '72 BPM • सामान्य' : '72 BPM • NORMAL')
                : band === 'watch'
                ? (language === 'hi' ? '88 BPM • बढ़ा हुआ' : '88 BPM • ELEVATED')
                : band === 'stressed'
                ? (language === 'hi' ? '112 BPM • तेज़ स्पंदन' : '112 BPM • TACHY')
                : (language === 'hi' ? '138 BPM • गंभीर' : '138 BPM • CRITICAL')}
            </span>
          </div>

          <div className="relative p-1.5 flex items-center justify-center bg-[#F0FCFD] dark:bg-black/20 h-[120px]">
            <CityVitalRhythm
              score={cityScore}
              band={band}
              color={bandInfo.color}
              theme={theme}
              className="h-[120px]"
            />
          </div>

          <div className="hidden min-[380px]:flex px-3.5 py-2 border-t border-[#E0F2F5] dark:border-[#521E3B] items-center justify-between text-[11px] text-[#1F4E5A] dark:text-[#E3B0C4] bg-[#CCF1F4]/40 dark:bg-transparent">
            <span className="font-mono font-semibold text-[#0F3E48] dark:text-[#E3B0C4]">
              W:20% • AQ:20% • T:20% • C:25% • P:15%
            </span>
            <span className="font-mono text-[#3E6B75] dark:text-[#E3B0C4] font-semibold">
              {language === 'hi' ? 'भारित औसत' : 'Weighted Avg'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
