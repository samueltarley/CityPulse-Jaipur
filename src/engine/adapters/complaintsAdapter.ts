/**
 * Complaints Adapter.
 * Normalizes citizen grievance stream.
 * Raw format: Poisson bursts with "DD/MM/YYYY hh:mm A" string timestamps and English/Hinglish text.
 */

import { CivicEvent, EventCategory, EventSeverity } from '../../types';
import { parseComplaintTimestamp, resolveZoneFromText } from '../geoUtils';

export interface RawComplaintPayload {
  complaint_id: string;
  source_channel: 'sampark_181' | 'whatsapp_bot' | 'web_portal';
  reported_at_str: string; // "DD/MM/YYYY hh:mm A"
  location_text: string;
  raw_description: string;
  category_hint?: string;
  urgency_flag: boolean;
}

export function normalizeComplaintEvent(raw: RawComplaintPayload): CivicEvent {
  const timestampMs = parseComplaintTimestamp(raw.reported_at_str);
  const zone = resolveZoneFromText(`${raw.location_text} ${raw.raw_description}`);

  // Determine category from description / hint
  const descLower = raw.raw_description.toLowerCase();
  let category: EventCategory = 'sanitation';

  if (descLower.includes('water') || descLower.includes('pipeline') || descLower.includes('leak') || descLower.includes('sewer') || descLower.includes('pressure') || descLower.includes('pani')) {
    category = 'water';
  } else if (descLower.includes('traffic') || descLower.includes('jam') || descLower.includes('signal') || descLower.includes('crossing') || descLower.includes('rickshaw') || descLower.includes('parking')) {
    category = 'traffic';
  } else if (descLower.includes('batti') || descLower.includes('light') || descLower.includes('power') || descLower.includes('electricity') || descLower.includes('current') || descLower.includes('bijli')) {
    category = 'power';
  } else if (descLower.includes('crowd') || descLower.includes('tourist') || descLower.includes('fair') || descLower.includes('mela') || descLower.includes('bhagdaud')) {
    category = 'crowd';
  } else if (descLower.includes('kachra') || descLower.includes('garbage') || descLower.includes('manhole') || descLower.includes('smell') || descLower.includes('drain')) {
    category = 'sanitation';
  }

  // Determine severity
  let severity: EventSeverity = 'low';
  if (raw.urgency_flag || descLower.includes('open manhole') || descLower.includes('hazard') || descLower.includes('burst') || descLower.includes('danger')) {
    severity = 'high';
  } else if (descLower.includes('leak') || descLower.includes('jam') || descLower.includes('batti gul') || descLower.includes('overflow')) {
    severity = 'medium';
  }

  // Generate clean bilingual titles
  const categoryLabelsEn: Record<EventCategory, string> = {
    water: 'Water Supply & Leakage Issue',
    traffic: 'Traffic Congestion Grievance',
    sanitation: 'Sanitation & Solid Waste Report',
    power: 'Power Outage & Streetlight Issue',
    crowd: 'Pedestrian & Tourist Chokepoint',
    air_quality: 'Air Quality & Dust Complaint',
    transit: 'Public Transit Delay Report',
  };

  const categoryLabelsHi: Record<EventCategory, string> = {
    water: 'पेयजल आपूर्ति व लीकेज शिकायत',
    traffic: 'यातायात अवरोध व जाम सूचना',
    sanitation: 'कचरा व स्वच्छता निवारण मांग',
    power: 'विद्युत कटौती व स्ट्रीटलाइट समस्या',
    crowd: 'भीड़भाड़ व पैदल मार्ग अवरोध',
    air_quality: 'धूल व वायु प्रदूषण शिकायत',
    transit: 'सार्वजनिक परिवहन शिकायत',
  };

  const titleEn = `${categoryLabelsEn[category]} – ${raw.location_text}`;
  const titleHi = `${categoryLabelsHi[category]} – ${raw.location_text}`;

  return {
    id: `grievance-${raw.complaint_id}`,
    timestamp: timestampMs,
    zoneId: zone.id,
    category,
    severity,
    titleEn,
    titleHi,
    descriptionEn: `Citizen Report (${raw.source_channel}): "${raw.raw_description}". Location: ${raw.location_text}, ${zone.nameEn}.`,
    descriptionHi: `नागरिक शिकायत (${raw.source_channel}): "${raw.raw_description}"। स्थान: ${raw.location_text}, ${zone.nameHi}।`,
    locationName: `${raw.location_text} (${zone.nameEn})`,
    coordinates: zone.center,
    source: 'resident_report',
    status: 'active',
    affectedRadiusMeters: 300,
    metadata: {
      origin: 'simulated',
      rawPayload: raw,
      source_channel: raw.source_channel,
      complaint_id: raw.complaint_id,
      urgency_flag: raw.urgency_flag,
    },
  };
}
