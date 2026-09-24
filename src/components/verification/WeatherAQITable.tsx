import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage } from '../../i18n/LanguageContext';
import { JAIPUR_ZONES } from '../../config/city';
import { CloudRain, Wind, Droplets, Thermometer, ShieldAlert, Sparkles } from 'lucide-react';
import { getAQICategory } from '../../engine/aqiIndia';

export const WeatherAQITable: React.FC = () => {
  const { zoneWeatherAQI } = useAppStore();
  const { language } = useLanguage();

  return (
    <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-4 shadow-sm transition-colors duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--jaipur-border)]">
        <div>
          <h3 className="font-display text-base font-bold text-[var(--jaipur-text)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
            <span>9-Zone Ambient Weather & CPCB Air Quality Index</span>
          </h3>
          <p className="text-xs text-[var(--jaipur-text-secondary)] mt-0.5">
            Synchronized in single unified calls to Open-Meteo Weather & Air Quality APIs
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[var(--jaipur-text)] border-collapse">
          <thead>
            <tr className="border-b border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/70 text-[11px] font-bold text-[var(--jaipur-text-secondary)] uppercase tracking-wider">
              <th className="py-2.5 px-3">Zone</th>
              <th className="py-2.5 px-2">Condition</th>
              <th className="py-2.5 px-2">Temp / Feels</th>
              <th className="py-2.5 px-2">Humidity & Rain</th>
              <th className="py-2.5 px-2">Wind & Gusts</th>
              <th className="py-2.5 px-2">Particulates (PM2.5 / PM10)</th>
              <th className="py-2.5 px-3 text-right">CPCB Indian AQI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--jaipur-border)]/60">
            {JAIPUR_ZONES.map((zone) => {
              const data = zoneWeatherAQI[zone.id];
              const aqiVal = data?.aqi ?? 95;
              const aqiInfo = getAQICategory(aqiVal);
              const isFallback = data?.origin === 'simulated_fallback';

              return (
                <tr
                  key={zone.id}
                  className="hover:bg-[var(--jaipur-surface-warm)]/40 transition-colors"
                >
                  {/* Zone Name & Code */}
                  <td className="py-2.5 px-3 font-semibold text-[var(--jaipur-text)]">
                    <div className="flex items-center gap-1.5">
                      <span>{language === 'hi' ? zone.nameHi : zone.nameEn}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--jaipur-border)]/50 text-[var(--jaipur-text-secondary)]">
                        {zone.code}
                      </span>
                    </div>
                  </td>

                  {/* Weather Condition */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{data?.weatherIcon || '☀️'}</span>
                      <span className="text-[11px] text-[var(--jaipur-text-secondary)] truncate max-w-[110px]">
                        {data
                          ? language === 'hi'
                            ? data.weatherDescHi
                            : data.weatherDescEn
                          : 'Loading...'}
                      </span>
                    </div>
                  </td>

                  {/* Temperature */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5 text-[var(--jaipur-terracotta)] shrink-0" />
                      <span className="font-mono font-bold text-[var(--jaipur-text)]">
                        {data ? `${data.temperatureC}°C` : '--'}
                      </span>
                      {data?.apparentTemperatureC !== undefined && (
                        <span className="text-[10px] text-[var(--jaipur-text-muted)]">
                          ({data.apparentTemperatureC}°C)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Humidity & Rain */}
                  <td className="py-2.5 px-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-[var(--jaipur-text-secondary)]">
                        <Droplets className="h-3 w-3 text-sky-500" />
                        {data ? `${data.relativeHumidityPct}%` : '--'}
                      </span>
                      {(data?.rainMm || 0) > 0 && (
                        <span className="flex items-center gap-0.5 font-bold text-sky-600 dark:text-sky-400">
                          <CloudRain className="h-3 w-3" />
                          {data?.rainMm}mm
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Wind & Gusts */}
                  <td className="py-2.5 px-2 font-mono text-[11px]">
                    <div className="flex items-center gap-1 text-[var(--jaipur-text-secondary)]">
                      <Wind className="h-3 w-3 text-[var(--jaipur-peacock)]" />
                      <span>{data ? `${data.windSpeedKmh}` : '--'}</span>
                      {data?.windGustsKmh ? (
                        <span className="text-[10px] text-[var(--jaipur-text-muted)]">
                          (g: {data.windGustsKmh}kph)
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Particulates PM2.5 / PM10 */}
                  <td className="py-2.5 px-2 font-mono text-[11px]">
                    <span className="text-[var(--jaipur-text)]">
                      {data?.pm25 !== undefined ? `${data.pm25}` : '--'}
                    </span>
                    <span className="text-[var(--jaipur-text-muted)] text-[10px] mx-1">/</span>
                    <span className="text-[var(--jaipur-text-secondary)]">
                      {data?.pm10 !== undefined ? `${data.pm10} µg` : '--'}
                    </span>
                  </td>

                  {/* CPCB Indian AQI & Category */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs" style={{ color: aqiInfo.color }}>
                          {data?.aqi || '--'}
                        </div>
                        <div className="text-[9px] font-semibold" style={{ color: aqiInfo.color }}>
                          {language === 'hi' ? aqiInfo.categoryHi : aqiInfo.category}
                        </div>
                      </div>

                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: aqiInfo.color }}
                        title={`CPCB Category: ${aqiInfo.category}`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--jaipur-border)]/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--jaipur-text-secondary)]">
        <span className="flex items-center gap-1">
          <ShieldAlert className="h-3 w-3 text-[var(--jaipur-terracotta)]" />
          CPCB Breakpoints applied: Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), Severe (401-500).
        </span>
        <span className="italic">
          Dominant sub-index rule applied (max(PM2.5, PM10) wins).
        </span>
      </div>
    </div>
  );
};
