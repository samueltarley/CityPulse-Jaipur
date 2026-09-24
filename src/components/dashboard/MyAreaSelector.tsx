import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES } from '../../config/city';
import { getPulseBand, getBandDetails } from '../../engine/pulseScore';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  MapPin,
  Wind,
  Thermometer,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

export const MyAreaSelector: React.FC = () => {
  const { language } = useLanguage();
  const {
    userMyAreaZoneId,
    setUserMyAreaZoneId,
    setSelectedZoneId,
    setActiveTab,
    pulseMetrics,
    zoneWeatherAQI,
  } = useAppStore();

  const currentZone = JAIPUR_ZONES.find((z) => z.id === userMyAreaZoneId) || JAIPUR_ZONES[1]; // default Mansarovar
  const zoneDetail = pulseMetrics.zoneDetails[currentZone.id];
  const weather = zoneWeatherAQI[currentZone.id];

  const score = zoneDetail?.score ?? 78;
  const band = getPulseBand(score);
  const bandInfo = getBandDetails(band);
  const bandLabel = language === 'hi' ? bandInfo.labelHi : bandInfo.labelEn;

  // Derive friendly citizen tip
  const getCitizenTip = () => {
    const topIssue = zoneDetail?.topIssueEn || '';
    const aqi = weather?.aqi || 90;

    if (score >= 82) {
      return language === 'hi'
        ? `सब सामान्य है! ${currentZone.nameHi} में ट्रैफ़िक सुचारू है और सभी नागरिक सेवाएं अच्छे से चल रही हैं।`
        : `All clear! Roads in ${currentZone.nameEn} are moving smoothly with normal city services.`;
    }

    if (topIssue.toLowerCase().includes('water') || topIssue.toLowerCase().includes('drain')) {
      return language === 'hi'
        ? `जलभराव सुझाव: निचले इलाकों में धीमी गति से वाहन चलाएं। जल निकासी टीम मौके पर सक्रिय है।`
        : `Rain & water advisory: Low-lying junctions may have slight waterlogging. Keep a safe distance while driving.`;
    }

    if (topIssue.toLowerCase().includes('traffic') || topIssue.toLowerCase().includes('choke')) {
      return language === 'hi'
        ? `ट्रैफ़िक टिप: मुख्य चौराहे पर हल्का दबाव है। अगले 45 मिनट के लिए भीतरी संपर्क मार्ग का उपयोग करें।`
        : `Traffic tip: Moderate rush near main market crossroads. Consider taking inner bypass routes.`;
    }

    if (aqi > 150) {
      return language === 'hi'
        ? `स्वास्थ्य टिप: आज हवा की गुणवत्ता थोड़ी मध्यम है। व्यस्त सड़कों पर मास्क का उपयोग करना बेहतर होगा।`
        : `Health tip: Air quality is elevated today. Consider wearing a mask during peak outdoor hours.`;
    }

    return language === 'hi'
      ? `इलाका सामान्य: नियमित नगर निगम सफाई व जल आपूर्ति सामान्य रूप से संचालित हो रही है।`
      : `Area status: Regular sanitation and utility supplies are operating on normal schedules.`;
  };

  const citizenTip = getCitizenTip();

  const getOneLineStatus = () => {
    if (score >= 80) {
      return language === 'hi' ? 'सब सामान्य व शांत' : 'All normal & running smoothly';
    }
    if (score >= 60) {
      return language === 'hi' ? 'हल्की निगरानी, सेवाएं सक्रिय' : 'Minor delays, services active';
    }
    if (score >= 40) {
      return language === 'hi' ? 'ट्रैफ़िक या शिकायतें बढ़ी हैं' : 'Noticeable traffic or civic complaints';
    }
    return language === 'hi' ? 'नगर निगम का त्वरित ध्यान जारी' : 'Urgent municipal response underway';
  };

  return (
    <div className="rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] p-6 shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none space-y-6 animate-card-fade-in hover-lift transition-all">
      {/* 1. Header Bar: "Your Area Today" & Area Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0F2F5] dark:border-[#521E3B] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D9707E] text-white shadow-xs">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[24px] font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                {language === 'hi' ? 'आपका इलाका आज' : 'Your Area Today'}
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#D9707E] text-white">
                {language === 'hi' ? 'मेरा क्षेत्र' : 'My Area'}
              </span>
            </div>
            <p className="text-[13px] text-[#3E6B75] dark:text-[#E3B0C4] mt-0.5 font-medium">
              {language === 'hi'
                ? 'अपने घर या कार्यस्थल के इलाके की स्थिति सीधे देखें:'
                : 'Live status for your home or workplace neighborhood:'}
            </p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2 min-h-[40px]">
          <label htmlFor="area-select" className="sr-only">
            {language === 'hi' ? 'इलाका चुनें' : 'Choose Neighborhood'}
          </label>
          <select
            id="area-select"
            value={userMyAreaZoneId}
            onChange={(e) => setUserMyAreaZoneId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#CCF1F4] dark:border-[#8A2D5C] bg-[#F0FCFD] dark:bg-[#280D1F] text-sm font-semibold text-[#0F3E48] dark:text-[#FFF0F5] focus:outline-none focus:ring-2 focus:ring-[#0891B2] cursor-pointer shadow-xs min-h-[40px]"
          >
            {JAIPUR_ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {language === 'hi' ? zone.nameHi : zone.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Main Area Snapshot Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Score & Area Name (5 cols) */}
        <div className="md:col-span-5 flex items-center gap-4 bg-[#F0FCFD] dark:bg-[#280D1F] p-4 rounded-xl border border-[#E0F2F5] dark:border-[#521E3B]">
          <div
            className="w-16 h-16 rounded-xl flex flex-col items-center justify-center font-display font-bold text-white shadow-xs shrink-0"
            style={{ backgroundColor: bandInfo.color }}
          >
            <span className="text-2xl leading-none">{score}</span>
            <span className="text-[10px] uppercase font-sans font-bold opacity-90">/ 100</span>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[18px] font-bold text-[#0F3E48] dark:text-[#FFD1DC] truncate">
                {language === 'hi' ? currentZone.nameHi : currentZone.nameEn}
              </h3>
              <InfoTooltip
                title={language === 'hi' ? 'इलाके का स्कोर' : 'Area Score'}
                content={
                  language === 'hi'
                    ? '0 से 100 तक का स्कोर दिखाता है कि आपके इलाके में ट्रैफ़िक, सफ़ाई और बिजली-पानी की व्यवस्था कितनी ठीक चल रही है।'
                    : 'A score from 0 to 100 showing how smoothly traffic, sanitation, water, and power are running in your area right now.'
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${bandInfo.bgClass}`}
              >
                {bandLabel}
              </span>
              <span className="text-xs font-semibold text-[#1F4E5A] dark:text-[#E3B0C4] truncate">
                {getOneLineStatus()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Weather & AQI + Friendly Citizen Tip (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between gap-4">
          {/* Friendly Tip Box */}
          <div className="p-4 rounded-xl bg-[#F0FCFD] dark:bg-[#36142B]/30 border border-[#E0F2F5] dark:border-[#521E3B] text-[#1F4E5A] dark:text-[#FFD1DC] text-sm flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-[#0891B2] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-xs uppercase tracking-wider text-[#0F3E48] dark:text-[#F2A93B] block mb-0.5">
                {language === 'hi' ? 'नागरिक सुझाव' : 'Resident Tip'}:
              </span>
              <span className="text-[#1F4E5A] dark:text-[#FFD1DC] text-sm">{citizenTip}</span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#1F4E5A] dark:text-[#E3B0C4]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-[#0F3E48] dark:text-[#FFF0F5] text-sm">
                <Thermometer className="h-4 w-4 text-amber-600" />
                <span>{weather?.temperatureC ? `${weather.temperatureC}°C` : '32°C'}</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#0F3E48] dark:text-[#FFF0F5] text-sm">
                <Wind className="h-4 w-4 text-sky-600" />
                <span>Air AQI {weather?.aqi || 92}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('report');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-[#D9707E] hover:bg-[#C2185B] text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px]"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-white" />
                <span>{language === 'hi' ? 'यहाँ रिपोर्ट करें' : 'Report Issue Here'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedZoneId(currentZone.id)}
                className="px-3.5 py-2 rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] hover:bg-[#B2EBF2] dark:hover:bg-[#36142B] text-xs font-semibold text-[#0F3E48] dark:text-[#FFD1DC] transition-all cursor-pointer flex items-center gap-1 min-h-[38px]"
              >
                <span>{language === 'hi' ? 'विस्तार देखें' : 'View Details'}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#0891B2]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
