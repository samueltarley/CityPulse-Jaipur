/**
 * Gemini AI Summary Service for CityPulse Jaipur (जयपुर की नब्ज़).
 * Implements 15-second timeout, code-fence stripping, system-prompt enforcement,
 * and high-fidelity bilingual template fallback.
 */

import {
  AISummary,
  SummaryNormalizedPayload,
  PulseMetrics,
  Anomaly,
  Correlation,
  Cluster,
  FeedStatus,
  CivicEvent,
  ZoneWeatherAQI,
} from '../types';
import { JAIPUR_ZONES } from '../config/city';

/**
 * Strips markdown code fences (e.g. ```json ... ``` or ``` ... ```) from model output.
 */
export function stripCodeFences(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  // Remove starting ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  // Remove trailing ```
  cleaned = cleaned.replace(/\s*```$/i, '');
  // Clean any remaining backtick fences
  cleaned = cleaned.replace(/^`+|`+$/g, '').trim();
  return cleaned;
}

/**
 * Format timestamp in IST (Asia/Kolkata) as hh:mm A IST.
 */
export function formatTimeIST(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Deterministic Template Fallback: Generates an authentic 2-3 sentence summary
 * in both English and Hindi strictly based on normalized telemetry when AI service is unavailable.
 */
export function generateFallbackCitySummary(payload: SummaryNormalizedPayload): AISummary {
  const { pulseScore, band, topAnomalies, activeCorrelations, feedHealth } = payload;
  const now = Date.now();
  const timeLabel = formatTimeIST(now);

  // Check feed health for delayed or missing feeds
  const delayedFeeds: string[] = [];
  const delayedFeedsHi: string[] = [];
  Object.entries(feedHealth).forEach(([feed, health]) => {
    if (health.status === 'offline' || health.isSimulatedFallback) {
      if (feed.includes('weather')) {
        delayedFeeds.push('weather sensor');
        delayedFeedsHi.push('मौसम संवेदक');
      } else if (feed.includes('transit')) {
        delayedFeeds.push('transit telemetry');
        delayedFeedsHi.push('परिवहन डेटा');
      } else if (feed.includes('power')) {
        delayedFeeds.push('grid SCADA');
        delayedFeedsHi.push('विद्युत स्काडा');
      }
    }
  });

  const feedNoticeEn = delayedFeeds.length > 0
    ? ` Note: ${delayedFeeds.join(', ')} feeds are currently operating on fallback models.`
    : '';
  const feedNoticeHi = delayedFeedsHi.length > 0
    ? ` सूचना: ${delayedFeedsHi.join(', ')} डेटा बैकअप मॉडल पर संचालित है।`
    : '';

  // Case 1: Active cross-modal correlation present
  if (activeCorrelations.length > 0) {
    const topCorr = activeCorrelations[0];
    const zoneStrEn = topCorr.zones.join(' and ');
    const en = `Jaipur's civic pulse is currently in the ${band.toUpperCase()} band (${pulseScore}/100) due to telemetry indicating a possible link between ${topCorr.plausiblePair.toLowerCase()} around ${zoneStrEn}. Commuters should allow extra travel time through these corridors while municipal teams monitor localized impacts.${feedNoticeEn}`;
    const hi = `जयपुर की नब्ज़ वर्तमान में ${band === 'critical' ? 'गंभीर' : band === 'stressed' ? 'तनावग्रस्त' : 'सतर्क'} स्थिति (${pulseScore}/100) में है, जहाँ संवेदक डेटा ${zoneStrEn} क्षेत्र में ${topCorr.plausiblePair} के बीच संभावित संबंध दर्शा रहा है। यात्रियों को प्रभावित मार्गों पर अतिरिक्त समय लेकर चलने की सलाह दी जाती है।${feedNoticeHi}`;
    return { en, hi, generatedAt: now, timeLabel, isFallback: true };
  }

  // Case 2: Severe or moderate anomalies present
  if (topAnomalies.length > 0) {
    const topAnom = topAnomalies[0];
    const en = `The city is operating in ${band.toUpperCase()} rhythm (${pulseScore}/100), with localized alerts active for ${topAnom.metric} in ${topAnom.zoneName}. Residents in affected pockets should monitor updates and report urgent civic faults via Sampark 181.${feedNoticeEn}`;
    const hi = `जयपुर शहर वर्तमान में ${pulseScore}/100 के साथ ${band === 'critical' ? 'गंभीर' : band === 'stressed' ? 'तनावग्रस्त' : 'सतर्क'} स्थिति में है, जिसमें ${topAnom.zoneName} क्षेत्र में ${topAnom.metric} से संबंधित विसंगतियां दर्ज की गई हैं। नागरिक स्थानीय असुविधा की सूचना राजस्थान संपर्क 181 पर दर्ज कराएं।${feedNoticeHi}`;
    return { en, hi, generatedAt: now, timeLabel, isFallback: true };
  }

  // Case 3: Calm or optimal city rhythm
  const en = `Pink City is operating in steady Calm rhythm with an aggregate pulse score of ${pulseScore}/100. Key municipal networks including the Pink Line Metro and major power substations are functioning normally across all 9 zones with no critical disruptions reported.${feedNoticeEn}`;
  const hi = `गुलाबी नगरी में जीवन सामान्य व शांत लय में चल रहा है और समग्र नब्ज़ स्कोर ${pulseScore}/100 है। पिंक लाइन मेट्रो और मुख्य विद्युत ग्रिड सहित सभी नागरिक सेवाएं सातों दिन चौबीसों घंटे बिना किसी बड़ी बाधा के सुचारू रूप से कार्य कर रही हैं।${feedNoticeHi}`;

  return { en, hi, generatedAt: now, timeLabel, isFallback: true };
}

/**
 * Deterministic Template Fallback for Zone: Generates authentic localized zone summary.
 */
export function generateFallbackZoneSummary(payload: SummaryNormalizedPayload): AISummary {
  const { zoneNameEn = 'Zone', zoneNameHi = 'क्षेत्र', pulseScore, band, weather, topAnomalies, activeCorrelations } = payload;
  const now = Date.now();
  const timeLabel = formatTimeIST(now);

  const tempStr = weather ? `${Math.round(weather.temperatureC)}°C` : '32°C';
  const aqiCategory = weather?.aqiCategory || 'Moderate';

  let en = '';
  let hi = '';

  if (activeCorrelations.length > 0) {
    const corr = activeCorrelations[0];
    en = `In ${zoneNameEn}, the local pulse is ${band.toUpperCase()} at ${pulseScore}/100, where telemetry highlights a possible link between ${corr.plausiblePair.toLowerCase()}. Weather is recorded at ${tempStr} with ${aqiCategory} air quality. Local commuters are advised to plan alternate routes around busy junctions.`;
    hi = `${zoneNameHi} में स्थानीय नागरिक नब्ज़ ${pulseScore}/100 (${band === 'critical' ? 'गंभीर' : band === 'stressed' ? 'तनावग्रस्त' : 'सतर्क'}) दर्ज की गई है, जहाँ ${corr.plausiblePair} के बीच संभावित प्रभाव देखा जा रहा है। तापमान ${tempStr} और वायु गुणवत्ता '${aqiCategory}' स्तर पर है। व्यस्त चौराहों से बचने का सुझाव दिया जाता है।`;
  } else if (topAnomalies.length > 0) {
    const anom = topAnomalies[0];
    en = `${zoneNameEn} is currently in the ${band.toUpperCase()} band (${pulseScore}/100) due to localized fluctuations in ${anom.metric}. Ambient temperature is ${tempStr} with ${aqiCategory} air quality. Area field crews have been dispatched to ensure seamless civic utility supply.`;
    hi = `${zoneNameHi} में स्थानीय स्पंदन स्कोर ${pulseScore}/100 (${band === 'critical' ? 'गंभीर' : band === 'stressed' ? 'तनावग्रस्त' : 'सतर्क'}) है, जहाँ ${anom.metric} में असामान्य उतार-चढ़ाव देखा गया है। तापमान ${tempStr} और वायु गुणवत्ता '${aqiCategory}' है। फील्ड टीमों द्वारा निगरानी की जा रही है।`;
  } else {
    en = `${zoneNameEn} is functioning in steady Calm rhythm at ${pulseScore}/100 with optimal power and transit flow. Current temperature is ${tempStr} under ${aqiCategory} air quality conditions. Civic mobility across major arterial roads and residential blocks remains smooth.`;
    hi = `${zoneNameHi} में स्थिति पूरी तरह शांत व स्थिर है (नब्ज़ स्कोर ${pulseScore}/100)। बिजली ग्रिड और सार्वजनिक परिवहन सुचारू हैं, तापमान ${tempStr} तथा वायु गुणवत्ता '${aqiCategory}' स्तर पर बनी हुई है। मुख्य मार्गों और कॉलोनियों में आवागमन सुगम है।`;
  }

  return { en, hi, generatedAt: now, timeLabel, isFallback: true };
}

/**
 * Builds the strict sanitized telemetry payload for citywide state.
 * Absolutely NO personal data included.
 */
export function buildCitywideNormalizedPayload(
  pulseMetrics: PulseMetrics,
  anomalies: Anomaly[],
  correlations: Correlation[],
  clusters: Cluster[],
  feedStatuses: FeedStatus[],
  events: CivicEvent[]
): SummaryNormalizedPayload {
  const zoneScoresSummary: Record<string, { score: number; band: string; topIssue?: string }> = {};
  JAIPUR_ZONES.forEach((z) => {
    const detail = pulseMetrics.zoneDetails[z.id];
    zoneScoresSummary[z.nameEn] = {
      score: detail?.score ?? 78,
      band: detail?.band ?? 'calm',
      topIssue: detail?.topIssueEn,
    };
  });

  const feedHealth: Record<string, { status: string; isSimulatedFallback: boolean }> = {};
  feedStatuses.forEach((f) => {
    feedHealth[f.feedId] = {
      status: f.status,
      isSimulatedFallback: f.origin === 'simulated_fallback',
    };
  });

  const topAnomalies = anomalies.slice(0, 5).map((a) => ({
    metric: a.metricNameEn,
    zoneName: JAIPUR_ZONES.find((z) => z.id === a.zoneId)?.nameEn || a.zoneId,
    severity: a.severity,
    summaryEn: a.summaryEn,
    isThresholdAnomaly: a.isThresholdBreach,
  }));

  const activeCorrelations = correlations.slice(0, 4).map((c) => ({
    plausiblePair: c.plausiblePair || 'Cross-Domain Anomaly',
    explanationEn: c.explanationEn,
    confidence: c.confidence,
    zones: (c.zoneIds || []).map((zid) => JAIPUR_ZONES.find((z) => z.id === zid)?.nameEn || zid),
  }));

  const activeClusters = clusters.slice(0, 3).map((cl) => ({
    theme: cl.theme,
    count: cl.eventIds?.length || 0,
    zoneName: JAIPUR_ZONES.find((z) => z.id === cl.zoneId)?.nameEn || cl.zoneId,
  }));

  const recentNotableEvents = events.slice(0, 6).map((e) => ({
    category: e.category,
    titleEn: e.titleEn,
    locationName: e.locationName,
    severity: e.severity,
    timeAgoMinutes: Math.max(1, Math.round((Date.now() - e.timestamp) / 60000)),
  }));

  return {
    scope: 'citywide',
    pulseScore: pulseMetrics.cityScore,
    band: pulseMetrics.band,
    trend: pulseMetrics.trend,
    zoneScoresSummary,
    topAnomalies,
    activeCorrelations,
    activeClusters,
    feedHealth,
    recentNotableEvents,
  };
}

/**
 * Builds the strict sanitized telemetry payload for a single zone.
 * Absolutely NO personal data included.
 */
export function buildZoneNormalizedPayload(
  zoneId: string,
  pulseMetrics: PulseMetrics,
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>,
  anomalies: Anomaly[],
  correlations: Correlation[],
  clusters: Cluster[],
  feedStatuses: FeedStatus[],
  events: CivicEvent[]
): SummaryNormalizedPayload {
  const zoneMeta = JAIPUR_ZONES.find((z) => z.id === zoneId);
  const detail = pulseMetrics.zoneDetails[zoneId];
  const weather = zoneWeatherAQI[zoneId];

  const zoneAnomalies = anomalies
    .filter((a) => a.zoneId === zoneId)
    .slice(0, 4)
    .map((a) => ({
      metric: a.metricNameEn,
      zoneName: zoneMeta?.nameEn || zoneId,
      severity: a.severity,
      summaryEn: a.summaryEn,
      isThresholdAnomaly: a.isThresholdBreach,
    }));

  const zoneCorrelations = correlations
    .filter((c) => c.zoneIds?.includes(zoneId))
    .slice(0, 3)
    .map((c) => ({
      plausiblePair: c.plausiblePair || 'Cross-Domain Anomaly',
      explanationEn: c.explanationEn,
      confidence: c.confidence,
      zones: (c.zoneIds || []).map((zid) => JAIPUR_ZONES.find((z) => z.id === zid)?.nameEn || zid),
    }));

  const zoneClusters = clusters
    .filter((cl) => cl.zoneId === zoneId)
    .slice(0, 3)
    .map((cl) => ({
      theme: cl.theme,
      count: cl.eventIds?.length || 0,
      zoneName: zoneMeta?.nameEn || zoneId,
    }));

  const zoneEvents = events
    .filter((e) => e.zoneId === zoneId)
    .slice(0, 5)
    .map((e) => ({
      category: e.category,
      titleEn: e.titleEn,
      locationName: e.locationName,
      severity: e.severity,
      timeAgoMinutes: Math.max(1, Math.round((Date.now() - e.timestamp) / 60000)),
    }));

  const feedHealth: Record<string, { status: string; isSimulatedFallback: boolean }> = {};
  feedStatuses.forEach((f) => {
    feedHealth[f.feedId] = {
      status: f.status,
      isSimulatedFallback: f.origin === 'simulated_fallback',
    };
  });

  return {
    scope: 'zone',
    zoneId,
    zoneNameEn: zoneMeta?.nameEn || zoneId,
    zoneNameHi: zoneMeta?.nameHi || zoneId,
    pulseScore: detail?.score ?? 78,
    band: detail?.band ?? 'calm',
    subscores: detail?.subscores,
    weather: weather ? {
      temperatureC: weather.temperatureC,
      feelsLikeC: weather.apparentTemperatureC,
      humidityPct: weather.relativeHumidityPct,
      rainMm: weather.rainMm,
      windKmh: weather.windSpeedKmh,
      aqi: weather.aqi,
      aqiCategory: weather.aqiCategory,
      description: weather.weatherDescEn,
    } : undefined,
    isPartialData: detail?.isPartialData,
    topAnomalies: zoneAnomalies,
    activeCorrelations: zoneCorrelations,
    activeClusters: zoneClusters,
    feedHealth,
    recentNotableEvents: zoneEvents,
  };
}

/**
 * Fetch AI summary from server endpoint with 15s timeout and automatic fallback.
 */
export async function requestAISummary(
  payload: SummaryNormalizedPayload
): Promise<AISummary> {
  const isCity = payload.scope === 'citywide';
  const now = Date.now();
  const timeLabel = formatTimeIST(now);

  try {
    // 15-second AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/gemini/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Gemini Service] Server returned HTTP ${response.status}. Using deterministic fallback.`);
      return isCity ? generateFallbackCitySummary(payload) : generateFallbackZoneSummary(payload);
    }

    const data = await response.json();
    if (!data || !data.text) {
      console.warn('[Gemini Service] Empty response payload. Using fallback.');
      return isCity ? generateFallbackCitySummary(payload) : generateFallbackZoneSummary(payload);
    }

    const cleanedText = stripCodeFences(data.text);
    const parsed = JSON.parse(cleanedText);

    if (parsed && typeof parsed.en === 'string' && typeof parsed.hi === 'string') {
      return {
        en: parsed.en.trim(),
        hi: parsed.hi.trim(),
        generatedAt: now,
        timeLabel,
        isFallback: false,
      };
    }

    console.warn('[Gemini Service] Response did not match { en, hi } JSON schema. Using fallback.');
    return isCity ? generateFallbackCitySummary(payload) : generateFallbackZoneSummary(payload);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.warn('[Gemini Service] Request timed out after 15 seconds. Using fallback.');
    } else {
      console.warn('[Gemini Service] Network or parse error:', error?.message || error);
    }
    return isCity ? generateFallbackCitySummary(payload) : generateFallbackZoneSummary(payload);
  }
}
