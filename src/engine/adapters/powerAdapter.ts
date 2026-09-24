/**
 * Power Grid Adapter.
 * Normalizes JVVNL feeder and transformer outage events.
 * Raw format: ISO 8601 strings and textual zone names, with paired OUTAGE_REPORTED and RESTORED events.
 */

import { CivicEvent, EventSeverity, EventStatus } from '../../types';
import { resolveZoneFromText } from '../geoUtils';

export interface RawPowerOutagePayload {
  ticket_number: string;
  substation_code: string;
  zone_name_text: string; // TEXT name e.g. "Mansarovar", "Walled City"
  feeder_line_id: string;
  transformers_tripped: number;
  estimated_consumers_affected: number;
  event_type: 'OUTAGE_REPORTED' | 'MAINTENANCE_TRIP' | 'RESTORED';
  iso_timestamp: string; // ISO 8601 string
  root_cause?: string;
}

export function normalizePowerEvent(raw: RawPowerOutagePayload): CivicEvent {
  const timestampMs = new Date(raw.iso_timestamp).getTime() || Date.now();
  const zone = resolveZoneFromText(raw.zone_name_text);

  const isRestored = raw.event_type === 'RESTORED';
  const status: EventStatus = isRestored ? 'resolved' : 'active';

  let severity: EventSeverity = 'low';
  if (!isRestored) {
    if (raw.transformers_tripped >= 4 || raw.estimated_consumers_affected >= 5000) {
      severity = 'critical';
    } else if (raw.transformers_tripped >= 2 || raw.estimated_consumers_affected >= 1500) {
      severity = 'high';
    } else {
      severity = 'medium';
    }
  }

  const titleEn = isRestored
    ? `Grid Restored: Feeder ${raw.feeder_line_id} in ${zone.nameEn}`
    : `Power Outage: Feeder ${raw.feeder_line_id} (${raw.transformers_tripped} Transformers) in ${zone.nameEn}`;

  const titleHi = isRestored
    ? `विद्युत आपूर्ति बहाल: फीडर ${raw.feeder_line_id}, ${zone.nameHi}`
    : `विद्युत कटौती: फीडर ${raw.feeder_line_id} (${raw.transformers_tripped} ट्रांसफार्मर ट्रिप), ${zone.nameHi}`;

  const descriptionEn = isRestored
    ? `JVVNL Line Crew restored feeder ${raw.feeder_line_id}. Normal 11kV supply resumed for ~${raw.estimated_consumers_affected} consumers in ${zone.nameEn}.`
    : `Substation ${raw.substation_code} reported 11kV trip on feeder ${raw.feeder_line_id}. ${raw.transformers_tripped} transformers affected, impacting ~${raw.estimated_consumers_affected} consumers. Cause: ${raw.root_cause || 'Grid load overload'}.`;

  const descriptionHi = isRestored
    ? `जयपुर डिस्कॉम टीम ने फीडर ${raw.feeder_line_id} पर आपूर्ति बहाल की। ${zone.nameHi} में लगभग ${raw.estimated_consumers_affected} उपभोक्ताओं की बिजली सामान्य।`
    : `सबस्टेशन ${raw.substation_code} के फीडर ${raw.feeder_line_id} पर ट्रिप। ${raw.transformers_tripped} ट्रांसफार्मर प्रभावित (~${raw.estimated_consumers_affected} उपभोक्ता)।`;

  return {
    id: `power-${raw.ticket_number}-${raw.event_type.toLowerCase()}`,
    timestamp: timestampMs,
    zoneId: zone.id,
    category: 'power',
    severity,
    titleEn,
    titleHi,
    descriptionEn,
    descriptionHi,
    locationName: `${raw.zone_name_text} 33/11kV Substation (${zone.nameEn})`,
    coordinates: zone.center,
    source: 'iot_sensor',
    status,
    affectedRadiusMeters: 800,
    metadata: {
      origin: 'simulated',
      rawPayload: raw,
      ticket_number: raw.ticket_number,
      event_type: raw.event_type,
      feeder_id: raw.feeder_line_id,
      transformers: raw.transformers_tripped,
    },
  };
}
