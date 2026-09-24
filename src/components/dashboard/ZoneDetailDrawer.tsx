import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES } from '../../config/city';
import { getPulseBand, getBandDetails } from '../../engine/pulseScore';
import { CivicEvent } from '../../types';
import { summaryCoordinator } from '../../engine/summaryCoordinator';
import { EmergencyPlace, getZoneEmergencyPlaces } from '../../config/emergencyPlaces';
import {
  X,
  MapPin,
  Activity,
  Wind,
  Thermometer,
  Zap,
  Train,
  AlertTriangle,
  Link2,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Star,
  ShieldCheck,
  Clock,
  Compass,
  Sparkles,
  RefreshCw,
  Building2,
  Flame,
  Shield,
  Pill,
  ExternalLink,
  Navigation,
} from 'lucide-react';

// Helper for Source Icon and Label
function getSourceBadge(ev: CivicEvent, lang: 'en' | 'hi') {
  const cat = ev.category;
  const src = ev.source;
  if (cat === 'traffic' || src === 'traffic_camera') {
    return { icon: '🚗', label: lang === 'hi' ? 'यातायात' : 'Traffic' };
  }
  if (src === 'resident_report') {
    return { icon: '📝', label: lang === 'hi' ? 'नागरिक रिपोर्ट' : 'Resident Report' };
  }
  if (cat === 'transit' || src === 'metro_feed') {
    return { icon: '🚇', label: lang === 'hi' ? 'मेट्रो/बस' : 'Metro/Bus' };
  }
  if (cat === 'water' || src === 'water_telemetry') {
    return { icon: '💧', label: lang === 'hi' ? 'पानी' : 'Water' };
  }
  if (cat === 'air_quality') {
    return { icon: '🌫️', label: lang === 'hi' ? 'हवा' : 'Air' };
  }
  if (cat === 'power' || src === 'power_grid') {
    return { icon: '⚡', label: lang === 'hi' ? 'बिजली' : 'Power' };
  }
  if (cat === 'sanitation') {
    return { icon: '📢', label: lang === 'hi' ? 'शिकायत' : 'Complaint' };
  }
  if (src === 'weather_station') {
    return { icon: '🌦️', label: lang === 'hi' ? 'मौसम' : 'Weather' };
  }
  return { icon: '📢', label: lang === 'hi' ? 'अपडेट' : 'Update' };
}

// Helper for Relative Time String ("2 min ago")
function getRelativeTimeStr(timestamp: number, lang: 'en' | 'hi'): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) {
    return lang === 'hi' ? 'अभी' : 'Just now';
  }
  if (diffMins < 60) {
    return lang === 'hi' ? `${diffMins} मि. पहले` : `${diffMins} min ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return lang === 'hi' ? `${diffHours} घं. पहले` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === 'hi' ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
}

// Helper for Severity Dot
function getSeverityDot(severity: CivicEvent['severity']) {
  if (severity === 'high' || severity === 'critical') {
    return <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" title="Heavy/High severity" />;
  }
  if (severity === 'medium') {
    return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Moderate severity" />;
  }
  return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Normal/Low severity" />;
}

// Helper for Parsing Place & Plain Language Message
function parsePlaceAndSentence(ev: CivicEvent, lang: 'en' | 'hi') {
  const isHi = lang === 'hi';
  const rawTitle = (isHi ? (ev.titleHi || ev.titleEn) : (ev.titleEn || ev.titleHi)) || '';
  const rawDesc = (isHi ? (ev.descriptionHi || ev.descriptionEn) : (ev.descriptionEn || ev.descriptionHi)) || '';

  let place = ev.locationName || '';
  if (!place || place === 'Jaipur' || place.includes('Jaipur Zone')) {
    const match = rawTitle.match(/^(?:JCTSL\s+[A-Z0-9-]+:\s*)?([^:(]+)/i);
    place = match ? match[1].trim() : 'Jaipur';
  }

  place = place
    .replace(/\s*Corridor/i, '')
    .replace(/\s*GSS/i, '')
    .replace(/\(.*\)/g, '')
    .replace(/JCTSL\s+[A-Z0-9-]+:\s*/i, '')
    .trim();

  if (!place || place.length < 2) {
    place = isHi ? 'जयपुर' : 'Jaipur';
  }

  let message = '';

  if (ev.category === 'traffic') {
    const ratioMatch = (rawTitle + ' ' + rawDesc).match(/(\d+\.\d+)x/);
    const delayMatch = (rawTitle + ' ' + rawDesc).match(/(?:\+(\d+)m delay|\b(\d+)\s*mins?\s*\(nominal\s*(\d+)\s*mins?\)|headway delay\s*(\d+))/i);

    let ratioNum = ratioMatch ? parseFloat(ratioMatch[1]) : null;
    let delayMins = 0;

    if (delayMatch) {
      if (delayMatch[1]) delayMins = parseInt(delayMatch[1], 10);
      else if (delayMatch[2] && delayMatch[3]) delayMins = Math.max(0, parseInt(delayMatch[2], 10) - parseInt(delayMatch[3], 10));
      else if (delayMatch[4]) delayMins = parseInt(delayMatch[4], 10);
    }

    if (rawTitle.toLowerCase().includes('heavy') || rawTitle.toLowerCase().includes('severe')) {
      if (!ratioNum) ratioNum = 1.7;
    }

    if (ratioNum !== null) {
      if (ratioNum < 1.2) {
        message = isHi ? 'हल्का यातायात' : 'light traffic';
      } else if (ratioNum <= 1.6) {
        message = isHi ? 'मध्यम यातायात' : 'moderate traffic';
      } else {
        message = isHi ? 'भारी यातायात' : 'heavy traffic';
      }
    } else {
      message = isHi ? 'यातायात सामान्य' : 'normal traffic';
    }

    if (rawTitle.toLowerCase().includes('jctsl') || rawDesc.toLowerCase().includes('bus') || rawTitle.includes('JCTSL')) {
      message += isHi ? ', बसें धीमी चल रही हैं' : ', buses moving slowly';
    } else if (delayMins > 0) {
      message += isHi ? `, लगभग ${delayMins} मिनट की देरी` : `, about ${delayMins} min delay`;
    }
  } else if (ev.category === 'transit') {
    if (rawTitle.toLowerCase().includes('pink line') || rawTitle.toLowerCase().includes('station')) {
      message = isHi ? 'स्टेशन पर भीड़, ट्रेनें ~5 मिनट लेट' : 'station busy, trains delayed by ~5 min';
    } else {
      message = isHi ? 'मेट्रो आवाजाही सामान्य' : 'metro transit active';
    }
  } else if (ev.category === 'water') {
    if (rawTitle.toLowerCase().includes('waterlog') || rawDesc.toLowerCase().includes('waterlog') || rawTitle.includes('जलभराव')) {
      message = isHi ? 'जलभराव की सूचना' : 'waterlogging reported by citizens';
    } else if (rawTitle.toLowerCase().includes('pressure') || rawDesc.toLowerCase().includes('bar') || rawTitle.includes('दबाव')) {
      message = isHi ? 'पानी का कम दबाव' : 'low water pressure reported';
    } else {
      message = isHi ? 'बारिश दर्ज की गई' : 'rainfall detected';
    }
  } else if (ev.category === 'power') {
    message = isHi ? 'क्षेत्र में बिजली कटौती' : 'power outage reported in area';
  } else if (ev.category === 'air_quality') {
    message = isHi ? 'हवा की स्थिति मध्यम' : 'air quality moderate';
  } else {
    message = rawTitle
      .replace(/JPR-\d+-\d+/g, '')
      .replace(/FDR-[A-Z0-9-]+/g, '')
      .replace(/PS-[A-Z0-9-]+/g, '')
      .replace(/\(.*\)/g, '')
      .replace(/\d+\.\d+x\s*Congestion/gi, '')
      .trim();
  }

  return { place, message };
}

export const ZoneDetailDrawer: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    selectedZoneId,
    setSelectedZoneId,
    pulseMetrics,
    zoneWeatherAQI,
    events,
    anomalies,
    correlations,
    clusters,
    userMyAreaZoneId,
    setUserMyAreaZoneId,
    zoneSummaries,
    isGeneratingZoneSummary,
    role,
  } = useAppStore();

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showMoreEvents, setShowMoreEvents] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<EmergencyPlace[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyCategory, setNearbyCategory] = useState<'all' | 'hospital' | 'police' | 'fire_station' | 'pharmacy'>('all');

  // Auto-generate zone summary when drawer opens if not already available
  useEffect(() => {
    if (selectedZoneId && !zoneSummaries[selectedZoneId]) {
      summaryCoordinator.refreshZoneSummary(selectedZoneId);
    }
  }, [selectedZoneId, zoneSummaries]);

  // Fetch Nearby Emergency Help via Places API (New) with static fallback
  useEffect(() => {
    if (!selectedZoneId) return;
    const currentZone = JAIPUR_ZONES.find((z) => z.id === selectedZoneId);
    if (!currentZone) return;

    setIsLoadingNearby(true);
    fetch('/api/places/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        center: currentZone.center,
        zoneId: selectedZoneId,
        radiusMeters: 4500,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.places) && data.places.length > 0) {
          setNearbyPlaces(data.places);
        } else {
          setNearbyPlaces(getZoneEmergencyPlaces(selectedZoneId));
        }
      })
      .catch(() => {
        setNearbyPlaces(getZoneEmergencyPlaces(selectedZoneId));
      })
      .finally(() => {
        setIsLoadingNearby(false);
      });
  }, [selectedZoneId]);

  if (!selectedZoneId) return null;

  const zone = JAIPUR_ZONES.find((z) => z.id === selectedZoneId);
  if (!zone) return null;

  const zoneDetail = pulseMetrics.zoneDetails[selectedZoneId];
  const weather = zoneWeatherAQI[selectedZoneId];
  const score = zoneDetail?.score ?? 78;
  const band = getPulseBand(score);
  const bandInfo = getBandDetails(band);
  const bandLabel = language === 'hi' ? bandInfo.labelHi : bandInfo.labelEn;

  // Filter and merge events for this zone (deduplicated by road/place, newest first)
  const zoneAllEvents = events.filter((e) => e.zoneId === selectedZoneId);
  const mergedEvents: CivicEvent[] = [];
  const seenPlaces = new Set<string>();

  for (const ev of zoneAllEvents) {
    const { place } = parsePlaceAndSentence(ev, language);
    const placeKey = place.toLowerCase().trim();
    if (!seenPlaces.has(placeKey)) {
      seenPlaces.add(placeKey);
      mergedEvents.push(ev);
    }
  }

  const visibleEvents = showMoreEvents ? mergedEvents : mergedEvents.slice(0, 5);
  const zoneAnomalies = anomalies.filter((a) => a.zoneId === selectedZoneId);
  const zoneCorrelations = correlations.filter((c) => c.zoneIds?.includes(selectedZoneId));
  const zoneClusters = clusters.filter((cl) => cl.zoneId === selectedZoneId);

  const isMyArea = userMyAreaZoneId === zone.id;
  const currentZoneSummary = zoneSummaries[selectedZoneId];
  const isGeneratingThisZone = !!isGeneratingZoneSummary[selectedZoneId];

  const toggleEventExpand = (id: string) => {
    setExpandedEventId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Drawer Overlay backdrop click */}
      <div
        className="absolute inset-0"
        onClick={() => setSelectedZoneId(null)}
      />

      {/* Slide-in Drawer Container */}
      <div className="relative w-full max-w-xl h-full bg-[var(--jaipur-surface)] border-l border-[var(--jaipur-border)] shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Top Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg font-bold text-white shadow-sm shrink-0"
              style={{ backgroundColor: bandInfo.color }}
            >
              {score}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-[var(--jaipur-text)]">
                  {language === 'hi' ? zone.nameHi : zone.nameEn}
                </h3>
                <span className="font-mono text-xs text-[var(--jaipur-text-muted)] font-bold">
                  {zone.code}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--jaipur-text-secondary)] mt-0.5">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${bandInfo.bgClass}`}>
                  {bandLabel} ({score}/100)
                </span>
                <span>•</span>
                <span>Wards: {zone.wardNumbers.slice(0, 4).join(', ')}...</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUserMyAreaZoneId(zone.id)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                isMyArea
                  ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)]'
                  : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)]'
              }`}
              title={isMyArea ? 'Current My Area' : 'Set as My Area'}
            >
              <Star className={`h-4 w-4 ${isMyArea ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isMyArea ? 'My Area' : 'Make My Area'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedZoneId(null)}
              className="p-2 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] hover:bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Zone Description & Landmarks */}
          <div className="p-3.5 rounded-xl bg-[var(--jaipur-surface-warm)]/50 border border-[var(--jaipur-border)] text-xs text-[var(--jaipur-text-secondary)] space-y-2">
            <p className="leading-relaxed">
              {language === 'hi' ? zone.descriptionHi : zone.descriptionEn}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="font-bold text-[var(--jaipur-text)] mr-1">Landmarks:</span>
              {zone.keyLandmarks.map((lm) => (
                <span
                  key={lm}
                  className="px-2 py-0.5 rounded bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] text-[11px] text-[var(--jaipur-text)]"
                >
                  {lm}
                </span>
              ))}
            </div>
          </div>

          {/* Gemini AI Zone Brief (Spec 6.1) */}
          <div className="rounded-xl bg-[var(--jaipur-surface-warm)]/80 border border-[var(--jaipur-border)] p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--jaipur-border)]/60">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--jaipur-terracotta)]/10 text-[var(--jaipur-terracotta)] border border-[var(--jaipur-terracotta)]/25 text-[11px] font-bold">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>{language === 'hi' ? 'जेमिनी क्षेत्रीय विश्लेषण' : 'Gemini AI Zone Brief'}</span>
                </span>
                {currentZoneSummary?.isFallback && (
                  <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--jaipur-border)] text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                    {language === 'hi' ? 'टेलीमेट्री मॉडल' : 'Telemetry Fallback'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentZoneSummary?.timeLabel && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--jaipur-text-secondary)]">
                    <Clock className="h-3 w-3 text-[var(--jaipur-text-muted)]" />
                    <span>{currentZoneSummary.timeLabel}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => summaryCoordinator.refreshZoneSummary(selectedZoneId)}
                  disabled={isGeneratingThisZone}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                    isGeneratingThisZone
                      ? 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-muted)] border-[var(--jaipur-border)] opacity-60 cursor-not-allowed'
                      : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text)] border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)] hover:text-[var(--jaipur-terracotta)] active:scale-95'
                  }`}
                  title={language === 'hi' ? 'क्षेत्रीय सारांश ताज़ा करें' : 'Refresh Zone Summary'}
                >
                  <RefreshCw className={`h-3 w-3 ${isGeneratingThisZone ? 'animate-spin text-[var(--jaipur-terracotta)]' : ''}`} />
                  <span className="hidden sm:inline">
                    {isGeneratingThisZone
                      ? language === 'hi' ? 'विश्लेषण...' : 'Analyzing...'
                      : language === 'hi' ? 'ताज़ा करें' : 'Refresh'}
                  </span>
                </button>
              </div>
            </div>

            {/* Zone Summary Text */}
            <div className={`text-xs sm:text-sm font-medium text-[var(--jaipur-text)] leading-relaxed ${isGeneratingThisZone ? 'opacity-50 animate-pulse' : ''}`}>
              {currentZoneSummary ? (
                language === 'hi' ? currentZoneSummary.hi : currentZoneSummary.en
              ) : isGeneratingThisZone ? (
                <div className="py-2 text-[var(--jaipur-text-muted)] italic">
                  {language === 'hi' ? 'क्षेत्रीय टेलीमेट्री का विश्लेषण किया जा रहा है...' : 'Synthesizing live zone telemetry with Gemini...'}
                </div>
              ) : (
                <div className="py-1 text-[var(--jaipur-text-muted)]">
                  {language === 'hi'
                    ? `${zone.nameHi} में सभी नागरिक प्रणालियों का सामान्य प्रवाह बना हुआ है।`
                    : `${zone.nameEn} is maintaining steady municipal rhythm across all monitoring channels.`}
                </div>
              )}
            </div>
          </div>

          {/* 5 Sub-Score Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
                <span>{language === 'hi' ? 'इलाके की सेहत (5 मुख्य कारक)' : 'Area Health (5 Factors)'}</span>
              </h4>
              {zoneDetail?.isPartialData && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Partial Data Mode
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {[
                {
                  label: language === 'hi' ? 'मौसम व तापमान' : 'Weather & Comfort',
                  score: zoneDetail?.subscores.weather ?? 85,
                  weight: '20%',
                  color: '#0284c7',
                },
                {
                  label: language === 'hi' ? 'वायु गुणवत्ता (हवा)' : 'Air Quality (AQI)',
                  score: zoneDetail?.subscores.aqi ?? 75,
                  weight: '20%',
                  color: '#16a34a',
                },
                {
                  label: language === 'hi' ? 'सड़क ट्रैफ़िक व मेट्रो' : 'Traffic & Metro',
                  score: zoneDetail?.subscores.transit ?? 82,
                  weight: '20%',
                  color: '#e83e8c',
                },
                {
                  label: language === 'hi' ? 'नागरिक शिकायतें व सफ़ाई' : 'Cleanliness & Complaints',
                  score: zoneDetail?.subscores.complaints ?? 78,
                  weight: '25%',
                  color: '#d97757',
                },
                {
                  label: language === 'hi' ? 'बिजली व स्ट्रीट लाइट' : 'Power Grid & Lights',
                  score: zoneDetail?.subscores.power ?? 90,
                  weight: '15%',
                  color: '#f59e0b',
                },
              ].map((sub) => (
                <div key={sub.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--jaipur-text)] flex items-center gap-1.5">
                      <span>{sub.label}</span>
                      <span className="text-[10px] text-[var(--jaipur-text-muted)] font-mono">({sub.weight})</span>
                    </span>
                    <span className="font-mono font-bold" style={{ color: sub.color }}>
                      {sub.score}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--jaipur-surface-warm)] overflow-hidden border border-[var(--jaipur-border)]/50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sub.score}%`,
                        backgroundColor: sub.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather & AQI Section */}
          <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-3">
            <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-sky-600" />
              <span>{language === 'hi' ? 'मौसम व वायु गुणवत्ता' : 'Weather & Air Quality'}</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)]">
                <span className="text-[10px] text-[var(--jaipur-text-muted)] block">Temperature</span>
                <span className="font-display text-base font-bold text-[var(--jaipur-text)]">
                  {weather?.temperatureC ? `${weather.temperatureC}°C` : '32°C'}
                </span>
                <span className="text-[9px] text-[var(--jaipur-text-secondary)] block">
                  Feels: {weather?.apparentTemperatureC || 34}°C
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)]">
                <span className="text-[10px] text-[var(--jaipur-text-muted)] block">CPCB Indian AQI</span>
                <span className="font-display text-base font-bold text-amber-600">
                  {weather?.aqi || 92}
                </span>
                <span className="text-[9px] text-[var(--jaipur-text-secondary)] block">
                  {weather?.aqiCategory || 'Satisfactory'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)]">
                <span className="text-[10px] text-[var(--jaipur-text-muted)] block">Particulates</span>
                <span className="font-display text-sm font-bold text-[var(--jaipur-text)]">
                  {weather?.pm25 || 28} <span className="text-[10px]">PM2.5</span>
                </span>
                <span className="text-[9px] text-[var(--jaipur-text-secondary)] block">
                  PM10: {weather?.pm10 || 68} µg/m³
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)]">
                <span className="text-[10px] text-[var(--jaipur-text-muted)] block">Wind & Rain</span>
                <span className="font-display text-sm font-bold text-[var(--jaipur-text)]">
                  {weather?.windSpeedKmh || 12} <span className="text-[10px]">km/h</span>
                </span>
                <span className="text-[9px] text-[var(--jaipur-text-secondary)] block">
                  Precip: {weather?.rainMm || 0} mm
                </span>
              </div>
            </div>
          </div>

          {/* Active Anomalies in this Zone */}
          <div className="space-y-2">
            <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Zone Anomalies</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                {zoneAnomalies.length} Flagged
              </span>
            </h4>

            {zoneAnomalies.length === 0 ? (
              <div className="p-3 text-center rounded-lg bg-[var(--jaipur-surface-warm)]/40 border border-[var(--jaipur-border)] text-xs text-[var(--jaipur-text-secondary)] flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>No statistical or threshold anomalies in this ward.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {zoneAnomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--jaipur-text)]">{anom.metricNameEn}</span>
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {anom.severity}
                      </span>
                    </div>
                    <p className="text-[var(--jaipur-text-secondary)]">{anom.summaryEn}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grievance Clusters in this Zone */}
          {zoneClusters.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <Compass className="h-4 w-4" />
                <span>Grievance Spatial Hotspots (500m radius)</span>
              </h4>
              <div className="space-y-1.5">
                {zoneClusters.map((cl) => (
                  <div
                    key={cl.id}
                    className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{cl.theme}</span>
                      <span className="font-mono text-[10px] text-rose-700 dark:text-rose-300">
                        {cl.eventIds.length} complaints • {cl.radiusMeters}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Help Section (Google Places API New) */}
          <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
                <span>{language === 'hi' ? 'निकटवर्ती आपातकालीन सहायता (गूगल प्लेसेस)' : 'Nearby Emergency Help (Places API)'}</span>
              </h4>
              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                {isLoadingNearby ? (language === 'hi' ? 'खोज जारी...' : 'Locating...') : `${nearbyPlaces.length} Facilities`}
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', labelEn: 'All', labelHi: 'सभी' },
                { id: 'hospital', labelEn: 'Hospitals', labelHi: 'अस्पताल', icon: Building2 },
                { id: 'police', labelEn: 'Police', labelHi: 'पुलिस', icon: Shield },
                { id: 'fire_station', labelEn: 'Fire', labelHi: 'अग्निशमन', icon: Flame },
                { id: 'pharmacy', labelEn: 'Pharmacy', labelHi: 'दवाइयां', icon: Pill },
              ].map((tab) => {
                const isSelected = nearbyCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNearbyCategory(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] shadow-xs'
                        : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)]'
                    }`}
                  >
                    {tab.icon && <tab.icon className="h-3 w-3" />}
                    <span>{language === 'hi' ? tab.labelHi : tab.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Places List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(nearbyPlaces.filter((p) => nearbyCategory === 'all' || p.category === nearbyCategory)).map((place) => {
                const isHospital = place.category === 'hospital';
                const isPolice = place.category === 'police';
                const isFire = place.category === 'fire_station';

                const CategoryIcon = isHospital
                  ? Building2
                  : isPolice
                  ? Shield
                  : isFire
                  ? Flame
                  : Pill;

                const categoryLabel =
                  place.category === 'hospital'
                    ? (language === 'hi' ? 'अस्पताल' : 'Hospital')
                    : place.category === 'police'
                    ? (language === 'hi' ? 'पुलिस थाना' : 'Police Station')
                    : place.category === 'fire_station'
                    ? (language === 'hi' ? 'दमकल केंद्र' : 'Fire Station')
                    : (language === 'hi' ? 'फार्मेसी' : 'Pharmacy');

                return (
                  <div
                    key={place.id}
                    className="p-3 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)] transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                          isHospital
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : isPolice
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : isFire
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-xs text-[var(--jaipur-text)]">
                              {language === 'hi' && place.nameHi ? place.nameHi : place.name}
                            </h5>
                          </div>
                          <p className="text-[10px] text-[var(--jaipur-text-secondary)] line-clamp-1 mt-0.5">
                            {place.address}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-[var(--jaipur-terracotta)] block">
                          {place.distanceKm} km
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${
                          place.isOpenNow
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {language === 'hi' && place.openStatusHi ? place.openStatusHi : place.openStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--jaipur-border)]/50 text-[10px]">
                      <span className="text-[var(--jaipur-text-muted)] font-mono text-[9px] uppercase">
                        {categoryLabel}
                      </span>
                      <a
                        href={place.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--jaipur-terracotta)] hover:underline font-medium"
                      >
                        <span>{language === 'hi' ? 'दिशा-निर्देश प्राप्त करें' : 'Get directions'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Google Attribution as required */}
            <div className="pt-1 flex items-center justify-between text-[9px] text-[var(--jaipur-text-muted)] font-mono border-t border-[var(--jaipur-border)]/40">
              <span>Google Places Platform (New)</span>
              <span>Fresh Nearby Query • Dynamic Radius</span>
            </div>
          </div>

          {/* Latest Updates & Activity Section */}
          <div className="space-y-2">
            <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
                <span>{language === 'hi' ? 'ताज़ा अपडेट व घटनाएं' : 'Latest Updates & Activity'}</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)] font-bold">
                {mergedEvents.length} {language === 'hi' ? 'अपडेट' : 'updates'}
              </span>
            </h4>

            {mergedEvents.length === 0 ? (
              <p className="text-xs text-[var(--jaipur-text-muted)] italic p-3 text-center">
                {language === 'hi' ? 'हाल ही में कोई अपडेट दर्ज नहीं हुआ।' : 'No updates recorded in this zone in recent telemetry window.'}
              </p>
            ) : (
              <div className="rounded-xl border border-[var(--jaipur-border)] bg-white dark:bg-[#1E0917] divide-y divide-[var(--jaipur-border)] overflow-hidden shadow-xs">
                {visibleEvents.map((ev) => {
                  const { place, message } = parsePlaceAndSentence(ev, language);
                  const sourceBadge = getSourceBadge(ev, language);
                  const relativeTime = getRelativeTimeStr(ev.timestamp, language);
                  const isExpanded = expandedEventId === ev.id;

                  return (
                    <div
                      key={ev.id}
                      className="p-3 text-xs text-[var(--jaipur-text)] hover:bg-[var(--jaipur-surface-warm)]/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0" title={sourceBadge.label}>{sourceBadge.icon}</span>
                          {getSeverityDot(ev.severity)}
                          <div className="text-xs font-sans text-[var(--jaipur-text)] leading-snug truncate">
                            <strong className="font-bold text-[var(--jaipur-text)]">{place}</strong>: {message}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-normal text-[var(--jaipur-text-secondary)] whitespace-nowrap">
                            {relativeTime}
                          </span>

                          {/* Show Raw JSON toggle ONLY in City Staff Mode */}
                          {role === 'staff' && (
                            <button
                              type="button"
                              onClick={() => toggleEventExpand(ev.id)}
                              className="p-1 rounded hover:bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-terracotta)] transition-colors cursor-pointer"
                              title={isExpanded ? 'Hide Raw JSON' : 'View Raw JSON (Staff Mode)'}
                            >
                              <FileCode2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Staff-only Raw JSON Expander */}
                      {role === 'staff' && isExpanded && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto space-y-1">
                          <div className="text-[9px] text-slate-400 pb-1 border-b border-slate-700 flex justify-between font-mono">
                            <span>RAW INGESTION TELEMETRY & ADAPTER MAPPING</span>
                            <span>ID: {ev.id}</span>
                          </div>
                          <pre className="whitespace-pre-wrap leading-tight">
                            {JSON.stringify(
                              {
                                id: ev.id,
                                source: ev.source,
                                originalTimestamp: ev.timestamp,
                                istTimestamp: ev.timestampIST,
                                category: ev.category,
                                severity: ev.severity,
                                coordinates: ev.coordinates,
                                locationName: ev.locationName,
                                metadata: ev.metadata,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show More / Show Less Button */}
            {mergedEvents.length > 5 && (
              <button
                type="button"
                onClick={() => setShowMoreEvents((prev) => !prev)}
                className="w-full py-2 px-3 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60 hover:bg-[var(--jaipur-surface-warm)] text-xs font-bold text-[var(--jaipur-terracotta)] transition-colors cursor-pointer flex items-center justify-center gap-1 mt-2"
              >
                <span>
                  {showMoreEvents
                    ? t('showLessUpdates')
                    : (language === 'hi'
                        ? `और देखें (${mergedEvents.length - 5} और अपडेट)`
                        : `Show more (${mergedEvents.length - 5} more updates)`)}
                </span>
                {showMoreEvents ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
