/**
 * Power Outage Telemetry Generator.
 * Generates JVVNL power outage events and subsequent restorations.
 * Interval: 45–90 seconds.
 * Timestamp: ISO 8601 strings.
 * Zone: Text name.
 */

import { SeededRandom, defaultPRNG } from '../random';
import { RawPowerOutagePayload } from '../adapters/powerAdapter';

const JAIPUR_GRID_ZONES = [
  'Mansarovar Sector 7',
  'Walled City (Johari Substation)',
  'Malviya Nagar Sector 4',
  'Vaishali Nagar Amrapali',
  'Raja Park Tilak Nagar',
  'Sanganer Industrial Feeder',
  'Amer Fort Foothills',
  'Jagatpura Mahal Road',
  'C-Scheme Secretariat Line',
];

interface PendingOutage {
  ticket_number: string;
  substation_code: string;
  zone_name_text: string;
  feeder_line_id: string;
  estimated_consumers_affected: number;
  outageTime: number;
  restoreAfterMs: number;
}

export class PowerGenerator {
  private prng: SeededRandom;
  private ticketCounter: number = 8800;
  private pendingOutages: PendingOutage[] = [];

  constructor(prng: SeededRandom = defaultPRNG) {
    this.prng = prng;
  }

  generateEvent(): RawPowerOutagePayload {
    const now = Date.now();

    // Check if any pending outage is ready for RESTORATION
    const restoreIndex = this.pendingOutages.findIndex((o) => now - o.outageTime >= o.restoreAfterMs);
    if (restoreIndex !== -1) {
      const restored = this.pendingOutages.splice(restoreIndex, 1)[0];
      return {
        ticket_number: restored.ticket_number,
        substation_code: restored.substation_code,
        zone_name_text: restored.zone_name_text,
        feeder_line_id: restored.feeder_line_id,
        transformers_tripped: 0,
        estimated_consumers_affected: restored.estimated_consumers_affected,
        event_type: 'RESTORED',
        iso_timestamp: new Date().toISOString(),
      };
    }

    // Otherwise generate a new OUTAGE_REPORTED event
    this.ticketCounter++;
    const zoneName = this.prng.choice(JAIPUR_GRID_ZONES);
    const feederNum = this.prng.nextInt(11, 49);
    const feeder_line_id = `FDR-${feederNum}`;
    const substation_code = `SUB-${zoneName.substring(0, 3).toUpperCase()}-${this.prng.nextInt(1, 9)}`;
    const transformers_tripped = this.prng.nextInt(1, 5);
    const estimated_consumers_affected = transformers_tripped * this.prng.nextInt(600, 1400);
    const ticket_number = `JVVNL-TKT-${this.ticketCounter}`;

    const causes = [
      '11kV overhead line insulator flashover',
      'Distribution transformer thermal overload',
      'Tree branch contact during gusty wind',
      'Underground cable puncture near roadworks',
      'Phase failure at distribution box',
    ];

    const newOutage: PendingOutage = {
      ticket_number,
      substation_code,
      zone_name_text: zoneName,
      feeder_line_id,
      estimated_consumers_affected,
      outageTime: now,
      restoreAfterMs: this.prng.nextInt(75000, 180000), // restore in 75s to 3 mins
    };

    this.pendingOutages.push(newOutage);

    return {
      ticket_number,
      substation_code,
      zone_name_text: zoneName,
      feeder_line_id,
      transformers_tripped,
      estimated_consumers_affected,
      event_type: 'OUTAGE_REPORTED',
      iso_timestamp: new Date().toISOString(),
      root_cause: this.prng.choice(causes),
    };
  }
}
