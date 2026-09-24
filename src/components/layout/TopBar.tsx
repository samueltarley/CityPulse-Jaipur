import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { PulseBadge } from '../theme/PulseBadge';
import { formatTimeIST, formatDateIST } from '../../utils/dateFormat';
import {
  Sun,
  Moon,
  Clock,
  ShieldCheck,
  User,
  Languages,
  WifiOff,
  Bell,
  Play,
  Square,
} from 'lucide-react';
import { demoScenarioRunner } from '../../replay/demoScenarioRunner';
import { replayController } from '../../replay/replayController';

export const TopBar: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const {
    role,
    setRole,
    setActiveTab,
    theme,
    toggleTheme,
    setIsStaffAuthModalOpen,
    staffUsername,
    isLiveAlertsOpen,
    toggleLiveAlerts,
    unreadAlertsCount,
    events,
    activeDemoScenarioId,
    isReplayMode,
  } = useAppStore();

  const isDemoRunning = Boolean(activeDemoScenarioId);

  const handleDemoToggle = () => {
    if (isDemoRunning) {
      demoScenarioRunner.resetScenario();
    } else {
      if (isReplayMode) {
        replayController.exitReplayMode();
      }
      demoScenarioRunner.runScenario('monsoon_flood');
      setActiveTab('dashboard');

      setTimeout(() => {
        const mapEl = document.getElementById('city-pulse-map');
        if (mapEl) {
          mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 350, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  const activeAlertsCount = unreadAlertsCount > 0 ? unreadAlertsCount : Math.min(6, events.length);

  // Live IST Clock (Asia/Kolkata timezone: UTC+5:30)
  const [istTime, setIstTime] = useState<string>('');
  const [istDate, setIstDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(formatTimeIST(now));
      setIstDate(formatDateIST(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#A61045]/30 bg-gradient-to-r from-[#D9707E] via-[#CE3E68] to-[#C2185B] text-white shadow-md shadow-[#C2185B]/20 relative overflow-hidden transition-colors duration-300">
      {/* Subtle White Hawa Mahal / Jharokha Window Lattice Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-10 select-none overflow-hidden" aria-hidden="true">
        <svg className="w-full h-full" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hawa-mahal-jharokha-pattern" width="60" height="40" patternUnits="userSpaceOnUse">
              {/* Jharokha Window silhouette */}
              <path
                d="M15 35 L15 18 C15 10 22 5 30 5 C38 5 45 10 45 18 L45 35 Z"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <path
                d="M20 35 L20 20 C20 14 25 10 30 10 C35 10 40 14 40 20 L40 35"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
              <circle cx="30" cy="5" r="2" fill="#FFFFFF" />
              <circle cx="30" cy="22" r="1.5" fill="#FFFFFF" />
              <line x1="10" y1="35" x2="50" y2="35" stroke="#FFFFFF" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hawa-mahal-jharokha-pattern)" />
        </svg>
      </div>

      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 font-medium tracking-wide relative z-10">
          <WifiOff className="h-3.5 w-3.5 animate-pulse" />
          <span>
            {language === 'hi'
              ? 'नेटवर्क विच्छेद: सिटीपल्स स्थानीय टेलीमेट्री मॉडल पर सुचारू रूप से कार्य कर रहा है।'
              : 'Network Disconnected: CityPulse is operating smoothly using cached telemetry and deterministic models.'}
          </span>
        </div>
      )}

      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Left: Royal Crest Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-lg ring-2 ring-white/40">
            {/* Cusped arch mini logo with pulse wave */}
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Rajput jharokha arch contour */}
              <path d="M4 21V11C4 7 7 4 12 4C17 4 20 7 20 11V21" />
              {/* Dynamic pulse beat */}
              <path d="M7 14H10L12 9L14 17L16 14H17" strokeWidth="2.5" stroke="#F2A93B" />
            </svg>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#F2A93B] ring-2 ring-white shadow-xs" />
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 sm:gap-2 whitespace-nowrap">
              <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0">
                {t('appName')}
              </h1>
              <span className="hidden sm:inline-block font-display text-xs sm:text-sm font-semibold text-[#FFFAF5]/90 whitespace-nowrap">
                • {t('appHindiSubtitle')}
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-white/80 -mt-0.5 tracking-wide font-medium whitespace-nowrap truncate max-w-[320px] lg:max-w-[450px]">
              {t('subTagline')}
            </p>
          </div>
        </div>

        {/* Center: Live IST Clock & Pulse Badge */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md px-3.5 py-1.5 border border-white/25 text-xs text-white shadow-xs">
            <Clock className="h-3.5 w-3.5 text-[#F2A93B]" />
            <span className="font-mono font-bold text-white">{istTime || '12:00:00 PM'}</span>
            <span className="text-white/40">|</span>
            <span className="text-white/90">{istDate}</span>
            <span className="font-bold text-[10px] text-[#0891B2] bg-[#F2A93B] px-1.5 py-0.2 rounded-md font-mono shadow-xs">
              IST
            </span>
          </div>

          <PulseBadge />
        </div>

        {/* Right Controls: Role Switcher, Language Toggle, Day/Raat */}
        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0 max-w-full">
          {/* Mobile Pulse Badge (Compact) */}
          <div className="lg:hidden shrink-0">
            <PulseBadge compact />
          </div>

          {/* Role Switcher Pill */}
          <div className="flex items-center rounded-xl bg-black/20 p-0.5 sm:p-1 border border-white/20 backdrop-blur-sm shrink-0">
            <button
              type="button"
              onClick={() => setRole('resident')}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                role === 'resident'
                  ? 'bg-white text-[#0891B2] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title={t('roleResident')}
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t('roleResident')}</span>
              <span className="md:hidden text-[10px] sm:text-xs">नागरिक</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff');
                if (role !== 'staff') {
                  setIsStaffAuthModalOpen(true);
                }
              }}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                role === 'staff'
                  ? 'bg-[#F2A93B] text-[#0891B2] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title={role === 'staff' ? `Logged in: ${staffUsername || 'STARKTECH'}` : t('roleStaff')}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {role === 'staff' && staffUsername ? staffUsername : t('roleStaff')}
              </span>
              <span className="md:hidden text-[10px] sm:text-xs">निगम</span>
            </button>
          </div>

          {/* Demo: Monsoon Flood Quick Trigger Button */}
          <button
            type="button"
            onClick={handleDemoToggle}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border shrink-0 ${
              isDemoRunning
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : 'bg-amber-500/25 hover:bg-amber-500/35 border-amber-300/50 text-amber-100 hover:text-white'
            }`}
            title={isDemoRunning ? t('stopDemo') : t('demoMonsoonFlood')}
          >
            {isDemoRunning ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('stopDemo')}</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('demoMonsoonFlood')}</span>
              </>
            )}
          </button>

          {/* Live Alerts Notification Bell */}
          <button
            type="button"
            onClick={toggleLiveAlerts}
            className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 ${
              isLiveAlertsOpen
                ? 'bg-white text-[#0891B2] border-white shadow-md'
                : 'border-white/30 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25'
            }`}
            aria-label="Toggle Live Alerts"
            title={t('liveAlerts')}
          >
            <Bell className="h-4 w-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-1 ring-white">
                {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
              </span>
            )}
          </button>

          {/* Language Toggle (EN | हिंदी) */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-xl border border-white/30 bg-white/15 backdrop-blur-sm text-xs font-bold text-white hover:bg-white/25 transition-all cursor-pointer shadow-xs shrink-0"
            aria-label="Toggle language"
            title={`Switch to ${language === 'en' ? 'हिंदी' : 'English'}`}
          >
            <Languages className="h-3.5 w-3.5 text-[#F2A93B] shrink-0" />
            <span className="text-[11px] sm:text-xs">{language === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>

          {/* Day / Raat Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all cursor-pointer shadow-xs shrink-0"
            aria-label="Toggle Day / Raat mode"
            title={theme === 'day' ? t('raatMode') : t('dayMode')}
          >
            {theme === 'day' ? (
              <Moon className="h-4 w-4 text-white" />
            ) : (
              <Sun className="h-4 w-4 text-[#F2A93B]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
