/**
 * Transit Telemetry Generator.
 * Generates raw Pink Line metro and JCTSL bus payloads.
 * Interval: 8–12 seconds.
 * Timestamp: Unix SECONDS.
 */

import { SeededRandom, defaultPRNG } from '../random';
import { JAIPUR_METRO_STATIONS, JAIPUR_BUS_CORRIDORS, JAIPUR_ZONES } from '../../config/city';
import { RawTransitPayload, RawMetroPayload, RawBusPayload } from '../adapters/transitAdapter';

export class TransitGenerator {
  private prng: SeededRandom;
  private metroStationIndex: number = 0;
  private busCounter: number = 100;

  constructor(prng: SeededRandom = defaultPRNG) {
    this.prng = prng;
  }

  generateNext(): RawTransitPayload {
    const isMetro = this.prng.chance(0.55);
    const nowUnixSec = Math.floor(Date.now() / 1000);

    if (isMetro) {
      const station = JAIPUR_METRO_STATIONS[this.metroStationIndex % JAIPUR_METRO_STATIONS.length];
      this.metroStationIndex++;

      // Peak density at interchange or central stations
      const isHub = station.isInterchange || station.id === 'st-10' || station.id === 'st-11';
      const baseDensity = isHub ? 65 : 40;
      const crowd_density_pct = Math.min(99, Math.max(20, Math.round(baseDensity + this.prng.nextFloat(-15, 30))));
      const delay_sec = this.prng.chance(0.25) ? this.prng.nextInt(120, 720) : 0;
      const train_headway_sec = this.prng.nextInt(300, 480);
      const gate_entries_per_min = Math.round(crowd_density_pct * 1.8 + this.prng.nextInt(10, 50));

      const metroPayload: RawMetroPayload = {
        system: 'jmrc_pink_line',
        station_code: station.id,
        station_name: station.nameEn,
        line: 'pink',
        crowd_density_pct,
        train_headway_sec,
        delay_sec,
        gate_entries_per_min,
        timestamp_sec: nowUnixSec,
      };

      return metroPayload;
    } else {
      const corridor = this.prng.choice(JAIPUR_BUS_CORRIDORS);
      this.busCounter++;
      const bus_id = `RJ-14-PC-${1000 + (this.busCounter % 8999)}`;

      // Pick zone along the corridor
      const zoneId = this.prng.choice(corridor.zoneIds);
      const zone = JAIPUR_ZONES.find((z) => z.id === zoneId) || JAIPUR_ZONES[0];
      const latOffset = this.prng.nextFloat(-0.008, 0.008);
      const lngOffset = this.prng.nextFloat(-0.008, 0.008);
      const current_gps: [number, number] = [zone.center.lat + latOffset, zone.center.lng + lngOffset];

      const passenger_load_pct = this.prng.nextInt(35, 98);
      const congestion_level: 'normal' | 'moderate' | 'heavy' | 'standstill' =
        passenger_load_pct > 90 && this.prng.chance(0.4)
          ? 'standstill'
          : passenger_load_pct > 75
          ? 'heavy'
          : passenger_load_pct > 50
          ? 'moderate'
          : 'normal';

      const speedMap = {
        normal: this.prng.nextInt(28, 48),
        moderate: this.prng.nextInt(15, 27),
        heavy: this.prng.nextInt(6, 14),
        standstill: this.prng.nextInt(1, 5),
      };

      const busPayload: RawBusPayload = {
        system: 'jctsl_bus',
        route_code: corridor.routeCode,
        bus_id,
        corridor_name: corridor.nameEn,
        current_gps,
        passenger_load_pct,
        speed_kmh: speedMap[congestion_level],
        congestion_level,
        timestamp_sec: nowUnixSec,
      };

      return busPayload;
    }
  }
}
