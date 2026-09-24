/**
 * Road Traffic Adapter for Google Maps Routes API (computeRoutes).
 * Normalizes corridor traffic congestion telemetry into CityPulse CivicEvents.
 * 
 * Congestion ratio = duration / staticDuration
 * Severity rules:
 *   < 1.2  → low
 *   1.2–1.6 → medium
 *   > 1.6  → high (>= 2.2 → critical)
 */

import { CivicEvent, EventSeverity, EventOrigin } from '../../types';
import { TrafficCorridor, JAIPUR_TRAFFIC_CORRIDORS } from '../../config/city';

export interface RawCorridorTrafficPayload {
  corridorId: string;
  durationSeconds: number;
  staticDurationSeconds: number;
  distanceMeters: number;
  congestionRatio: number;
  origin: EventOrigin;
  timestampMs?: number;
}

export function normalizeRoadTrafficEvent(raw: RawCorridorTrafficPayload): CivicEvent {
  const corridor: TrafficCorridor =
    JAIPUR_TRAFFIC_CORRIDORS.find((c) => c.id === raw.corridorId) || JAIPUR_TRAFFIC_CORRIDORS[0];

  const timestampMs = raw.timestampMs || Date.now();
  const ratio = raw.congestionRatio;

  // Determine severity based on spec thresholds
  let severity: EventSeverity = 'low';
  if (ratio >= 2.2) {
    severity = 'critical';
  } else if (ratio > 1.6) {
    severity = 'high';
  } else if (ratio >= 1.2) {
    severity = 'medium';
  }

  const durationMin = Math.round(raw.durationSeconds / 60);
  const staticDurationMin = Math.round(raw.staticDurationSeconds / 60);
  const delayMin = Math.max(0, durationMin - staticDurationMin);
  const distanceKm = (raw.distanceMeters / 1000).toFixed(1);

  const titleEn = `${corridor.nameEn}: ${ratio.toFixed(2)}x Congestion (${durationMin} min${delayMin > 0 ? `, +${delayMin}m delay` : ''})`;
  const titleHi = `${corridor.nameHi}: ${ratio.toFixed(2)}x यातायात दबाव (${durationMin} मिनट${delayMin > 0 ? `, +${delayMin} मिनट विलंब` : ''})`;

  const descriptionEn = `Google Routes API traffic telemetry indicates ${distanceKm} km transit time is ${durationMin} mins vs normal ${staticDurationMin} mins (${ratio.toFixed(2)}x baseline ratio). Speed impacted across ${corridor.mappedZoneIds.join(', ')}.`;
  const descriptionHi = `गूगल रूट्स एपीआई यातायात विश्लेषण: ${distanceKm} किमी की दूरी सामान्य ${staticDurationMin} मिनट के मुकाबले ${durationMin} मिनट में तय हो रही है (${ratio.toFixed(2)}x विलंब)। प्रभावित क्षेत्र: ${corridor.mappedZoneIds.join(', ')}।`;

  // Center coordinate of corridor for mapping
  const centerCoords = {
    lat: (corridor.origin.lat + corridor.destination.lat) / 2,
    lng: (corridor.origin.lng + corridor.destination.lng) / 2,
  };

  return {
    id: `traffic-route-${corridor.id}-${timestampMs}`,
    timestamp: timestampMs,
    timestampIST: new Date(timestampMs).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    }) + ' IST',
    zoneId: corridor.mappedZoneIds[0] || 'cscheme-civillines',
    category: 'traffic',
    severity,
    titleEn,
    titleHi,
    descriptionEn,
    descriptionHi,
    locationName: `${corridor.nameEn} Arterial Corridor`,
    coordinates: centerCoords,
    source: 'traffic_camera',
    status: 'active',
    affectedRadiusMeters: 600,
    metadata: {
      origin: raw.origin,
      corridorId: corridor.id,
      congestionRatio: ratio,
      durationSeconds: raw.durationSeconds,
      staticDurationSeconds: raw.staticDurationSeconds,
      distanceMeters: raw.distanceMeters,
      delayMinutes: delayMin,
      mappedZoneIds: corridor.mappedZoneIds,
      rawPayload: raw,
    },
  };
}
