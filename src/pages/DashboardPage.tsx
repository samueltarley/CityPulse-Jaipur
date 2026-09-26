import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { HeroPulseCard } from '../components/dashboard/HeroPulseCard';
import { JaipurCityMap } from '../components/dashboard/JaipurCityMap';
import { ZoneJharokhaGrid } from '../components/dashboard/ZoneJharokhaGrid';
import { AgentActivityPanel } from '../components/dashboard/AgentActivityPanel';
import { CorrelationsPanel } from '../components/dashboard/CorrelationsPanel';
import { AnalyticsCharts } from '../components/dashboard/AnalyticsCharts';
import { ZoneDetailDrawer } from '../components/dashboard/ZoneDetailDrawer';
import { EventTicker } from '../components/verification/EventTicker';
import { SectionHeading } from '../components/theme/SectionHeading';
import { ChevronDown, ChevronUp, BarChart2, PhoneCall, HeartHandshake, ShieldAlert, Ambulance } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { language } = useLanguage();
  const { setSelectedZoneId, setActiveTab } = useAppStore();
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  React.useEffect(() => {
    const handleExpandStream = () => {
      setShowMoreDetails(true);
      setTimeout(() => {
        const el = document.getElementById('live-events-feed');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    };

    window.addEventListener('expand-live-events-stream', handleExpandStream);
    return () => window.removeEventListener('expand-live-events-stream', handleExpandStream);
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. City Pulse Heartbeat */}
      <HeroPulseCard />

      {/* 2. Public Care & Emergency Quick Access Bar */}
      <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs shrink-0">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                {language === 'hi' ? 'नागरिक सहायता व आपातकालीन सेवाएं' : 'Citizen Care & Emergency SOS'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                24x7 Active
              </span>
            </div>
            <p className="text-[11px] text-[var(--jaipur-text-muted)]">
              {language === 'hi'
                ? 'त्वरित कॉल: पुलिस (112), संपर्क (181), एम्बुलेंस (108), बिजली फॉल्ट (1912)'
                : 'One-tap dial: Police (112), Sampark (181), Ambulance (108), Power (1912)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="tel:112"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title="Dial Police / All-in-One 112"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>112 SOS</span>
          </a>

          <a
            href="tel:108"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title="Dial Ambulance 108"
          >
            <Ambulance className="h-3.5 w-3.5" />
            <span>108 Medical</span>
          </a>

          <a
            href="tel:181"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title="Dial Sampark 181"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>181 Sampark</span>
          </a>

          <button
            type="button"
            onClick={() => setActiveTab('public_help')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-xs font-bold text-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-surface)] transition-all cursor-pointer shadow-xs"
          >
            <span>{language === 'hi' ? 'संपूर्ण जन-सहायता केंद्र →' : 'Public Care Hub →'}</span>
          </button>
        </div>
      </div>

      {/* 3. Live City Map */}
      <div id="city-pulse-map">
        <JaipurCityMap />
      </div>

      {/* 4. All 9 Zone Cards */}
      <ZoneJharokhaGrid />

      {/* 5. What's Happening Here / Latest Updates */}
      <AgentActivityPanel mode="resident_advisory" />

      {/* 6. Collapsible Advanced Details & Charts (Closed by default for clean resident experience) */}
      <div className="rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] p-6 shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none">
        <button
          type="button"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F0FCFD] dark:hover:bg-[#36142B]/50 transition-colors cursor-pointer group min-h-[48px]"
          aria-expanded={showMoreDetails}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-[#CCF1F4] text-[#0891B2] group-hover:bg-[#0891B2] group-hover:text-white transition-colors">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                {language === 'hi' ? 'और अधिक विवरण व शहर के चार्ट देखें' : 'Show More City Details & Charts'}
              </h3>
              <p className="text-[13px] text-[#3E6B75] dark:text-[#E3B0C4] font-medium">
                {language === 'hi'
                  ? 'ऐतिहासिक रुझान, 15-मिनट डेटा चार्ट और घटना प्रवाह (वैकल्पिक)'
                  : 'Historical trends, possible connected events, and live technical stream (optional)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#0F3E48] px-3.5 py-1.5 rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-[#F0FCFD] dark:bg-[#280D1F]">
            <span>{showMoreDetails ? (language === 'hi' ? 'छुपाएं' : 'Hide Details') : (language === 'hi' ? 'विवरण खोलें' : 'Show Details')}</span>
            {showMoreDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showMoreDetails && (
          <div className="pt-6 mt-4 border-t border-[#E0F2F5] dark:border-[#521E3B] space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Possible Links / Connected Events */}
            <CorrelationsPanel />

            {/* Recharts Analytics */}
            <AnalyticsCharts />

            {/* Live Telemetry Event Ticker */}
            <div id="live-events-feed" className="space-y-4">
              <SectionHeading
                title={language === 'hi' ? 'ताज़ा घटना प्रवाह' : 'Live Event Stream & Updates'}
                subtitle={
                  language === 'hi'
                    ? 'नवीनतम पहले • 9 प्रशासनिक क्षेत्रों से मौसम, वायु गुणवत्ता, मेट्रो एवं नागरिक रिपोर्ट'
                    : 'Real-time incident ingestion across all municipal feeds with raw data inspector'
                }
              />
              <EventTicker />
            </div>
          </div>
        )}
      </div>

      {/* 7. Zone Detail Slide-Over Drawer */}
      <ZoneDetailDrawer />
    </div>
  );
};
