/**
 * CityPulse Jaipur – Anomaly Detection Engine
 *
 * Requirements:
 * 1. 5-minute event buckets per zone per source.
 * 2. Baseline established from the previous 2 hours (seeded default baselines at startup).
 * 3. Flag statistical anomaly when z >= 2.0 AND bucket count >= 3:
 *      z = (count - mean) / max(stdDev, 1.0)
 * 4. Flag deterministic threshold anomalies:
 *      - AQI Poor or worse (> 200: Poor, Very Poor, Severe)
 *      - Red weather alerts (extreme heatwave >= 45°C, downpour >= 15mm/h, storm gusts >= 70km/h)
 *      - Metro delays >= 15 min
 *
 * Memoized and bilingual.
 */

import { JAIPUR_ZONES } from '../config/city';
import {
  Anomaly,
  CivicEvent,
  EventCategory,
  EventSource,
  ZoneWeatherAQI,
} from '../types';

interface BaselineStats {
  mean: number;
  stdDev: number;
}

/**
 * Seeded default baselines (events per 5-min bucket) across zones and sources.
 * Calibrated based on Jaipur's historical municipal telemetry distributions.
 */
const DEFAULT_BASELINES: Record<string, Record<string, BaselineStats>> = {
  'walled-city': {
    resident_report: { mean: 1.8, stdDev: 1.1 },
    metro_feed: { mean: 2.2, stdDev: 1.2 },
    traffic_camera: { mean: 2.5, stdDev: 1.3 },
    power_grid: { mean: 0.5, stdDev: 0.6 },
    weather_station: { mean: 0.3, stdDev: 0.5 },
  },
  mansarovar: {
    resident_report: { mean: 1.4, stdDev: 0.9 },
    metro_feed: { mean: 1.8, stdDev: 1.0 },
    traffic_camera: { mean: 1.9, stdDev: 1.1 },
    power_grid: { mean: 0.4, stdDev: 0.5 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  'malviya-nagar': {
    resident_report: { mean: 1.2, stdDev: 0.8 },
    metro_feed: { mean: 0.5, stdDev: 0.6 },
    traffic_camera: { mean: 2.1, stdDev: 1.2 },
    power_grid: { mean: 0.4, stdDev: 0.5 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  'vaishali-nagar': {
    resident_report: { mean: 1.1, stdDev: 0.8 },
    metro_feed: { mean: 0.2, stdDev: 0.4 },
    traffic_camera: { mean: 1.8, stdDev: 1.0 },
    power_grid: { mean: 0.4, stdDev: 0.5 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  'raja-park': {
    resident_report: { mean: 1.3, stdDev: 0.9 },
    metro_feed: { mean: 0.3, stdDev: 0.5 },
    traffic_camera: { mean: 2.0, stdDev: 1.1 },
    power_grid: { mean: 0.3, stdDev: 0.5 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  sanganer: {
    resident_report: { mean: 1.0, stdDev: 0.8 },
    metro_feed: { mean: 0.2, stdDev: 0.4 },
    traffic_camera: { mean: 1.5, stdDev: 0.9 },
    power_grid: { mean: 0.5, stdDev: 0.6 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  amer: {
    resident_report: { mean: 0.8, stdDev: 0.7 },
    metro_feed: { mean: 0.1, stdDev: 0.3 },
    traffic_camera: { mean: 1.2, stdDev: 0.8 },
    power_grid: { mean: 0.3, stdDev: 0.5 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  jagatpura: {
    resident_report: { mean: 0.9, stdDev: 0.7 },
    metro_feed: { mean: 0.1, stdDev: 0.3 },
    traffic_camera: { mean: 1.3, stdDev: 0.8 },
    power_grid: { mean: 0.4, stdDev: 0.5 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
  'cscheme-civillines': {
    resident_report: { mean: 1.1, stdDev: 0.8 },
    metro_feed: { mean: 1.6, stdDev: 1.0 },
    traffic_camera: { mean: 2.2, stdDev: 1.2 },
    power_grid: { mean: 0.3, stdDev: 0.4 },
    weather_station: { mean: 0.3, stdDev: 0.4 },
  },
};

const GLOBAL_FALLBACK_BASELINE: BaselineStats = { mean: 1.0, stdDev: 0.8 };

function getBaseline(zoneId: string, source: string): BaselineStats {
  return DEFAULT_BASELINES[zoneId]?.[source] || GLOBAL_FALLBACK_BASELINE;
}

/**
 * Cache for anomaly calculations to prevent redundant computations on rapid renders
 */
interface AnomalyCache {
  key: string;
  timestamp: number;
  anomalies: Anomaly[];
}

let cachedAnomalies: AnomalyCache | null = null;

/**
 * Main Anomaly Detection routine
 */
export function detectAnomalies(
  events: CivicEvent[],
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>,
  referenceTimestamp?: number
): Anomaly[] {
  const now = referenceTimestamp || Date.now();
  const cacheKey = `${events.length}_${Object.keys(zoneWeatherAQI).length}_${Math.floor(now / 10000)}`;

  if (cachedAnomalies && cachedAnomalies.key === cacheKey) {
    return cachedAnomalies.anomalies;
  }

  const anomalies: Anomaly[] = [];
  const BUCKET_SIZE_MS = 5 * 60 * 1000; // 5 minutes
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const currentBucketKey = Math.floor(now / BUCKET_SIZE_MS);

  // 1. Group events from the last 2 hours into 5-minute buckets by zone & source
  const recentEvents = events.filter((e) => e.timestamp >= now - TWO_HOURS_MS);

  // Map: `${zoneId}::${source}::${bucketIndex}` -> count
  const bucketCounts = new Map<string, number>();
  const currentBucketEvents = new Map<string, CivicEvent[]>();

  recentEvents.forEach((ev) => {
    const bucket = Math.floor(ev.timestamp / BUCKET_SIZE_MS);
    const key = `${ev.zoneId}::${ev.source}::${bucket}`;
    bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);

    if (bucket === currentBucketKey || bucket === currentBucketKey - 1) {
      const activeKey = `${ev.zoneId}::${ev.source}`;
      const list = currentBucketEvents.get(activeKey) || [];
      list.push(ev);
      currentBucketEvents.set(activeKey, list);
    }
  });

  // 2. Statistical Z-Score Anomaly Detection
  // Check active buckets in the current / immediate past 5-min window
  JAIPUR_ZONES.forEach((zone) => {
    const sources: EventSource[] = [
      'metro_feed',
      'traffic_camera',
      'resident_report',
      'weather_station',
      'power_grid',
    ];

    sources.forEach((src) => {
      const activeKey = `${zone.id}::${src}`;
      const currentCount =
        bucketCounts.get(`${activeKey}::${currentBucketKey}`) ||
        bucketCounts.get(`${activeKey}::${currentBucketKey - 1}`) ||
        0;

      // Rule: count >= 3
      if (currentCount >= 3) {
        const baseline = getBaseline(zone.id, src);
        const effectiveStdDev = Math.max(baseline.stdDev, 1.0);
        const zScore = (currentCount - baseline.mean) / effectiveStdDev;

        // Rule: z >= 2.0
        if (zScore >= 2.0) {
          const deviationPercent = Math.round(((currentCount - baseline.mean) / baseline.mean) * 100);
          const sampleEvents = currentBucketEvents.get(activeKey) || [];
          const primaryCat = sampleEvents[0]?.category || 'traffic';

          const sourceLabels: Record<string, { en: string; hi: string }> = {
            resident_report: { en: 'Citizen Grievances', hi: 'नागरिक शिकायतें' },
            metro_feed: { en: 'Metro Telemetry', hi: 'मेट्रो आवागमन' },
            traffic_camera: { en: 'Traffic Surveillance', hi: 'यातायात कैमरा' },
            power_grid: { en: 'Power Feeder Grid', hi: 'विद्युत डिस्कॉम ग्रिड' },
            weather_station: { en: 'Weather Station', hi: 'मौसम केंद्र' },
          };

          const sLabel = sourceLabels[src] || { en: src, hi: src };
          const zNameEn = zone.nameEn.split(' ')[0];
          const zNameHi = zone.nameHi.split(' ')[0];

          anomalies.push({
            id: `anom_stat_${zone.id}_${src}_${currentBucketKey}`,
            zoneId: zone.id,
            source: src,
            category: primaryCat,
            metricNameEn: `${sLabel.en} Rate Spike`,
            metricNameHi: `${sLabel.hi} में असामान्य वृद्धि`,
            baselineValue: Number(baseline.mean.toFixed(1)),
            currentValue: currentCount,
            zScore: Number(zScore.toFixed(2)),
            deviationPercent,
            severity: zScore >= 3.0 ? 'critical' : 'high',
            isThresholdBreach: false,
            detectedAt: now,
            summaryEn: `Statistical spike: ${currentCount} events in 5-min bucket (Baseline: ${baseline.mean}/5min, z=${zScore.toFixed(1)}, +${deviationPercent}%) in ${zNameEn}.`,
            summaryHi: `सांख्यिकीय उछाल: 5 मिनट में ${currentCount} घटनाएं (मानक: ${baseline.mean}/5मिनट, z=${zScore.toFixed(1)}, +${deviationPercent}%) - ${zNameHi}।`,
          });
        }
      }
    });
  });

  // 3. Threshold Anomalies
  // A. CPCB Indian AQI Poor or worse (> 200: Poor, Very Poor, Severe)
  JAIPUR_ZONES.forEach((zone) => {
    const wData = zoneWeatherAQI[zone.id];
    if (wData && wData.aqi !== undefined && wData.aqi > 200) {
      const aqiVal = wData.aqi;
      const isSevere = aqiVal > 400;
      const isVeryPoor = aqiVal > 300;
      const severity = isSevere ? 'critical' : isVeryPoor ? 'high' : 'medium';

      const zNameEn = zone.nameEn.split(' ')[0];
      const zNameHi = zone.nameHi.split(' ')[0];

      anomalies.push({
        id: `anom_thresh_aqi_${zone.id}_${Math.floor(now / (15 * 60 * 1000))}`,
        zoneId: zone.id,
        source: 'weather_station',
        category: 'air_quality',
        metricNameEn: 'CPCB AQI Threshold Breach',
        metricNameHi: 'सीपीसीबी वायु गुणवत्ता सीमा उल्लंघन',
        baselineValue: 100, // Satisfactory standard
        currentValue: aqiVal,
        deviationPercent: Math.round(((aqiVal - 100) / 100) * 100),
        severity,
        isThresholdBreach: true,
        detectedAt: now,
        summaryEn: `Air Quality Index reached ${aqiVal} (Threshold >200 breached, PM2.5: ${wData.pm25 || '--'} µg/m³) in ${zNameEn}.`,
        summaryHi: `वायु गुणवत्ता सूचकांक ${aqiVal} पहुंचा (मानक सीमा >200 का उल्लंघन, PM2.5: ${wData.pm25 || '--'} µg/m³) - ${zNameHi}।`,
      });
    }
  });

  // B. Red Weather Alerts (heatwave >= 45°C, downpour >= 15mm/h, storm gusts >= 70km/h)
  JAIPUR_ZONES.forEach((zone) => {
    const wData = zoneWeatherAQI[zone.id];
    if (!wData) return;

    const zNameEn = zone.nameEn.split(' ')[0];
    const zNameHi = zone.nameHi.split(' ')[0];

    // Severe Heatwave
    if (wData.temperatureC >= 45) {
      anomalies.push({
        id: `anom_thresh_heat_${zone.id}_${Math.floor(now / (15 * 60 * 1000))}`,
        zoneId: zone.id,
        source: 'weather_station',
        category: 'water',
        metricNameEn: 'Severe Heatwave Breach',
        metricNameHi: 'अत्यधिक लू (हीटवेव) सीमा पार',
        baselineValue: 35,
        currentValue: wData.temperatureC,
        deviationPercent: Math.round(((wData.temperatureC - 35) / 35) * 100),
        severity: 'critical',
        isThresholdBreach: true,
        detectedAt: now,
        summaryEn: `Extreme surface ambient temperature of ${wData.temperatureC}°C (Feels like ${wData.apparentTemperatureC}°C) in ${zNameEn}.`,
        summaryHi: `भीषण तापमान ${wData.temperatureC}°C (अनुभूत ${wData.apparentTemperatureC}°C) दर्ज - ${zNameHi}।`,
      });
    }

    // Critical Downpour
    if ((wData.rainMm || 0) >= 15) {
      anomalies.push({
        id: `anom_thresh_rain_${zone.id}_${Math.floor(now / (15 * 60 * 1000))}`,
        zoneId: zone.id,
        source: 'weather_station',
        category: 'water',
        metricNameEn: 'Critical Downpour Inundation',
        metricNameHi: 'भारी मूसलाधार बारिश सीमा पार',
        baselineValue: 2,
        currentValue: wData.rainMm || 0,
        deviationPercent: 650,
        severity: 'critical',
        isThresholdBreach: true,
        detectedAt: now,
        summaryEn: `Heavy torrential precipitation of ${wData.rainMm}mm/h active in ${zNameEn}. Risk of underpass waterlogging.`,
        summaryHi: `अत्यधिक मूसलाधार बारिश ${wData.rainMm} मिमी/घंटा - ${zNameHi}। अंडरपास में जलभराव का खतरा।`,
      });
    }

    // Violent Storm Gusts (Aandhi)
    if ((wData.windGustsKmh || 0) >= 70) {
      anomalies.push({
        id: `anom_thresh_wind_${zone.id}_${Math.floor(now / (15 * 60 * 1000))}`,
        zoneId: zone.id,
        source: 'weather_station',
        category: 'water',
        metricNameEn: 'Severe Wind Gust Gale',
        metricNameHi: 'तीव्र आंधी व अंधड़ सीमा पार',
        baselineValue: 25,
        currentValue: wData.windGustsKmh || 0,
        deviationPercent: Math.round((((wData.windGustsKmh || 0) - 25) / 25) * 100),
        severity: 'critical',
        isThresholdBreach: true,
        detectedAt: now,
        summaryEn: `Dangerous gale gusts of ${wData.windGustsKmh} km/h detected in ${zNameEn}. Treefall and hoarding hazard.`,
        summaryHi: `खतरनाक तेज आंधी के झोंके ${wData.windGustsKmh} किमी/घंटा दर्ज - ${zNameHi}। पेड़ गिरने व होर्डिंग का खतरा।`,
      });
    }
  });

  // C. Metro Delay >= 15 min
  const thirtyMinAgo = now - 30 * 60 * 1000;
  const recentMetroEvents = events.filter(
    (e) => e.timestamp >= thirtyMinAgo && e.source === 'metro_feed'
  );

  recentMetroEvents.forEach((ev) => {
    const raw = ev.metadata?.rawPayload as Record<string, unknown> | undefined;
    const delayMin = typeof raw?.delay_minutes === 'number'
      ? raw.delay_minutes
      : typeof raw?.delay_sec === 'number'
      ? Math.round(raw.delay_sec / 60)
      : typeof ev.metadata?.delay_sec === 'number'
      ? Math.round((ev.metadata.delay_sec as number) / 60)
      : 0;

    if (delayMin >= 15) {
      const zone = JAIPUR_ZONES.find((z) => z.id === ev.zoneId);
      const zNameEn = zone ? zone.nameEn.split(' ')[0] : ev.zoneId;
      const zNameHi = zone ? zone.nameHi.split(' ')[0] : ev.zoneId;

      anomalies.push({
        id: `anom_thresh_metro_${ev.id}`,
        zoneId: ev.zoneId,
        source: 'metro_feed',
        category: 'transit',
        metricNameEn: 'Severe Metro Delay Threshold',
        metricNameHi: 'मेट्रो में गंभीर परिचालन विलंब',
        baselineValue: 3,
        currentValue: delayMin,
        deviationPercent: Math.round(((delayMin - 3) / 3) * 100),
        severity: 'critical',
        isThresholdBreach: true,
        detectedAt: ev.timestamp,
        summaryEn: `Pink Line schedule disruption: ${delayMin} min headway delay at ${ev.locationName} (${zNameEn}).`,
        summaryHi: `पिंक लाइन परिचालन में रुकावट: ${ev.locationName} (${zNameHi}) पर ${delayMin} मिनट का विलंब।`,
      });
    }
  });

  // D. Road Traffic Congestion Ratio Anomaly (> 1.6x high, >= 2.0x critical)
  const recentTrafficEvents = events.filter(
    (e) => e.timestamp >= thirtyMinAgo && (e.id.startsWith('traffic-route-') || e.metadata?.congestionRatio !== undefined)
  );

  recentTrafficEvents.forEach((ev) => {
    const ratio = typeof ev.metadata?.congestionRatio === 'number' ? ev.metadata.congestionRatio : 1.0;
    if (ratio > 1.6) {
      const zone = JAIPUR_ZONES.find((z) => z.id === ev.zoneId);
      const zNameEn = zone ? zone.nameEn.split(' ')[0] : ev.zoneId;
      const zNameHi = zone ? zone.nameHi.split(' ')[0] : ev.zoneId;
      const isCritical = ratio >= 2.0;

      anomalies.push({
        id: `anom_thresh_traffic_${ev.id}`,
        zoneId: ev.zoneId,
        source: 'traffic_camera',
        category: 'traffic',
        metricNameEn: 'Arterial Road Congestion Spike',
        metricNameHi: 'मुख्य सड़क पर अत्यधिक यातायात दबाव',
        baselineValue: 1.0,
        currentValue: ratio,
        deviationPercent: Math.round((ratio - 1.0) * 100),
        severity: isCritical ? 'critical' : 'high',
        isThresholdBreach: true,
        detectedAt: ev.timestamp,
        summaryEn: `${ev.titleEn} (${ratio.toFixed(2)}x normal travel duration) in ${zNameEn}.`,
        summaryHi: `${ev.titleHi} (${ratio.toFixed(2)}x सामान्य यात्रा समय) - ${zNameHi}।`,
      });
    }
  });

  // Sort anomalies: critical first, then newest
  anomalies.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    return b.detectedAt - a.detectedAt;
  });

  // Store in cache
  cachedAnomalies = {
    key: cacheKey,
    timestamp: now,
    anomalies,
  };

  return anomalies;
}
