/**
 * Transit Adapter.
 * Normalizes JMRC Pink Line metro and JCTSL bus transit telemetry.
 * Raw timestamp format: Unix SECONDS.
 */

import { CivicEvent, EventSeverity, Coordinates } from '../../types';
import { JAIPUR_METRO_STATIONS, JAIPUR_BUS_CORRIDORS } from '../../config/city';
import { findNearestZone } from '../geoUtils';

export interface RawMetroPayload {
  system: 'jmrc_pink_line';
  station_code: string;
  station_name: string;
  line: 'pink';
  crowd_density_pct: number;
  train_headway_sec: number;
  delay_sec: number;
  gate_entries_per_min: number;
  timestamp_sec: number; // Unix SECONDS
}

export interface RawBusPayload {
  system: 'jctsl_bus';
  route_code: string;
  bus_id: string;
  corridor_name: string;
  current_gps: [number, number]; // [lat, lng]
  passenger_load_pct: number;
  speed_kmh: number;
  congestion_level: 'normal' | 'moderate' | 'heavy' | 'standstill';
  timestamp_sec: number; // Unix SECONDS
}

export type RawTransitPayload = RawMetroPayload | RawBusPayload;

export function normalizeTransitEvent(raw: RawTransitPayload): CivicEvent {
  // Convert unix seconds to milliseconds
  const timestampMs = raw.timestamp_sec * 1000;

  if (raw.system === 'jmrc_pink_line') {
    const station = JAIPUR_METRO_STATIONS.find((s) => s.id === raw.station_code) || JAIPUR_METRO_STATIONS[0];
    const delayMin = Math.round(raw.delay_sec / 60);

    // Severity rules
    let severity: EventSeverity = 'low';
    if (raw.crowd_density_pct >= 95 || delayMin >= 15) {
      severity = 'critical';
    } else if (raw.crowd_density_pct >= 85 || delayMin >= 8) {
      severity = 'high';
    } else if (raw.crowd_density_pct >= 70 || delayMin >= 4) {
      severity = 'medium';
    }

    const titleEn = `JMRC Pink Line: ${station.nameEn} (${raw.crowd_density_pct}% Capacity${delayMin > 0 ? `, +${delayMin}m delay` : ''})`;
    const titleHi = `जयपुर मेट्रो पिंक लाइन: ${station.nameHi} (${raw.crowd_density_pct}% यात्री भार${delayMin > 0 ? `, ${delayMin} मिनट विलंब` : ''})`;

    const descriptionEn = `Station platform density reached ${raw.crowd_density_pct}% with ${raw.gate_entries_per_min} AFC entries/min. Train headway: ${Math.round(raw.train_headway_sec / 60)} min.`;
    const descriptionHi = `प्लेटफ़ॉर्म यात्री घनत्व ${raw.crowd_density_pct}% दर्ज हुआ (${raw.gate_entries_per_min} यात्री प्रवेश/मिनट)। ट्रेनों का अंतराल ${Math.round(raw.train_headway_sec / 60)} मिनट।`;

    return {
      id: `transit-metro-${station.id}-${raw.timestamp_sec}`,
      timestamp: timestampMs,
      zoneId: station.zoneId,
      category: 'transit',
      severity,
      titleEn,
      titleHi,
      descriptionEn,
      descriptionHi,
      locationName: `${station.nameEn} Metro Station`,
      coordinates: station.coordinates,
      source: 'metro_feed',
      status: 'active',
      affectedRadiusMeters: 400,
      metadata: {
        origin: 'simulated',
        rawPayload: raw,
        crowd_density_pct: raw.crowd_density_pct,
        delay_sec: raw.delay_sec,
        station_id: station.id,
      },
    };
  } else {
    // JCTSL Bus payload
    const coords: Coordinates = { lat: raw.current_gps[0], lng: raw.current_gps[1] };
    const nearestZone = findNearestZone(coords);

    let severity: EventSeverity = 'low';
    if (raw.congestion_level === 'standstill' || raw.speed_kmh <= 4) {
      severity = 'high';
    } else if (raw.congestion_level === 'heavy' || raw.passenger_load_pct >= 90) {
      severity = 'medium';
    }

    const titleEn = `JCTSL ${raw.route_code}: ${raw.corridor_name} (${raw.congestion_level.toUpperCase()}, ${raw.speed_kmh} km/h)`;
    const titleHi = `जेसीटीएसएल बस ${raw.route_code}: ${raw.corridor_name} (गति: ${raw.speed_kmh} किमी/घंटा)`;

    const descriptionEn = `Bus ${raw.bus_id} on ${raw.route_code} reporting ${raw.congestion_level} traffic crawl at ${raw.speed_kmh} km/h with ${raw.passenger_load_pct}% passenger capacity.`;
    const descriptionHi = `बस ${raw.bus_id} (${raw.route_code}) पर ${raw.speed_kmh} किमी/घंटा की धीमी गति दर्ज। यात्री क्षमता ${raw.passenger_load_pct}%।`;

    return {
      id: `transit-bus-${raw.bus_id}-${raw.timestamp_sec}`,
      timestamp: timestampMs,
      zoneId: nearestZone.id,
      category: 'transit',
      severity,
      titleEn,
      titleHi,
      descriptionEn,
      descriptionHi,
      locationName: `${raw.corridor_name} Corridor (${nearestZone.nameEn})`,
      coordinates: coords,
      source: 'traffic_camera',
      status: 'active',
      affectedRadiusMeters: 600,
      metadata: {
        origin: 'simulated',
        rawPayload: raw,
        speed_kmh: raw.speed_kmh,
        passenger_load_pct: raw.passenger_load_pct,
        bus_id: raw.bus_id,
        route_code: raw.route_code,
      },
    };
  }
}
