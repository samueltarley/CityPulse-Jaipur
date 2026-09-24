/**
 * Fallback Simulated Traffic Generator for Google Routes API.
 * Activated when the Google Routes API fails, network times out, or when simulated failure is toggled.
 * Marked with origin: 'simulated_fallback'.
 */

import { JAIPUR_TRAFFIC_CORRIDORS } from '../../config/city';
import { RawCorridorTrafficPayload } from '../adapters/roadTrafficAdapter';

export class RoadTrafficFallbackGenerator {
  /**
   * Generates corridor traffic snapshot for all 8 key Jaipur corridors.
   */
  public static generateAllCorridors(): RawCorridorTrafficPayload[] {
    const now = new Date();
    // Convert to IST hour
    const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;

    // Peak rush hour factor (morning 9-11, evening 18-21)
    let baseMultiplier = 1.15;
    if ((istHour >= 9 && istHour <= 11) || (istHour >= 18 && istHour <= 21)) {
      baseMultiplier = 1.55; // Peak congestion
    } else if (istHour >= 12 && istHour <= 17) {
      baseMultiplier = 1.30; // Regular afternoon flow
    } else if (istHour >= 22 || istHour <= 6) {
      baseMultiplier = 1.05; // Late night free flow
    }

    return JAIPUR_TRAFFIC_CORRIDORS.map((corridor, idx) => {
      // Deterministic slight variance per corridor
      const corridorVariance = ((idx * 17) % 25) / 100 - 0.1; // -0.1 to +0.15
      const randomJitter = (Math.random() * 0.15) - 0.05;
      const congestionRatio = Math.max(1.0, Math.round((baseMultiplier + corridorVariance + randomJitter) * 100) / 100);

      const staticDurationSeconds = corridor.typicalDurationMinutes * 60;
      const durationSeconds = Math.round(staticDurationSeconds * congestionRatio);
      const distanceMeters = Math.round(corridor.baseDistanceKm * 1000);

      return {
        corridorId: corridor.id,
        durationSeconds,
        staticDurationSeconds,
        distanceMeters,
        congestionRatio,
        origin: 'simulated_fallback' as const,
        timestampMs: Date.now(),
      };
    });
  }
}
