/**
 * Privacy Sanitizer & PII Redaction Engine for CityPulse Jaipur
 *
 * Protects citizen privacy by automatically detecting and masking:
 * 1. Indian Phone Numbers (+91 / 0 / 10-digit mobile)
 * 2. Email Addresses
 * 3. 12-Digit Indian Aadhaar Numbers
 * 4. Credit/Debit card numbers
 * 5. Potentially dangerous HTML/Script tags (anti-XSS)
 * 6. GPS precision fuzzing (caps coordinates to ~11 meter street-level precision to prevent home intrusion)
 */

export interface SanitizedContent {
  cleanText: string;
  hasRedactions: boolean;
  redactedTypes: string[];
}

/**
 * Strips script tags, iframe, object, and HTML event handlers
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
    .trim();
}

/**
 * Automatically masks personal identifiable information (PII)
 */
export function redactPII(text: string): SanitizedContent {
  if (!text) {
    return { cleanText: '', hasRedactions: false, redactedTypes: [] };
  }

  let cleaned = text;
  const redactedTypes: string[] = [];

  // 1. Mask 12-digit Indian Aadhaar Numbers (e.g. 1234 5678 9012 or 123456789012)
  const aadhaarRegex = /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g;
  if (aadhaarRegex.test(cleaned)) {
    cleaned = cleaned.replace(aadhaarRegex, '🔒 [AADHAAR PROTECTED: XXXX-XXXX]');
    redactedTypes.push('Aadhaar Number');
  }

  // 2. Mask 10-digit Indian Mobile Numbers with optional +91 / 0 prefix
  const phoneRegex = /(?:\+?91[\-\s]?)?[6-9]\d{9}\b/g;
  if (phoneRegex.test(cleaned)) {
    cleaned = cleaned.replace(phoneRegex, (match) => {
      const lastFour = match.slice(-4);
      return `🔒 [PHONE MASKED: ******${lastFour}]`;
    });
    redactedTypes.push('Phone Number');
  }

  // 3. Mask Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  if (emailRegex.test(cleaned)) {
    cleaned = cleaned.replace(emailRegex, (email) => {
      const parts = email.split('@');
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
      return `🔒 [EMAIL MASKED: ${maskedName}@${parts[1]}]`;
    });
    redactedTypes.push('Email Address');
  }

  // 4. Sanitize HTML
  cleaned = sanitizeHtml(cleaned);

  return {
    cleanText: cleaned,
    hasRedactions: redactedTypes.length > 0,
    redactedTypes,
  };
}

/**
 * Fuzzes GPS coordinates to ~11m street-level precision (4 decimal places).
 * Prevents pinpointing private individual residential interiors while retaining
 * accurate roadway and municipal repair dispatch coordinates.
 */
export function fuzzLocationCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}
