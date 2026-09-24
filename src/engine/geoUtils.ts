/**
 * Geographic and Spatial Utilities for Jaipur.
 * Haversine formula, nearest-zone resolver, and text-to-zone normalizer.
 */

import { Coordinates, Zone } from '../types';
import { JAIPUR_ZONES } from '../config/city';

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function haversineDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Finds the nearest Jaipur administrative zone to given GPS coordinates.
 */
export function findNearestZone(coords: Coordinates): Zone {
  let closestZone = JAIPUR_ZONES[0];
  let minDistance = Infinity;

  for (const zone of JAIPUR_ZONES) {
    const dist = haversineDistanceKm(coords, zone.center);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zone;
    }
  }

  return closestZone;
}

/**
 * Resolves free-text or colloquial zone name into canonical zoneId.
 */
export function resolveZoneFromText(text: string): Zone {
  if (!text) return JAIPUR_ZONES[0];
  const cleaned = text.toLowerCase().trim();

  // Keyword lookup table
  if (cleaned.includes('walled') || cleaned.includes('char diwari') || cleaned.includes('perkota') || cleaned.includes('chaupar') || cleaned.includes('hawa mahal') || cleaned.includes('johari') || cleaned.includes('tripolia') || cleaned.includes('chandpole') || cleaned.includes('badi chaupar')) {
    return JAIPUR_ZONES.find((z) => z.id === 'walled-city') || JAIPUR_ZONES[0];
  }
  if (cleaned.includes('mansarovar') || cleaned.includes('vt road') || cleaned.includes('shipra') || cleaned.includes('aatish') || cleaned.includes('city park')) {
    return JAIPUR_ZONES.find((z) => z.id === 'mansarovar') || JAIPUR_ZONES[1];
  }
  if (cleaned.includes('malviya') || cleaned.includes('wtp') || cleaned.includes('gaurav tower') || cleaned.includes('calgiri') || cleaned.includes('mnit')) {
    return JAIPUR_ZONES.find((z) => z.id === 'malviya-nagar') || JAIPUR_ZONES[2];
  }
  if (cleaned.includes('vaishali') || cleaned.includes('amrapali') || cleaned.includes('gandhi path') || cleaned.includes('queens road') || cleaned.includes('dcm')) {
    return JAIPUR_ZONES.find((z) => z.id === 'vaishali-nagar') || JAIPUR_ZONES[3];
  }
  if (cleaned.includes('raja park') || cleaned.includes('tilak nagar') || cleaned.includes('lbs') || cleaned.includes('birla mandir') || cleaned.includes('moti doongri')) {
    return JAIPUR_ZONES.find((z) => z.id === 'raja-park') || JAIPUR_ZONES[4];
  }
  if (cleaned.includes('sanganer') || cleaned.includes('airport') || cleaned.includes('tonk rd') || cleaned.includes('tonk road') || cleaned.includes('kagzi') || cleaned.includes('dravyavati')) {
    return JAIPUR_ZONES.find((z) => z.id === 'sanganer') || JAIPUR_ZONES[5];
  }
  if (cleaned.includes('amer') || cleaned.includes('amber') || cleaned.includes('nahargarh') || cleaned.includes('jaigarh') || cleaned.includes('maota') || cleaned.includes('jal mahal') || cleaned.includes('hathi gaon')) {
    return JAIPUR_ZONES.find((z) => z.id === 'amer') || JAIPUR_ZONES[6];
  }
  if (cleaned.includes('jagatpura') || cleaned.includes('bombay hospital') || cleaned.includes('mahal road') || cleaned.includes('skit')) {
    return JAIPUR_ZONES.find((z) => z.id === 'jagatpura') || JAIPUR_ZONES[7];
  }
  if (cleaned.includes('c-scheme') || cleaned.includes('cscheme') || cleaned.includes('civil lines') || cleaned.includes('statue circle') || cleaned.includes('secretariat') || cleaned.includes('central park') || cleaned.includes('ashok nagar') || cleaned.includes('sindhi camp') || cleaned.includes('railway station')) {
    return JAIPUR_ZONES.find((z) => z.id === 'cscheme-civillines') || JAIPUR_ZONES[8];
  }

  // Fallback to zone id match
  const directMatch = JAIPUR_ZONES.find((z) => z.id.toLowerCase() === cleaned || z.nameEn.toLowerCase() === cleaned);
  return directMatch || JAIPUR_ZONES[0];
}

/**
 * Parses "DD/MM/YYYY hh:mm A" string into Unix timestamp (milliseconds).
 * Example: "24/09/2026 02:45 PM"
 */
export function parseComplaintTimestamp(dateStr: string): number {
  try {
    const parts = dateStr.trim().split(' ');
    if (parts.length >= 3) {
      const [d, m, y] = parts[0].split('/').map(Number);
      const [time, modifier] = [parts[1], parts[2].toUpperCase()];
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      // In IST context, construct date
      const date = new Date(y, m - 1, d, hours, minutes, 0);
      if (!isNaN(date.getTime())) return date.getTime();
    }
  } catch (err) {
    console.warn('Failed to parse complaint timestamp:', dateStr, err);
  }
  return Date.now();
}

/**
 * Formats current or given date to "DD/MM/YYYY hh:mm A" (used by the raw complaint generator).
 */
export function formatComplaintTimestamp(date: Date = new Date()): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const h = String(hours).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${minutes} ${modifier}`;
}
