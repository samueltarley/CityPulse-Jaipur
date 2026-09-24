/**
 * Citizen Complaints Generator.
 * Emits citizen complaints in Poisson bursts with "DD/MM/YYYY hh:mm A" string timestamps.
 * Realistic English & Hinglish descriptions with authentic Jaipur landmarks, no personal data.
 */

import { SeededRandom, defaultPRNG } from '../random';
import { formatComplaintTimestamp } from '../geoUtils';
import { RawComplaintPayload } from '../adapters/complaintsAdapter';

interface ComplaintTemplate {
  location_text: string;
  raw_description: string;
  category_hint: string;
  urgency_flag?: boolean;
}

const TEMPLATES: ComplaintTemplate[] = [
  {
    location_text: 'Near Badi Chaupar Metro Gate 2',
    raw_description: 'Water pipeline leakage on main road, water logging and traffic crawling since morning',
    category_hint: 'water',
  },
  {
    location_text: 'Johari Bazar, Ghee Walo Ka Rasta',
    raw_description: 'E-rickshaw jam packed completely, tourist bus parked illegally near market entrance',
    category_hint: 'traffic',
  },
  {
    location_text: 'Mansarovar VT Road Market near Shipra Path',
    raw_description: 'Kachra depot overflowing on road, stray cattle blocking lane 3, foul smell spreading',
    category_hint: 'sanitation',
  },
  {
    location_text: 'Vaishali Nagar Amrapali Circle',
    raw_description: 'Traffic signal timer stuck on green for 10 mins then turned off, massive four-way jam',
    category_hint: 'traffic',
  },
  {
    location_text: 'Raja Park Main Market near LBS College',
    raw_description: 'Batti gul in entire lane 5 since 45 minutes, streetlights also off, shops running on generators',
    category_hint: 'power',
  },
  {
    location_text: 'Malviya Nagar Calgiri Hospital Road',
    raw_description: 'Heavy construction dust and cement dust without green cloth cover, breathing trouble for patients',
    category_hint: 'air_quality',
  },
  {
    location_text: 'Amer Fort Kunda Bus Stand',
    raw_description: 'Tourist vehicles double parking on narrow climb, emergency vehicle cannot pass',
    category_hint: 'traffic',
    urgency_flag: true,
  },
  {
    location_text: 'Sanganer Kagzi Mohalla',
    raw_description: 'Drain sewer overflow entering street, dirty water accumulating near printing workshop',
    category_hint: 'sanitation',
  },
  {
    location_text: 'Jagatpura Mahal Road High Rise area',
    raw_description: 'PHED tap water supply completely dry for second morning, society tankers charging high rates',
    category_hint: 'water',
  },
  {
    location_text: 'C-Scheme Statue Circle near Central Park gate 1',
    raw_description: 'Fallen heavy tree branch after gusty wind blocking pedestrian jogging track and cycle path',
    category_hint: 'sanitation',
  },
  {
    location_text: 'Mansarovar City Park Gate 3',
    raw_description: 'Open storm manhole without lid near parking lot, dangerous hazard for kids in evening',
    category_hint: 'sanitation',
    urgency_flag: true,
  },
  {
    location_text: 'Tripolia Bazar near City Palace crossroad',
    raw_description: 'Pedestrian crowding huge near temple, barricading needed to separate two-wheelers',
    category_hint: 'crowd',
  },
  {
    location_text: 'Tonk Road Gopalpura Flyover slip lane',
    raw_description: 'Major water leakage from municipal valve creating puddle and slowing traffic',
    category_hint: 'water',
  },
  {
    location_text: 'Civil Lines Railway Crossing underpass',
    raw_description: 'Streetlights flashing continuously and two transformer sparks seen near railway pillar',
    category_hint: 'power',
    urgency_flag: true,
  },
  {
    location_text: 'World Trade Park JLN Marg service road',
    raw_description: 'Autos and cabs parked in double line blocking left turn towards GT',
    category_hint: 'traffic',
  },
];

export class ComplaintsGenerator {
  private prng: SeededRandom;
  private complaintSequence: number = 24000;

  constructor(prng: SeededRandom = defaultPRNG) {
    this.prng = prng;
  }

  /**
   * Generates a burst of 0 to N complaints using Poisson sampling.
   */
  generateBurst(lambda: number = 1.1): RawComplaintPayload[] {
    const count = this.prng.poisson(lambda);
    const results: RawComplaintPayload[] = [];

    for (let i = 0; i < count; i++) {
      this.complaintSequence++;
      const template = this.prng.choice(TEMPLATES);
      const channel = this.prng.choice<RawComplaintPayload['source_channel']>([
        'sampark_181',
        'whatsapp_bot',
        'web_portal',
      ]);

      // Current IST formatted string
      const dateStr = formatComplaintTimestamp(new Date());

      results.push({
        complaint_id: `CMP-2026-${this.complaintSequence}`,
        source_channel: channel,
        reported_at_str: dateStr,
        location_text: template.location_text,
        raw_description: template.raw_description,
        category_hint: template.category_hint,
        urgency_flag: Boolean(template.urgency_flag || this.prng.chance(0.12)),
      });
    }

    return results;
  }
}
