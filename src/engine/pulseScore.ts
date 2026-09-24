/**
 * CityPulse Jaipur – Pulse Score Engine
 * Computes per-zone Pulse Score over a rolling 30-min window using 5 sub-scores:
 * - Weather: 20%
 * - AQI: 20%
 * - Transit: 20%
 * - Complaints: 25%
 * - Power Grid: 15%
 *
 * Automatically redistributes weights when feeds are offline and marks "partial data".
 * Citywide pulse = population-weighted average across all 9 administrative zones.
 * Bands:
 *   80–100: Calm / शांत
 *   60–79:  Watch / सतर्क
 *   40–59:  Stressed / तनावग्रस्त
 *   0–39:   Critical / गंभीर
 */

import { JAIPUR_ZONES } from '../config/city';
import {
  CivicEvent,
  FeedStatus,
  PulseBand,
  PulseHistoryPoint,
  PulseMetrics,
  ZonePulseDetail,
  ZoneWeatherAQI,
} from '../types';

export const BASE_WEIGHTS = {
  weather: 0.20,
  aqi: 0.20,
  transit: 0.20,
  complaints: 0.25,
  power: 0.15,
} as const;

export type SubscoreKey = keyof typeof BASE_WEIGHTS;

/**
 * Determine PulseBand from numerical score [0 - 100]
 */
export function getPulseBand(score: number): PulseBand {
  if (score >= 80) return 'calm';
  if (score >= 60) return 'watch';
  if (score >= 40) return 'stressed';
  return 'critical';
}

/**
 * Bilingual band metadata
 */
export function getBandDetails(band: PulseBand) {
  switch (band) {
    case 'calm':
      return {
        labelEn: 'Calm',
        labelHi: 'शांत',
        color: '#1f8b5f', // emerald/green
        bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        ringColor: 'rgba(31,139,95,0.4)',
        ecgSpeed: 2.2, // seconds per cycle
        ecgSeverity: 'normal',
      };
    case 'watch':
      return {
        labelEn: 'Watch',
        labelHi: 'सतर्क',
        color: '#d48828', // amber/gold
        bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        ringColor: 'rgba(212,136,40,0.4)',
        ecgSpeed: 1.5,
        ecgSeverity: 'elevated',
      };
    case 'stressed':
      return {
        labelEn: 'Stressed',
        labelHi: 'तनावग्रस्त',
        color: '#e67e22', // orange
        bgClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
        ringColor: 'rgba(230,126,34,0.4)',
        ecgSpeed: 1.0,
        ecgSeverity: 'high',
      };
    case 'critical':
    default:
      return {
        labelEn: 'Critical',
        labelHi: 'गंभीर',
        color: '#c0392b', // crimson
        bgClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
        ringColor: 'rgba(192,57,43,0.5)',
        ecgSpeed: 0.65,
        ecgSeverity: 'critical',
      };
  }
}

/**
 * Computes weather subscore (0 - 100) based on temperature, rain, wind, and alerts.
 */
function computeWeatherSubscore(
  zoneId: string,
  weatherData: ZoneWeatherAQI | undefined,
  zoneEvents: CivicEvent[]
): number {
  let score = 96; // Healthy baseline

  if (weatherData) {
    const temp = weatherData.temperatureC;
    // Temperature stress: Jaipur heat threshold
    if (temp >= 45) {
      score -= 45; // Severe heatwave
    } else if (temp >= 40) {
      score -= 22; // Moderate heat
    } else if (temp >= 38) {
      score -= 10;
    }

    // Rain & waterlogging hazard
    const rain = weatherData.rainMm || 0;
    if (rain >= 15) {
      score -= 40; // Critical downpour
    } else if (rain >= 5) {
      score -= 20; // Moderate rain
    } else if (rain > 0.5) {
      score -= 6;
    }

    // High wind gusts / dust storm (Aandhi)
    const gusts = weatherData.windGustsKmh || weatherData.windSpeedKmh;
    if (gusts >= 65) {
      score -= 30; // Severe gale / dust storm
    } else if (gusts >= 45) {
      score -= 15;
    }
  }

  // Deduct for active weather alert events
  const weatherEvents = zoneEvents.filter((e) => e.category === 'water' || e.source === 'weather_station');
  weatherEvents.forEach((ev) => {
    if (ev.severity === 'critical') score -= 18;
    else if (ev.severity === 'high') score -= 10;
    else if (ev.severity === 'medium') score -= 4;
  });

  return Math.max(10, Math.min(100, Math.round(score)));
}

/**
 * Computes AQI subscore (0 - 100) mapped inversely from Indian CPCB AQI.
 * Formula:
 *  - AQI 0–50 (Good): 95–100
 *  - AQI 51–100 (Satisfactory): 80–94
 *  - AQI 101–200 (Moderate): 60–79
 *  - AQI 201–300 (Poor): 40–59
 *  - AQI 301–400 (Very Poor): 20–39
 *  - AQI 401–500 (Severe): 5–19
 */
function computeAQISubscore(weatherData: ZoneWeatherAQI | undefined): number {
  if (!weatherData || weatherData.aqi === undefined) {
    return 85; // Default satisfactory baseline
  }

  const aqi = weatherData.aqi;
  if (aqi <= 50) {
    // 0 -> 100, 50 -> 95
    return Math.round(100 - (aqi / 50) * 5);
  }
  if (aqi <= 100) {
    // 51 -> 94, 100 -> 80
    return Math.round(94 - ((aqi - 50) / 50) * 14);
  }
  if (aqi <= 200) {
    // 101 -> 79, 200 -> 60
    return Math.round(79 - ((aqi - 100) / 100) * 19);
  }
  if (aqi <= 300) {
    // 201 -> 59, 300 -> 40
    return Math.round(59 - ((aqi - 200) / 100) * 19);
  }
  if (aqi <= 400) {
    // 301 -> 39, 400 -> 20
    return Math.round(39 - ((aqi - 300) / 100) * 19);
  }
  // Severe > 400
  return Math.max(5, Math.round(19 - ((aqi - 400) / 100) * 14));
}

/**
 * Computes transit subscore (0 - 100) splitting the 20% weight into:
 * - 10% Metro & Bus transit telemetry
 * - 10% Road Traffic congestion from Google Routes API (computeRoutes)
 */
function computeTransitSubscore(zoneId: string, zoneEvents: CivicEvent[]): number {
  // 1. Metro & Bus transit sub-component (50% of transit score)
  let metroBusScore = 95;
  const transitEvents = zoneEvents.filter((e) => e.category === 'transit' || e.source === 'metro_feed');

  transitEvents.forEach((ev) => {
    const raw = ev.metadata?.rawPayload as Record<string, unknown> | undefined;

    // Metro delay checks
    if (raw && typeof raw.delay_minutes === 'number') {
      if (raw.delay_minutes >= 15) metroBusScore -= 35;
      else if (raw.delay_minutes >= 8) metroBusScore -= 18;
      else if (raw.delay_minutes >= 3) metroBusScore -= 8;
    }

    // Metro crowd density
    if (raw && typeof raw.crowd_density_percent === 'number') {
      if (raw.crowd_density_percent >= 90) metroBusScore -= 18;
      else if (raw.crowd_density_percent >= 75) metroBusScore -= 8;
    }

    // Bus congestion speed crawl
    if (raw && typeof raw.speed_kmh === 'number') {
      if (raw.speed_kmh < 10) metroBusScore -= 25;
      else if (raw.speed_kmh < 18) metroBusScore -= 12;
    }

    // Default severity penalties if raw is missing
    if (!raw) {
      if (ev.severity === 'critical') metroBusScore -= 30;
      else if (ev.severity === 'high') metroBusScore -= 18;
      else if (ev.severity === 'medium') metroBusScore -= 8;
    }
  });
  metroBusScore = Math.max(10, Math.min(100, Math.round(metroBusScore)));

  // 2. Road Traffic sub-component (50% of transit score, representing 10% of total pulse)
  // Evaluates corridor congestion ratio (duration / staticDuration)
  let roadTrafficScore = 95;
  const roadTrafficEvents = zoneEvents.filter(
    (e) => (e.id.startsWith('traffic-route-') || e.metadata?.congestionRatio !== undefined) &&
           (e.zoneId === zoneId || ((e.metadata?.mappedZoneIds as string[] | undefined)?.includes(zoneId)))
  );

  if (roadTrafficEvents.length > 0) {
    let worstRatio = 1.0;
    roadTrafficEvents.forEach((ev) => {
      const ratio = typeof ev.metadata?.congestionRatio === 'number' ? ev.metadata.congestionRatio : 1.0;
      if (ratio > worstRatio) worstRatio = ratio;
    });

    if (worstRatio >= 2.0) {
      roadTrafficScore = 25; // Severe gridlock
    } else if (worstRatio > 1.6) {
      // 1.6 to 2.0 -> 55 down to 30
      roadTrafficScore = Math.round(55 - ((worstRatio - 1.6) / 0.4) * 25);
    } else if (worstRatio >= 1.2) {
      // 1.2 to 1.6 -> 85 down to 60
      roadTrafficScore = Math.round(85 - ((worstRatio - 1.2) / 0.4) * 25);
    } else {
      roadTrafficScore = 95; // Free-flowing normal traffic
    }
  }

  // Combined: 50% Metro/Bus + 50% Road Traffic = 100% of Transit weight
  return Math.max(10, Math.min(100, Math.round(0.5 * metroBusScore + 0.5 * roadTrafficScore)));
}

/**
 * Computes complaints subscore (0 - 100) based on count and severity of citizen grievances.
 */
function computeComplaintsSubscore(zoneEvents: CivicEvent[]): number {
  const complaints = zoneEvents.filter(
    (e) => e.source === 'resident_report' || e.category === 'sanitation' || e.category === 'traffic'
  );

  if (complaints.length === 0) return 98;

  let deduction = 0;
  complaints.forEach((c) => {
    if (c.severity === 'critical') deduction += 20;
    else if (c.severity === 'high') deduction += 12;
    else if (c.severity === 'medium') deduction += 6;
    else deduction += 2;
  });

  // Scale deduction smoothly so it doesn't instantly collapse to 0 on 3-4 complaints
  const score = 100 - Math.min(88, deduction);
  return Math.max(12, Math.round(score));
}

/**
 * Computes power grid subscore (0 - 100) based on JVVNL SCADA outages.
 */
function computePowerSubscore(zoneEvents: CivicEvent[]): number {
  let score = 96;
  const powerEvents = zoneEvents.filter((e) => e.category === 'power' || e.source === 'power_grid');

  // Track unresolved feeder trips
  powerEvents.forEach((ev) => {
    const raw = ev.metadata?.rawPayload as Record<string, unknown> | undefined;
    const status = raw?.status || (ev.status === 'resolved' ? 'RESTORED' : 'OUTAGE_REPORTED');

    if (status === 'OUTAGE_REPORTED') {
      if (ev.severity === 'critical') score -= 45;
      else if (ev.severity === 'high') score -= 28;
      else score -= 15;
    } else if (status === 'VOLTAGE_FLUCTUATION') {
      score -= 10;
    }
  });

  return Math.max(15, Math.min(100, Math.round(score)));
}

/**
 * Redistributes weights when any feed is offline or in failure state.
 */
export function calculateEffectiveWeights(feedStatuses: FeedStatus[]): {
  weights: Record<SubscoreKey, number>;
  isPartialData: boolean;
} {
  const feedMap: Record<SubscoreKey, FeedStatus | undefined> = {
    weather: feedStatuses.find((f) => f.feedId === 'open-meteo-weather'),
    aqi: feedStatuses.find((f) => f.feedId === 'open-meteo-air-quality'),
    transit: feedStatuses.find((f) => f.feedId === 'jmrc-transit-telemetry' || f.feedId === 'road-traffic-routes-api'),
    complaints: feedStatuses.find((f) => f.feedId === 'citizen-complaints-stream'),
    power: feedStatuses.find((f) => f.feedId === 'jvvnl-power-grid'),
  };

  const activeKeys: SubscoreKey[] = [];
  let availableWeightSum = 0;

  (Object.keys(BASE_WEIGHTS) as SubscoreKey[]).forEach((key) => {
    const feed = feedMap[key];
    const isOnline = !feed || feed.status !== 'offline';
    if (isOnline) {
      activeKeys.push(key);
      availableWeightSum += BASE_WEIGHTS[key];
    }
  });

  // If all are offline (edge case), reset to equal distribution
  if (availableWeightSum === 0) {
    const equalWeight = 1 / 5;
    return {
      weights: {
        weather: equalWeight,
        aqi: equalWeight,
        transit: equalWeight,
        complaints: equalWeight,
        power: equalWeight,
      },
      isPartialData: true,
    };
  }

  const weights: Record<SubscoreKey, number> = {
    weather: 0,
    aqi: 0,
    transit: 0,
    complaints: 0,
    power: 0,
  };

  activeKeys.forEach((key) => {
    weights[key] = BASE_WEIGHTS[key] / availableWeightSum;
  });

  const isPartialData = activeKeys.length < 5;

  return { weights, isPartialData };
}

/**
 * Cache for memoization of rolling calculations
 */
interface PulseEngineCache {
  lastCalcTime: number;
  eventsHash: string;
  result: PulseMetrics | null;
}

const engineCache: PulseEngineCache = {
  lastCalcTime: 0,
  eventsHash: '',
  result: null,
};

/**
 * Main Pulse Engine calculation:
 * Computes all 9 zone pulse details, population-weighted citywide score, trends, and history.
 */
export function calculateCityPulse(
  events: CivicEvent[],
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>,
  feedStatuses: FeedStatus[],
  existingHistory: PulseHistoryPoint[] = []
): PulseMetrics {
  const now = Date.now();
  const rollingWindowStart = now - 30 * 60 * 1000; // 30 minutes

  // Filter events within rolling 30-min window
  const windowEvents = events.filter((e) => e.timestamp >= rollingWindowStart);

  // Compute effective weights
  const { weights, isPartialData } = calculateEffectiveWeights(feedStatuses);

  // Group events by zone
  const eventsByZone: Record<string, CivicEvent[]> = {};
  JAIPUR_ZONES.forEach((z) => {
    eventsByZone[z.id] = [];
  });
  windowEvents.forEach((ev) => {
    if (eventsByZone[ev.zoneId]) {
      eventsByZone[ev.zoneId].push(ev);
    }
  });

  const zoneDetails: Record<string, ZonePulseDetail> = {};
  const zoneScores: Record<string, number> = {};

  let weightedCityScoreSum = 0;
  let totalPopulationWeight = 0;

  JAIPUR_ZONES.forEach((zone) => {
    const zEvents = eventsByZone[zone.id] || [];
    const zWeather = zoneWeatherAQI[zone.id];

    // Compute 5 subscores
    const weatherScore = computeWeatherSubscore(zone.id, zWeather, zEvents);
    const aqiScore = computeAQISubscore(zWeather);
    const transitScore = computeTransitSubscore(zone.id, zEvents);
    const complaintsScore = computeComplaintsSubscore(zEvents);
    const powerScore = computePowerSubscore(zEvents);

    const subscores = {
      weather: weatherScore,
      aqi: aqiScore,
      transit: transitScore,
      complaints: complaintsScore,
      power: powerScore,
    };

    // Calculate weighted zone score
    const rawZoneScore =
      subscores.weather * weights.weather +
      subscores.aqi * weights.aqi +
      subscores.transit * weights.transit +
      subscores.complaints * weights.complaints +
      subscores.power * weights.power;

    const finalScore = Math.max(5, Math.min(100, Math.round(rawZoneScore)));
    const band = getPulseBand(finalScore);

    // Identify top issue by biggest deduction from 100
    const deductions: { key: SubscoreKey; deduction: number }[] = [
      { key: 'weather', deduction: 100 - weatherScore },
      { key: 'aqi', deduction: 100 - aqiScore },
      { key: 'transit', deduction: 100 - transitScore },
      { key: 'complaints', deduction: 100 - complaintsScore },
      { key: 'power', deduction: 100 - powerScore },
    ];
    deductions.sort((a, b) => b.deduction - a.deduction);
    const topDeduction = deductions[0];

    const issueLabels: Record<SubscoreKey, { en: string; hi: string }> = {
      weather: { en: 'Weather Stress / Heat', hi: 'मौसम का दबाव / गर्मी' },
      aqi: { en: 'Elevated AQI Pollution', hi: 'वायु प्रदूषण वृद्धि' },
      transit: { en: 'Transit Crawl & Delays', hi: 'परिवहन व मेट्रो विलंब' },
      complaints: { en: 'Citizen Grievances Surge', hi: 'नागरिक शिकायतों में उछाल' },
      power: { en: 'Power Feeder Outage', hi: 'विद्युत फीडर ट्रिप' },
    };

    const hasSignificantIssue = topDeduction.deduction >= 15;
    const topIssueEn = hasSignificantIssue ? issueLabels[topDeduction.key].en : 'Optimal Rhythm';
    const topIssueHi = hasSignificantIssue ? issueLabels[topDeduction.key].hi : 'सामान्य प्रवाह';

    // Retrieve previous history for sparkline
    const prevHistoryForZone = existingHistory.map((h) => h.zoneScores[zone.id] ?? finalScore);
    const rollingZoneHistory = [...prevHistoryForZone.slice(-14), finalScore];

    // Determine trend from history
    let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
    if (rollingZoneHistory.length >= 3) {
      const recent = rollingZoneHistory.slice(-3);
      const diff = recent[2] - recent[0];
      if (diff >= 3) trend = 'improving';
      else if (diff <= -3) trend = 'deteriorating';
    }

    zoneDetails[zone.id] = {
      zoneId: zone.id,
      score: finalScore,
      band,
      trend,
      subscores,
      isPartialData,
      activeWeights: weights,
      history: rollingZoneHistory,
      topIssueEn,
      topIssueHi,
    };

    zoneScores[zone.id] = finalScore;

    // Accumulate citywide population-weighted score
    weightedCityScoreSum += finalScore * zone.populationWeight;
    totalPopulationWeight += zone.populationWeight;
  });

  // Citywide population-weighted pulse score
  const cityScore = Math.round(weightedCityScoreSum / (totalPopulationWeight || 1));
  const cityBand = getPulseBand(cityScore);

  // Status mapping for backward compatibility
  const status: 'optimal' | 'moderate' | 'elevated' | 'critical' =
    cityBand === 'calm'
      ? 'optimal'
      : cityBand === 'watch'
      ? 'moderate'
      : cityBand === 'stressed'
      ? 'elevated'
      : 'critical';

  // Category aggregate scores for overview meters
  const categoryScores = {
    traffic: Math.round(
      Object.values(zoneDetails).reduce((acc, z) => acc + z.subscores.transit, 0) / JAIPUR_ZONES.length
    ),
    water: Math.round(
      Object.values(zoneDetails).reduce((acc, z) => acc + z.subscores.weather, 0) / JAIPUR_ZONES.length
    ),
    air_quality: Math.round(
      Object.values(zoneDetails).reduce((acc, z) => acc + z.subscores.aqi, 0) / JAIPUR_ZONES.length
    ),
    sanitation: Math.round(
      Object.values(zoneDetails).reduce((acc, z) => acc + z.subscores.complaints, 0) / JAIPUR_ZONES.length
    ),
    transit: Math.round(
      Object.values(zoneDetails).reduce((acc, z) => acc + z.subscores.transit, 0) / JAIPUR_ZONES.length
    ),
    crowd: 78,
    power: Math.round(
      Object.values(zoneDetails).reduce((acc, z) => acc + z.subscores.power, 0) / JAIPUR_ZONES.length
    ),
  };

  // Determine city trend
  let cityTrend: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (existingHistory.length >= 3) {
    const recentScores = existingHistory.slice(-3).map((h) => h.cityScore);
    const diff = cityScore - recentScores[0];
    if (diff >= 3) cityTrend = 'improving';
    else if (diff <= -3) cityTrend = 'deteriorating';
  }

  // Update history point
  const timeLabel = new Date(now).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
  });

  const updatedHistory: PulseHistoryPoint[] = [
    ...existingHistory.slice(-23), // Keep last 24 intervals
    {
      timestamp: now,
      timeLabel,
      cityScore,
      zoneScores,
    },
  ];

  // 10-second rule summary generation
  const summaryEn = generate10SecondSummaryEn(cityScore, cityBand, zoneDetails, isPartialData);
  const summaryHi = generate10SecondSummaryHi(cityScore, cityBand, zoneDetails, isPartialData);

  const activeIncidentsCount = windowEvents.filter((e) => e.status === 'active').length;

  return {
    cityScore,
    status,
    band: cityBand,
    trend: cityTrend,
    categoryScores,
    zoneScores,
    zoneDetails,
    pulseHistory: updatedHistory,
    activeIncidentsCount,
    lastCalculatedAt: now,
    summaryEn,
    summaryHi,
  };
}

/**
 * Backward-compatible wrapper for calculating pulse across all zones and feeds.
 */
export function calculateAllPulseScores(
  events: CivicEvent[],
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>,
  feedStatuses: FeedStatus[],
  disabledFeedIds?: string[],
  existingHistory: PulseHistoryPoint[] = []
): PulseMetrics {
  const effectiveFeedStatuses = disabledFeedIds && disabledFeedIds.length > 0
    ? feedStatuses.map((f) => (disabledFeedIds.includes(f.feedId) ? { ...f, status: 'offline' as const } : f))
    : feedStatuses;
  return calculateCityPulse(events, zoneWeatherAQI, effectiveFeedStatuses, existingHistory);
}

/**
 * 10-Second rule English summary:
 * Instantly conveys the city's state in one scannable sentence.
 */
function generate10SecondSummaryEn(
  score: number,
  band: PulseBand,
  zoneDetails: Record<string, ZonePulseDetail>,
  isPartialData: boolean
): string {
  const stressedZones = Object.values(zoneDetails)
    .filter((z) => z.band === 'stressed' || z.band === 'critical')
    .map((z) => {
      const zone = JAIPUR_ZONES.find((j) => j.id === z.zoneId);
      return zone ? zone.nameEn.split(' ')[0] : z.zoneId;
    });

  const partialNote = isPartialData ? ' (Partial Telemetry Online)' : '';

  if (band === 'calm') {
    return `Pink City is operating in Calm rhythm (${score}/100); all vital grids, Pink Line metro, and civic services are flowing smoothly.${partialNote}`;
  }
  if (band === 'watch') {
    if (stressedZones.length > 0) {
      return `Watch band active (${score}/100); localized pressure in ${stressedZones.slice(0, 2).join(' & ')}, city core transit remains stable.${partialNote}`;
    }
    return `City in Watch state (${score}/100); moderate seasonal load on civic infrastructure with steady traffic flow.${partialNote}`;
  }
  if (band === 'stressed') {
    const focus = stressedZones.length > 0 ? `across ${stressedZones.join(', ')}` : 'citywide';
    return `Elevated stress detected (${score}/100) ${focus}; coordination recommended for transit and power load.${partialNote}`;
  }
  return `Critical municipal alert (${score}/100); multi-system stress active across ${stressedZones.join(', ') || 'multiple zones'}. Immediate response mobilized.${partialNote}`;
}

/**
 * 10-Second rule Hindi summary:
 * Instantly conveys the city's state in one scannable Hindi sentence.
 */
function generate10SecondSummaryHi(
  score: number,
  band: PulseBand,
  zoneDetails: Record<string, ZonePulseDetail>,
  isPartialData: boolean
): string {
  const stressedZones = Object.values(zoneDetails)
    .filter((z) => z.band === 'stressed' || z.band === 'critical')
    .map((z) => {
      const zone = JAIPUR_ZONES.find((j) => j.id === z.zoneId);
      return zone ? zone.nameHi.split(' ')[0] : z.zoneId;
    });

  const partialNote = isPartialData ? ' (आंशिक टेलीमेट्री उपलब्ध)' : '';

  if (band === 'calm') {
    return `गुलाबी नगरी शांत प्रवाह में है (${score}/100); मेट्रो, विद्युत ग्रिड और नागरिक सेवाएं सुचारू रूप से संचालित हैं।${partialNote}`;
  }
  if (band === 'watch') {
    if (stressedZones.length > 0) {
      return `सतर्कता स्थिति (${score}/100); ${stressedZones.slice(0, 2).join(' व ')} में आंशिक दबाव, मुख्य शहर का आवागमन स्थिर।${partialNote}`;
    }
    return `शहर सतर्क स्थिति में है (${score}/100); मौसम व बुनियादी ढांचे पर मध्यम भार, यातायात सामान्य।${partialNote}`;
  }
  if (band === 'stressed') {
    const focus = stressedZones.length > 0 ? `${stressedZones.join(', ')} में` : 'शहरभर में';
    return `तनावग्रस्त स्थिति दर्ज (${score}/100); ${focus} परिवहन और विद्युत भार पर निगरानी की आवश्यकता।${partialNote}`;
  }
  return `गंभीर नागरिक चेतावनी (${score}/100); ${stressedZones.join(', ') || 'कई क्षेत्रों'} में बहु-प्रणालीय दबाव। आपातकालीन प्रतिक्रिया सक्रिय।${partialNote}`;
}
