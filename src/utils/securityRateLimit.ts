/**
 * Client-Side Security & Anti-Abuse Rate Limiter for CityPulse Jaipur
 * Protects municipal dispatch queues and Firestore against spam flooding.
 */

const STORAGE_KEY_REPORTS = 'citypulse_sec_report_history';
const MAX_REPORTS_PER_WINDOW = 3;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface RateLimitStatus {
  allowed: boolean;
  remainingSubmissions: number;
  retryAfterSeconds: number;
  message?: string;
}

export function checkReportRateLimit(): RateLimitStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();

    // Filter out timestamps outside the active window
    const activeTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

    if (activeTimestamps.length >= MAX_REPORTS_PER_WINDOW) {
      const oldest = activeTimestamps[0];
      const retryAfterSeconds = Math.ceil((oldest + WINDOW_MS - now) / 1000);
      return {
        allowed: false,
        remainingSubmissions: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
        message: `Anti-Spam Security: Maximum ${MAX_REPORTS_PER_WINDOW} reports allowed per 5 minutes. Please wait ${retryAfterSeconds}s.`,
      };
    }

    return {
      allowed: true,
      remainingSubmissions: MAX_REPORTS_PER_WINDOW - activeTimestamps.length,
      retryAfterSeconds: 0,
    };
  } catch {
    return { allowed: true, remainingSubmissions: 1, retryAfterSeconds: 0 };
  }
}

export function recordReportSubmission(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const active = timestamps.filter((t) => now - t < WINDOW_MS);
    active.push(now);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(active));
  } catch {
    // Ignore storage quota or disabled localStorage
  }
}
