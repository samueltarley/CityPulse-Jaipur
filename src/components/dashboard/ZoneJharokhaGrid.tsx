import React, { useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES } from '../../config/city';
import { getPulseBand, getBandDetails } from '../../engine/pulseScore';
import { SectionHeading } from '../theme/SectionHeading';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Thermometer,
  Wind,
  Star,
  ChevronRight,
  CheckCircle2,
  Activity,
} from 'lucide-react';

interface ZoneJharokhaGridProps {
  onSelectZone?: (zoneId: string) => void;
}

export const ZoneJharokhaGrid: React.FC<ZoneJharokhaGridProps> = ({ onSelectZone }) => {
  const { language } = useLanguage();
  const {
    pulseMetrics,
    zoneWeatherAQI,
    userMyAreaZoneId,
    selectedZoneId,
    setSelectedZoneId,
  } = useAppStore();

  // Sort zones: user's My Area first, then by score
  const sortedZones = useMemo(() => {
    return [...JAIPUR_ZONES].sort((a, b) => {
      if (a.id === userMyAreaZoneId) return -1;
      if (b.id === userMyAreaZoneId) return 1;
      return 0;
    });
  }, [userMyAreaZoneId]);

  const handleZoneClick = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    if (onSelectZone) {
      onSelectZone(zoneId);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Section Header */}
      <SectionHeading
        title={language === 'hi' ? 'सभी 9 जयपुर प्रशासनिक इलाके' : 'All 9 Jaipur Municipal Zones'}
        subtitle={
          language === 'hi'
            ? 'नीचे किसी भी क्षेत्र कार्ड पर क्लिक करके विस्तृत लाइव टेलीमेट्री, वायु गुणवत्ता और आपातकालीन केंद्र देखें'
            : 'Click any zone card below to inspect comprehensive live telemetry, AQI, and emergency hubs'
        }
      />

      {/* 2. The 9 Zone Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedZones.map((zone) => {
          const isSelected = zone.id === selectedZoneId;
          const isMyArea = zone.id === userMyAreaZoneId;
          const zoneDetail = pulseMetrics.zoneDetails[zone.id];
          const weather = zoneWeatherAQI[zone.id];

          const score = zoneDetail?.score ?? 78;
          const band = getPulseBand(score);
          const bandInfo = getBandDetails(band);
          const bandLabel = language === 'hi' ? bandInfo.labelHi : bandInfo.labelEn;

          const trend = zoneDetail?.trend ?? 'stable';
          const TrendIcon = trend === 'improving' ? ArrowUpRight : trend === 'deteriorating' ? ArrowDownRight : Minus;

          const topIssue = language === 'hi' ? zoneDetail?.topIssueHi || 'सब सामान्य' : zoneDetail?.topIssueEn || 'All normal';
          const aqi = weather?.aqi || 92;
          const temp = weather?.temperatureC ? `${weather.temperatureC}°C` : '32°C';
          const history = zoneDetail?.history || [75, 76, 78, 79, score];

          // Mini SVG Sparkline (1px subtle light aqua line)
          const sparkMin = Math.min(...history, 50);
          const sparkMax = Math.max(...history, 100);
          const sparkRange = sparkMax - sparkMin || 1;
          const sparkW = 80;
          const sparkH = 20;

          const points = history
            .map((val, idx) => {
              const x = (idx / (history.length - 1 || 1)) * sparkW;
              const y = sparkH - ((val - sparkMin) / sparkRange) * (sparkH - 4) - 2;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <div
              key={zone.id}
              onClick={() => handleZoneClick(zone.id)}
              className={`group relative rounded-2xl p-6 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between bg-white dark:bg-[#280D1F] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none hover:-translate-y-[2px] ${
                isSelected
                  ? 'border-2 border-[#0891B2] shadow-md'
                  : 'border border-[#E0F2F5] dark:border-[#521E3B] hover:border-2 hover:border-[#0891B2] hover:shadow-md'
              }`}
            >
              {/* Header: Zone Name & Status Tags */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0891B2] text-white">
                        <CheckCircle2 className="h-3 w-3" />
                        {language === 'hi' ? 'चयनित' : 'Selected'}
                      </span>
                    )}
                    {isMyArea && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9707E] text-white">
                        <Star className="h-3 w-3 fill-current" />
                        {language === 'hi' ? 'मेरा क्षेत्र' : 'My Area'}
                      </span>
                    )}
                    <span className="font-mono text-xs text-[#3E6B75] dark:text-[#B37D94] font-semibold">
                      {zone.code}
                    </span>
                  </div>
                  <h3 className="font-display text-[18px] font-bold text-[#0F3E48] dark:text-[#FFF0F5] truncate">
                    {language === 'hi' ? zone.nameHi : zone.nameEn}
                  </h3>
                </div>

                {/* Score badge & Sparkline */}
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-display text-2xl font-bold leading-none"
                      style={{ color: bandInfo.color }}
                    >
                      {score}
                    </span>
                    <span className="text-[10px] text-[#3E6B75] dark:text-[#B37D94]">/100</span>
                  </div>

                  {/* Subtle 1px light aqua sparkline */}
                  <svg
                    width={sparkW}
                    height={sparkH}
                    className="overflow-visible mt-1 opacity-70 group-hover:opacity-100 transition-opacity"
                  >
                    <polyline
                      fill="none"
                      stroke="#0891B2"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  </svg>
                </div>
              </div>

              {/* Band Badge & Trend */}
              <div className="flex items-center justify-between text-xs py-2 border-y border-[#E0F2F5] dark:border-[#521E3B] my-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs border ${bandInfo.bgClass}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: bandInfo.color }}
                  />
                  <span>{bandLabel}</span>
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] text-[#3E6B75] dark:text-[#E3B0C4] font-medium">
                  <TrendIcon className="h-3.5 w-3.5 text-[#0891B2]" />
                  <span>
                    {trend === 'improving' ? 'Improving' : trend === 'deteriorating' ? 'Deteriorating' : 'Stable'}
                  </span>
                </span>
              </div>

              {/* One-line status */}
              <div className="text-xs text-[#1F4E5A] dark:text-[#E3B0C4] flex items-center gap-1.5 py-1">
                <Activity className="h-3.5 w-3.5 text-[#0891B2] shrink-0" />
                <span className="truncate">
                  <strong className="text-[#0F3E48] dark:text-[#FFD1DC] font-semibold">
                    {language === 'hi' ? 'स्थिति:' : 'Status:'}
                  </strong>{' '}
                  {topIssue}
                </span>
              </div>

              {/* Footer: AQI, Temp & See Details */}
              <div className="flex items-center justify-between pt-3 mt-2 text-xs text-[#1F4E5A] dark:text-[#E3B0C4] border-t border-[#E0F2F5] dark:border-[#521E3B]">
                <div className="flex items-center gap-3 font-semibold text-[#0F3E48] dark:text-[#FFD1DC]">
                  <span className="flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-amber-600" />
                    {temp}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5 text-sky-600" />
                    AQI {aqi}
                  </span>
                </div>

                <span
                  className={`text-xs font-semibold flex items-center transition-colors ${
                    isSelected
                      ? 'text-[#0891B2] font-bold'
                      : 'text-[#0F3E48] dark:text-[#FFD1DC] group-hover:text-[#0891B2]'
                  }`}
                >
                  {isSelected ? (language === 'hi' ? 'चयनित' : 'Selected') : (language === 'hi' ? 'विवरण देखें' : 'See Details')}{' '}
                  <ChevronRight className="h-3.5 w-3.5 inline ml-0.5 text-[#0891B2]" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
