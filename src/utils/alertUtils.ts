import { CivicEvent, EventCategory, EventSeverity } from '../types';
import { JAIPUR_ZONES } from '../config/city';

export interface CompactAlertItem {
  id: string;
  eventId: string;
  zoneId: string;
  areaNameEn: string;
  areaNameHi: string;
  category: EventCategory;
  severity: EventSeverity;
  shortProblemEn: string;
  shortProblemHi: string;
  timestamp: number;
  timeAgoEn: string;
  timeAgoHi: string;
}

export function formatTimeAgo(timestamp: number, lang: 'en' | 'hi' = 'en'): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) {
    return lang === 'hi' ? 'अभी' : 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'hi' ? `${diffMin} मि. पहले` : `${diffMin} min ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return lang === 'hi' ? `${diffHour} घंटे पहले` : `${diffHour}h ago`;
  }
  const diffDays = Math.floor(diffHour / 24);
  return lang === 'hi' ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
}

/**
 * Trims a string down to maximum target words cleanly.
 */
function cleanShorten(str: string, maxWords: number = 7): string {
  if (!str) return '';
  // Remove boilerplate prefixes
  let cleaned = str
    .replace(/^Citizen Report \([^)]+\):\s*/i, '')
    .replace(/^नागरिक शिकायत \([^)]+\):\s*/i, '')
    .replace(/^Automated traffic analytics identified\s*/i, '')
    .replace(/^स्वचालित कैमरा विश्लेषण द्वारा\s*/i, '')
    .replace(/^ITMS Junction Bottleneck -\s*/i, '')
    .replace(/["“”]/g, '')
    .trim();

  // If there's a dash separating category and location/detail, prefer detail
  if (cleaned.includes('–')) {
    const parts = cleaned.split('–').map(s => s.trim());
    if (parts[1]) cleaned = parts[1];
  } else if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ').map(s => s.trim());
    if (parts[1]) cleaned = parts[1];
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

/**
 * Derives concise 5-8 word short problem in EN and HI.
 */
export function getShortProblemText(event: CivicEvent): { en: string; hi: string } {
  // Check if raw description gives specific concise context
  const rawDesc = (event.metadata?.rawPayload as any)?.raw_description || '';
  const descLower = (rawDesc || event.descriptionEn || event.titleEn).toLowerCase();

  // Specific common patterns in Jaipur feeds:
  if (descLower.includes('sewer') || descLower.includes('drain') && descLower.includes('overflow')) {
    return {
      en: 'Sewer overflow on street',
      hi: 'सड़क पर सीवर नाली ओवरफ्लो',
    };
  }
  if (descLower.includes('tourist') && (descLower.includes('bus') || descLower.includes('parking') || descLower.includes('kunda'))) {
    return {
      en: 'Tourist vehicles blocking bus stand',
      hi: 'पर्यटक वाहनों से बस स्टैंड जाम',
    };
  }
  if (descLower.includes('waterlogging') || descLower.includes('water logging') || descLower.includes('underpass')) {
    return {
      en: 'Underpass waterlogging restricts movement',
      hi: 'अंडरपास में जलभराव से यातायात बाधित',
    };
  }
  if (descLower.includes('pipeline') || descLower.includes('leakage') || descLower.includes('leak')) {
    return {
      en: 'Water pipeline leakage on road',
      hi: 'मुख्य सड़क पर पाइपलाइन लीकेज',
    };
  }
  if (descLower.includes('kachra') || descLower.includes('garbage') || descLower.includes('dump')) {
    return {
      en: 'Garbage dump overflowing on road',
      hi: 'सड़क पर कचरा डिपो ओवरफ्लो',
    };
  }
  if (descLower.includes('batti gul') || descLower.includes('blackout') || descLower.includes('power outage')) {
    return {
      en: 'Power outage in market lane',
      hi: 'बाजार क्षेत्र में विद्युत आपूर्ति ठप',
    };
  }
  if (descLower.includes('pothole') || descLower.includes('asphalt')) {
    return {
      en: 'Deep asphalt pothole hazard',
      hi: 'सड़क पर गहरा खतरनाक गड्ढा',
    };
  }
  if (descLower.includes('e-rickshaw') || descLower.includes('four-way jam') || descLower.includes('traffic signal')) {
    return {
      en: 'Heavy traffic congestion at crossroad',
      hi: 'चौराहे पर भीषण यातायात जाम',
    };
  }
  if (descLower.includes('dust') || descLower.includes('pm10') || descLower.includes('construction')) {
    return {
      en: 'Heavy construction dust & air pollution',
      hi: 'निर्माण कार्य से अत्यधिक धूल व प्रदूषण',
    };
  }
  if (descLower.includes('manhole') || descLower.includes('storm')) {
    return {
      en: 'Open storm manhole hazard',
      hi: 'खुला मैनहोल व नाला खतरा',
    };
  }
  if (descLower.includes('metro') || descLower.includes('pink line')) {
    return {
      en: 'Pink Line metro delay recorded',
      hi: 'पिंक लाइन मेट्रो सेवा में विलंब',
    };
  }

  // Fallback to cleaned title/description
  const en = cleanShorten(event.titleEn || event.descriptionEn, 7);
  const hi = cleanShorten(event.titleHi || event.descriptionHi, 7);

  return {
    en: en || 'Civic issue reported',
    hi: hi || 'नागरिक समस्या दर्ज',
  };
}

export function toCompactAlert(event: CivicEvent, lang: 'en' | 'hi' = 'en'): CompactAlertItem {
  const zone = JAIPUR_ZONES.find((z) => z.id === event.zoneId);
  const shortTexts = getShortProblemText(event);

  return {
    id: event.id,
    eventId: event.id,
    zoneId: event.zoneId,
    areaNameEn: zone ? zone.nameEn.split('(')[0].trim() : 'Jaipur',
    areaNameHi: zone ? zone.nameHi.split('(')[0].trim() : 'जयपुर',
    category: event.category,
    severity: event.severity,
    shortProblemEn: shortTexts.en,
    shortProblemHi: shortTexts.hi,
    timestamp: event.timestamp,
    timeAgoEn: formatTimeAgo(event.timestamp, 'en'),
    timeAgoHi: formatTimeAgo(event.timestamp, 'hi'),
  };
}
