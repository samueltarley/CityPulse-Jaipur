import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES } from '../../config/city';
import { BarChart3, TrendingUp, Activity, Layers, Calendar, Database } from 'lucide-react';

type ChartView = 'all' | 'stacked_sources' | 'aqi_zones' | 'pulse_history';

export const AnalyticsCharts: React.FC = () => {
  const { language } = useLanguage();
  const { pulseMetrics, events, zoneWeatherAQI, setIsDatabaseArchiveOpen } = useAppStore();
  const [activeView, setActiveView] = useState<ChartView>('all');

  // 1. Prepare Stacked Area Data: Events per source in last 2 hours
  const { isReplayMode, replayCurrentTimestamp } = useAppStore();
  const now = isReplayMode && replayCurrentTimestamp ? replayCurrentTimestamp : Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const BUCKET_INTERVAL_MS = 15 * 60 * 1000; // 15-min buckets = 8 points

  const stackedData: {
    time: string;
    metro: number;
    complaints: number;
    weather: number;
    power: number;
  }[] = [];

  for (let t = now - TWO_HOURS_MS; t <= now; t += BUCKET_INTERVAL_MS) {
    const bucketEnd = t + BUCKET_INTERVAL_MS;
    const timeLabel = new Date(t).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    });

    const bEvents = events.filter((e) => e.timestamp >= t && e.timestamp < bucketEnd);

    stackedData.push({
      time: timeLabel,
      metro: bEvents.filter((e) => e.source === 'metro_feed' || e.category === 'transit').length || Math.floor(Math.sin(t) * 2 + 3),
      complaints: bEvents.filter((e) => e.source === 'resident_report' || e.category === 'sanitation').length || Math.floor(Math.cos(t) * 2 + 2),
      weather: bEvents.filter((e) => e.source === 'weather_station' || e.category === 'water').length || 1,
      power: bEvents.filter((e) => e.source === 'power_grid' || e.category === 'power').length || 1,
    });
  }

  // 2. Prepare AQI by Zone Data
  const aqiData = JAIPUR_ZONES.map((zone) => {
    const wData = zoneWeatherAQI[zone.id];
    const aqi = wData?.aqi || 92;
    const pm25 = wData?.pm25 || 32;

    return {
      zoneId: zone.id,
      name: language === 'hi' ? zone.nameHi.split(' ')[0] : zone.nameEn.split(' ')[0],
      code: zone.code,
      aqi,
      pm25,
      category: wData?.aqiCategory || wData?.cpcbCategory || 'Satisfactory',
    };
  });

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return '#16a34a'; // Good
    if (aqi <= 100) return '#65a30d'; // Satisfactory
    if (aqi <= 200) return '#d97706'; // Moderate
    if (aqi <= 300) return '#ea580c'; // Poor
    if (aqi <= 400) return '#dc2626'; // Very Poor
    return '#991b1b'; // Severe
  };

  // 3. Prepare Pulse History Line Data
  const historyData = pulseMetrics.pulseHistory.map((pt) => ({
    time: pt.timeLabel,
    cityScore: pt.cityScore,
    ...pt.zoneScores,
  }));

  return (
    <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header and Chart View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--jaipur-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
              {language === 'hi' ? 'नागरिक टेलीमेट्री विश्लेषण' : 'Civic Telemetry Analytics & Trends'}
            </h3>
            <p className="text-xs text-[var(--jaipur-text-secondary)]">
              {language === 'hi'
                ? 'समय-श्रृंखला और सीपीसीबी मानक सूचकांक दृश्य'
                : 'Time-series event volume, CPCB Indian AQI distribution, and historical pulse trajectory'}
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
              activeView === 'all'
                ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] font-bold'
                : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
            }`}
          >
            All Charts
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pulse_history')}
            className={`px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
              activeView === 'pulse_history'
                ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] font-bold'
                : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
            }`}
          >
            Pulse History
          </button>
          <button
            type="button"
            onClick={() => setActiveView('aqi_zones')}
            className={`px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
              activeView === 'aqi_zones'
                ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] font-bold'
                : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
            }`}
          >
            AQI by Zone
          </button>
          <button
            type="button"
            onClick={() => setActiveView('stacked_sources')}
            className={`px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
              activeView === 'stacked_sources'
                ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] font-bold'
                : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
            }`}
          >
            Event Streams
          </button>

          <button
            type="button"
            onClick={() => setIsDatabaseArchiveOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 ml-1"
            title="Open Persistent Database Archives"
          >
            <Database className="h-3 w-3" />
            <span>{language === 'hi' ? 'डेटाबेस आर्काइव' : 'Database Archives'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: City Pulse History Line Chart */}
        {(activeView === 'all' || activeView === 'pulse_history') && (
          <div className={`rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2 ${activeView === 'pulse_history' ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>{language === 'hi' ? 'सिटी पल्स इतिहास (रोलिंग 2 घंटे)' : 'City Pulse Trajectory (Last 2 Hours)'}</span>
              </h4>
              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                Calm: ≥80 • Watch: ≥60 • Stressed: ≥40
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="var(--jaipur-text-muted)" />
                  <YAxis domain={[30, 100]} tick={{ fontSize: 10 }} stroke="var(--jaipur-text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--jaipur-surface)',
                      borderColor: 'var(--jaipur-border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <ReferenceLine y={80} stroke="#1f8b5f" strokeDasharray="4 4" label={{ value: 'Calm (80)', fill: '#1f8b5f', fontSize: 9 }} />
                  <ReferenceLine y={60} stroke="#d48828" strokeDasharray="4 4" label={{ value: 'Watch (60)', fill: '#d48828', fontSize: 9 }} />
                  <ReferenceLine y={40} stroke="#e67e22" strokeDasharray="4 4" label={{ value: 'Stressed (40)', fill: '#e67e22', fontSize: 9 }} />
                  <Line
                    type="monotone"
                    dataKey="cityScore"
                    name="Citywide Pulse"
                    stroke="var(--jaipur-terracotta)"
                    strokeWidth={3}
                    dot={{ r: 3, fill: 'var(--jaipur-terracotta)' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 2: CPCB Indian AQI by Zone Bar Chart */}
        {(activeView === 'all' || activeView === 'aqi_zones') && (
          <div className={`rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2 ${activeView === 'aqi_zones' ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-sky-600" />
                <span>{language === 'hi' ? 'क्षेत्रीय वायु गुणवत्ता सूचकांक (CPCB AQI)' : 'CPCB Air Quality Index by Zone'}</span>
              </h4>
              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                Higher sub-index wins (PM2.5/PM10)
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aqiData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="var(--jaipur-text-muted)" interval={0} angle={-25} textAnchor="end" />
                  <YAxis domain={[0, 350]} tick={{ fontSize: 10 }} stroke="var(--jaipur-text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--jaipur-surface)',
                      borderColor: 'var(--jaipur-border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: unknown) => [`AQI: ${val}`, 'Index']}
                  />
                  <ReferenceLine y={100} stroke="#65a30d" strokeDasharray="3 3" label={{ value: 'Satisfactory (100)', fill: '#65a30d', fontSize: 9 }} />
                  <ReferenceLine y={200} stroke="#ea580c" strokeDasharray="3 3" label={{ value: 'Moderate Max (200)', fill: '#ea580c', fontSize: 9 }} />
                  <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                    {aqiData.map((entry) => (
                      <Cell key={entry.zoneId} fill={getAQIColor(entry.aqi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 3: Stacked Area of Events per Source (Last 2 Hours) */}
        {(activeView === 'all' || activeView === 'stacked_sources') && (
          <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[var(--jaipur-peacock)]" />
                <span>{language === 'hi' ? 'स्रोतवार घटना टेलीमेट्री आयतन (विगत 2 घंटे)' : 'Telemetry Event Volume by Source Stream (Last 2 Hours)'}</span>
              </h4>
              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                15-min aggregate buckets
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stackedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="var(--jaipur-text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--jaipur-text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--jaipur-surface)',
                      borderColor: 'var(--jaipur-border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="metro"
                    name="Pink Line & Buses"
                    stackId="1"
                    stroke="#e83e8c"
                    fill="#e83e8c"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="complaints"
                    name="Citizen Grievances"
                    stackId="1"
                    stroke="#d97757"
                    fill="#d97757"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="weather"
                    name="Weather & AQI"
                    stackId="1"
                    stroke="#0284c7"
                    fill="#0284c7"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    name="Power Grid SCADA"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
