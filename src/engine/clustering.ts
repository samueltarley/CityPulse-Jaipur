/**
 * CityPulse Jaipur – Spatial Grievance Clustering Engine
 *
 * Requirements:
 * 1. 3+ same-category complaints within 500 meters within 60 minutes -> Cluster.
 * 2. Computes centroid coordinates, effective radius (min 200m for visual map rendering),
 *    and intensity index (0 - 100).
 * 3. Memoized calculation to avoid recomputation overhead.
 */

import { haversineDistanceKm, findNearestZone } from './geoUtils';
import { CivicEvent, Cluster, Coordinates, EventCategory } from '../types';

interface ClusterCache {
  key: string;
  timestamp: number;
  clusters: Cluster[];
}

let cachedClusters: ClusterCache | null = null;

const CATEGORY_THEMES: Record<EventCategory, { en: string; hi: string }> = {
  sanitation: {
    en: 'Garbage accumulation & uncollected waste hotspot',
    hi: 'कचरा जमाव व अनउठाया अपशिष्ट संकेंद्रण',
  },
  water: {
    en: 'Water pipeline burst or localized waterlogging pocket',
    hi: 'पेयजल पाइपलाइन रिसाव अथवा जलभराव केंद्र',
  },
  traffic: {
    en: 'Localized carriage-way choke & vehicular bottleneck',
    hi: 'सड़क मार्ग अवरोध व स्थानीय यातायात जाम केंद्र',
  },
  power: {
    en: 'Streetlight outage & LT distribution line faults',
    hi: 'स्ट्रीट लाइट बंद व एलटी लाइन फॉल्ट संकेंद्रण',
  },
  transit: {
    en: 'Feeder transit delay & passenger boarding overflow',
    hi: 'फीडर बस विलंब व यात्री ठहराव संकेंद्रण',
  },
  crowd: {
    en: 'Bazaar footfall surge & pedestrian overflow',
    hi: 'बाज़ार पैदल आवागमन व भीड़ संकेंद्रण',
  },
  air_quality: {
    en: 'Localized dust plume & emissions anomaly',
    hi: 'धूल व उत्सर्जन का स्थानीय प्रभाव क्षेत्र',
  },
};

/**
 * Main clustering algorithm
 * Identifies groups of >= 3 same-category complaints within 500m occurring within the last 60 minutes.
 */
export function detectGrievanceClusters(events: CivicEvent[], referenceTimestamp?: number): Cluster[] {
  const now = referenceTimestamp || Date.now();
  const cacheKey = `${events.length}_${Math.floor(now / 15000)}`;

  if (cachedClusters && cachedClusters.key === cacheKey) {
    return cachedClusters.clusters;
  }

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const recentGrievances = events.filter(
    (e) =>
      e.timestamp >= now - ONE_HOUR_MS &&
      (e.source === 'resident_report' || e.category === 'sanitation' || e.category === 'water' || e.category === 'traffic')
  );

  // Group by category
  const categoryGroups = new Map<EventCategory, CivicEvent[]>();
  recentGrievances.forEach((g) => {
    const list = categoryGroups.get(g.category) || [];
    list.push(g);
    categoryGroups.set(g.category, list);
  });

  const clusters: Cluster[] = [];
  const CLUSTER_DISTANCE_KM = 0.5; // 500 meters

  categoryGroups.forEach((items, category) => {
    const visited = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const root = items[i];
      if (visited.has(root.id)) continue;

      // Find all complaints within 500 meters of root
      const group: CivicEvent[] = [root];
      visited.add(root.id);

      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const candidate = items[j];
        if (visited.has(candidate.id)) continue;

        const distKm = haversineDistanceKm(root.coordinates, candidate.coordinates);
        if (distKm <= CLUSTER_DISTANCE_KM) {
          group.push(candidate);
          visited.add(candidate.id);
        }
      }

      // Rule: 3+ complaints required to form a cluster
      if (group.length >= 3) {
        // Calculate centroid
        const avgLat = group.reduce((sum, item) => sum + item.coordinates.lat, 0) / group.length;
        const avgLng = group.reduce((sum, item) => sum + item.coordinates.lng, 0) / group.length;
        const centroid: Coordinates = { lat: avgLat, lng: avgLng };

        // Calculate maximum distance from centroid to enclose all points
        let maxDistKm = 0;
        group.forEach((item) => {
          const d = haversineDistanceKm(centroid, item.coordinates);
          if (d > maxDistKm) maxDistKm = d;
        });

        // Convert to meters, minimum 200m for clear map visibility
        const radiusMeters = Math.max(Math.round(maxDistKm * 1000), 250);

        // Compute intensity (0 - 100) based on count and severity
        let intensityPoints = group.length * 18;
        group.forEach((item) => {
          if (item.severity === 'critical') intensityPoints += 25;
          else if (item.severity === 'high') intensityPoints += 15;
        });
        const intensity = Math.min(100, Math.max(30, intensityPoints));

        // Resolve nearest zone
        const nearestZone = findNearestZone(centroid);
        const themeInfo = CATEGORY_THEMES[category] || {
          en: `${category} cluster incident`,
          hi: `${category} संकेंद्रण`,
        };

        clusters.push({
          id: `cluster_${category}_${nearestZone.id}_${Math.floor(now / 60000)}_${i}`,
          zoneId: nearestZone.id,
          eventIds: group.map((g) => g.id),
          centroid,
          radiusMeters,
          theme: themeInfo.en,
          intensity,
          dominantCategory: category,
          updatedAt: now,
        });
      }
    }
  });

  // Sort by intensity descending
  clusters.sort((a, b) => b.intensity - a.intensity);

  cachedClusters = {
    key: cacheKey,
    timestamp: now,
    clusters,
  };

  return clusters;
}

/**
 * Backward-compatible alias for grievance cluster detection.
 */
export const detectClusters = detectGrievanceClusters;

