/**
 * Date & Time formatting utility for CityPulse Jaipur
 * Ensures Western digits (0-9) are always maintained even in Hindi locale,
 * and formats dates as DD MMM YYYY, hh:mm AM/PM IST.
 */

export function formatDateTimeIST(timestamp: number | Date | string, language: 'en' | 'hi' = 'en'): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';

  const istFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const parts = istFormatter.formatToParts(d);
  let day = '';
  let month = '';
  let year = '';
  let hour = '';
  let minute = '';
  let dayPeriod = 'AM';

  for (const part of parts) {
    if (part.type === 'day') day = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'year') year = part.value;
    else if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
    else if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase();
  }

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`;
}

export function formatDateIST(timestamp: number | Date | string): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';

  const istFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const parts = istFormatter.formatToParts(d);
  let day = '';
  let month = '';
  let year = '';

  for (const part of parts) {
    if (part.type === 'day') day = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'year') year = part.value;
  }

  return `${day} ${month} ${year}`;
}

export function formatTimeIST(timestamp: number | Date | string, includeSeconds: boolean = true): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  });
}
