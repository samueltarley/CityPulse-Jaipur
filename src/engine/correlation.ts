/**
 * CityPulse Jaipur – Multi-Source Cross-Zone Correlation Engine
 *
 * Requirements:
 * 1. 2+ different sources anomalous in the same or adjacent zones within 30 min -> Correlation.
 * 2. Confidence: Low / Medium / High.
 * 3. Boosted confidence for known plausible pairs:
 *      - rain <-> waterlogging <-> transit
 *      - heat <-> power <-> water supply
 *      - dust storm <-> PM10 <-> transit
 *      - festival <-> transit <-> noise/garbage
 * 4. STRICT RULE: ALWAYS worded as "possible link", never a direct cause.
 *
 * Memoized and bilingual.
 */

import { JAIPUR_ZONES } from '../config/city';
import { Anomaly, CivicEvent, Correlation, ZoneWeatherAQI } from '../types';

interface CorrelationCache {
  key: string;
  timestamp: number;
  correlations: Correlation[];
}

let cachedCorrelations: CorrelationCache | null = null;

/**
 * Checks if two zones are either identical or share an administrative boundary.
 */
function areZonesAdjacentOrSame(zoneIdA: string, zoneIdB: string): boolean {
  const normA = zoneIdA.replace('_', '-');
  const normB = zoneIdB.replace('_', '-');
  if (normA === normB) return true;
  const zoneA = JAIPUR_ZONES.find((z) => z.id === normA);
  return zoneA ? zoneA.adjacentZoneIds.includes(normB) : false;
}

/**
 * Main correlation detection algorithm
 */
export function detectCorrelations(
  anomalies: Anomaly[],
  events: CivicEvent[],
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>,
  referenceTimestamp?: number
): Correlation[] {
  const now = referenceTimestamp || Date.now();
  const cacheKey = `${anomalies.length}_${events.length}_${Math.floor(now / 15000)}`;

  if (cachedCorrelations && cachedCorrelations.key === cacheKey) {
    return cachedCorrelations.correlations;
  }

  const correlations: Correlation[] = [];
  const THIRTY_MIN_MS = 30 * 60 * 1000;
  const recentAnomalies = anomalies.filter((a) => a.detectedAt >= now - THIRTY_MIN_MS);

  // Group anomalies by spatial clusters (same zone or adjacent zones)
  const evaluatedPairs = new Set<string>();

  // Check known plausible pairs first
  // 1. Rain <-> Waterlogging <-> Transit
  const rainAnoms = recentAnomalies.filter(
    (a) => a.metricNameEn.includes('Downpour') || a.metricNameEn.includes('Precipitation') || (zoneWeatherAQI[a.zoneId]?.rainMm || 0) > 3
  );
  const transitOrWaterAnoms = recentAnomalies.filter(
    (a) =>
      a.category === 'transit' ||
      a.category === 'traffic' ||
      a.metricNameEn.includes('Metro') ||
      a.metricNameEn.includes('Traffic')
  );

  rainAnoms.forEach((rAnom) => {
    transitOrWaterAnoms.forEach((tAnom) => {
      if (rAnom.source !== tAnom.source && areZonesAdjacentOrSame(rAnom.zoneId, tAnom.zoneId)) {
        const pairKey = `plausible_rain_${rAnom.zoneId}_${tAnom.zoneId}`;
        if (!evaluatedPairs.has(pairKey)) {
          evaluatedPairs.add(pairKey);

          const zoneA = JAIPUR_ZONES.find((z) => z.id === rAnom.zoneId)?.nameEn.split(' ')[0] || rAnom.zoneId;
          const zoneB = JAIPUR_ZONES.find((z) => z.id === tAnom.zoneId)?.nameEn.split(' ')[0] || tAnom.zoneId;
          const zoneNamesEn = rAnom.zoneId === tAnom.zoneId ? zoneA : `${zoneA} & ${zoneB}`;

          correlations.push({
            id: `corr_rain_transit_${rAnom.zoneId}_${Math.floor(now / 60000)}`,
            eventIds: [],
            zoneIds: Array.from(new Set([rAnom.zoneId, tAnom.zoneId])),
            confidence: 'high',
            confidenceScore: 0.92,
            type: 'rain_waterlogging_transit',
            plausiblePair: 'rain <-> waterlogging <-> transit',
            titleEn: 'Possible Link: Precipitation Surge & Surface Transit Crawl',
            titleHi: 'संभावित संबंध: वर्षा में वृद्धि व सतही यातायात में ठहराव',
            explanationEn: `Possible link observed between rainfall surge and public transit crawl in ${zoneNamesEn}. Inundated carriageways may be slowing feeder routes.`,
            explanationHi: `${zoneNamesEn} में वर्षा वृद्धि और सार्वजनिक परिवहन की धीमी गति के बीच संभावित संबंध देखा गया। जलभराव के कारण फीडर मार्गों की गति धीमी हो सकती है।`,
            detectedAt: now,
            recommendedActionEn: 'Deploy mobile dewatering pumps at low-lying underpasses; adjust JCTSL corridor headways.',
            recommendedActionHi: 'निचले अंडरपासों पर मोबाइल जल निकासी पंप तैनात करें; जेसीटीएसएल कॉरिडोर समय सारणी में समन्वय करें।',
          });
        }
      }
    });
  });

  // 2. Heat <-> Power <-> Water Supply
  const heatAnoms = recentAnomalies.filter(
    (a) => a.metricNameEn.includes('Heatwave') || (zoneWeatherAQI[a.zoneId]?.temperatureC || 0) >= 40
  );
  const powerAnoms = recentAnomalies.filter(
    (a) => a.category === 'power' || a.source === 'power_grid'
  );

  heatAnoms.forEach((hAnom) => {
    powerAnoms.forEach((pAnom) => {
      if (areZonesAdjacentOrSame(hAnom.zoneId, pAnom.zoneId)) {
        const pairKey = `plausible_heat_power_${hAnom.zoneId}_${pAnom.zoneId}`;
        if (!evaluatedPairs.has(pairKey)) {
          evaluatedPairs.add(pairKey);

          const zoneA = JAIPUR_ZONES.find((z) => z.id === hAnom.zoneId)?.nameEn.split(' ')[0] || hAnom.zoneId;
          const zoneB = JAIPUR_ZONES.find((z) => z.id === pAnom.zoneId)?.nameEn.split(' ')[0] || pAnom.zoneId;
          const zoneNamesEn = hAnom.zoneId === pAnom.zoneId ? zoneA : `${zoneA} & ${zoneB}`;

          correlations.push({
            id: `corr_heat_power_${hAnom.zoneId}_${Math.floor(now / 60000)}`,
            eventIds: [],
            zoneIds: Array.from(new Set([hAnom.zoneId, pAnom.zoneId])),
            confidence: 'high',
            confidenceScore: 0.88,
            type: 'heat_power_water',
            plausiblePair: 'heat <-> power <-> water supply',
            titleEn: 'Possible Link: High Thermal Load & Substation Feeder Stress',
            titleHi: 'संभावित संबंध: उच्च तापमान व सबस्टेशन फीडर लोड',
            explanationEn: `Possible link observed between ambient heat load and 33/11kV transformer stress in ${zoneNamesEn}, co-occurring with civic power alerts.`,
            explanationHi: `${zoneNamesEn} में भीषण गर्मी के दबाव और 33/11kV ट्रांसफॉर्मर ओवरलोड के बीच संभावित संबंध देखा गया।`,
            detectedAt: now,
            recommendedActionEn: 'Alert JVVNL load dispatchers to activate secondary backup feeders to protect municipal pumping.',
            recommendedActionHi: 'डिस्कॉम लोड डिस्पैचर्स को सचेत करें व पेयजल पम्पिंग के लिए बैकअप फीडर तैयार रखें।',
          });
        }
      }
    });
  });

  // 3. Dust Storm <-> PM10 <-> Transit
  const windAnoms = recentAnomalies.filter(
    (a) => a.metricNameEn.includes('Wind') || a.metricNameEn.includes('Gale') || (zoneWeatherAQI[a.zoneId]?.windGustsKmh || 0) >= 45
  );
  const aqiAnoms = recentAnomalies.filter((a) => a.category === 'air_quality');

  windAnoms.forEach((wAnom) => {
    aqiAnoms.forEach((aAnom) => {
      if (areZonesAdjacentOrSame(wAnom.zoneId, aAnom.zoneId)) {
        const pairKey = `plausible_dust_${wAnom.zoneId}_${aAnom.zoneId}`;
        if (!evaluatedPairs.has(pairKey)) {
          evaluatedPairs.add(pairKey);

          const zoneA = JAIPUR_ZONES.find((z) => z.id === wAnom.zoneId)?.nameEn.split(' ')[0] || wAnom.zoneId;

          correlations.push({
            id: `corr_dust_aqi_${wAnom.zoneId}_${Math.floor(now / 60000)}`,
            eventIds: [],
            zoneIds: Array.from(new Set([wAnom.zoneId, aAnom.zoneId])),
            confidence: 'high',
            confidenceScore: 0.85,
            type: 'dust_storm_pm10_transit',
            plausiblePair: 'dust storm <-> PM10 <-> transit',
            titleEn: 'Possible Link: Gale Winds & Elevated Airborne Particulates',
            titleHi: 'संभावित संबंध: तेज आंधी व निलंबित धूल कणों में उछाल',
            explanationEn: `Possible link observed between high wind velocity and sudden spike in PM10 particulates in ${zoneA}, potentially reducing road visibility.`,
            explanationHi: `${zoneA} में तेज हवा के वेग और PM10 धूल कणों में अचानक वृद्धि के बीच संभावित संबंध देखा गया।`,
            detectedAt: now,
            recommendedActionEn: 'Deploy mechanical road sweepers and water misting cannons along primary ring road corridors.',
            recommendedActionHi: 'मुख्य रिंग रोड गलियारों पर एंटी-स्मॉग गन और पानी के छिड़काव की गाड़ियां रवाना करें।',
          });
        }
      }
    });
  });

  // 4. Festival / Heritage <-> Transit <-> Grievances
  const walledCityAnoms = recentAnomalies.filter((a) => a.zoneId === 'walled-city' || a.zoneId === 'walled_city');
  if (walledCityAnoms.length >= 2) {
    const hasTransit = walledCityAnoms.some((a) => a.source === 'metro_feed' || a.category === 'transit');
    const hasComplaints = walledCityAnoms.some((a) => a.source === 'resident_report' || a.category === 'sanitation');

    if (hasTransit && hasComplaints && !evaluatedPairs.has('plausible_walled_city_crowd')) {
      evaluatedPairs.add('plausible_walled_city_crowd');
      correlations.push({
        id: `corr_festival_walled_city_${Math.floor(now / 60000)}`,
        eventIds: [],
        zoneIds: ['walled-city'],
        confidence: 'high',
        confidenceScore: 0.87,
        type: 'festival_transit_crowd',
        plausiblePair: 'festival <-> transit <-> noise/garbage',
        titleEn: 'Possible Link: Bazaars Congregation & Pink Line Station Loading',
        titleHi: 'संभावित संबंध: चारदीवारी बाज़ार भीड़ व पिंक लाइन स्टेशन भार',
        explanationEn: 'Possible link observed between dense bazaar footfalls and Pink Line ridership concentration around Badi Chaupar and Chandpole.',
        explanationHi: 'बड़ी चौपड़ और चांदपोल के आसपास घनी बाज़ार चहल-पहल और पिंक लाइन मेट्रो यात्रियों के दबाव में संभावित संबंध देखा गया।',
        detectedAt: now,
        recommendedActionEn: 'Coordinate Jaipur Traffic Police with JMRC station controllers to regulate e-rickshaw feeder choke points.',
        recommendedActionHi: 'ट्रैफिक पुलिस और जेएमआरसी स्टेशन नियंत्रकों के बीच समन्वय कर ई-रिक्शा जाम बिंदुओं को सुगम बनाएं।',
      });
    }
  }

  // 5. General Cross-Zone Multi-Source Anomalies
  for (let i = 0; i < recentAnomalies.length; i++) {
    for (let j = i + 1; j < recentAnomalies.length; j++) {
      const anomA = recentAnomalies[i];
      const anomB = recentAnomalies[j];

      // Must be different sources
      if (anomA.source !== anomB.source && areZonesAdjacentOrSame(anomA.zoneId, anomB.zoneId)) {
        const key = `gen_${anomA.id}_${anomB.id}`;
        if (!evaluatedPairs.has(key)) {
          evaluatedPairs.add(key);

          const zoneA = JAIPUR_ZONES.find((z) => z.id === anomA.zoneId)?.nameEn.split(' ')[0] || anomA.zoneId;
          const zoneB = JAIPUR_ZONES.find((z) => z.id === anomB.zoneId)?.nameEn.split(' ')[0] || anomB.zoneId;
          const location = anomA.zoneId === anomB.zoneId ? zoneA : `${zoneA} & ${zoneB}`;

          // Severity matching determines confidence
          const isCritical = anomA.severity === 'critical' || anomB.severity === 'critical';
          const confidence: 'low' | 'medium' | 'high' = isCritical ? 'medium' : 'low';
          const score = isCritical ? 0.68 : 0.45;

          correlations.push({
            id: `corr_gen_${anomA.zoneId}_${anomB.zoneId}_${i}_${j}`,
            eventIds: [],
            zoneIds: Array.from(new Set([anomA.zoneId, anomB.zoneId])),
            confidence,
            confidenceScore: score,
            type: 'cross_source_cooccurrence',
            titleEn: `Possible Link: Co-occurring Municipal Stress in ${location}`,
            titleHi: `संभावित संबंध: ${location} में एकसाथ नगरपालिका दबाव`,
            explanationEn: `Possible link observed between ${anomA.metricNameEn} and ${anomB.metricNameEn} in ${location}.`,
            explanationHi: `${location} में ${anomA.metricNameHi} और ${anomB.metricNameHi} के बीच संभावित संबंध देखा गया।`,
            detectedAt: Math.max(anomA.detectedAt, anomB.detectedAt),
            recommendedActionEn: 'Cross-departmental monitoring suggested between Nagar Nigam and respective line utility.',
            recommendedActionHi: 'नगर निगम और संबंधित विभाग के मध्य संयुक्त निगरानी का सुझाव दिया गया है।',
          });
        }
      }
    }
  }

  // Deduplicate and prioritize high confidence
  correlations.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const finalCorrelations = correlations.slice(0, 8); // Top 8 correlations

  cachedCorrelations = {
    key: cacheKey,
    timestamp: now,
    correlations: finalCorrelations,
  };

  return finalCorrelations;
}
