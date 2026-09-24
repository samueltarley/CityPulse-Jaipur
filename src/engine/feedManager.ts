/**
 * Feed Orchestration & Normalization Engine for CityPulse Jaipur.
 * Coordinates real Open-Meteo Weather & AQI APIs with fallback, plus simulated transit, complaints, and power feeds.
 */

import { JAIPUR_ZONES } from '../config/city';
import { useAppStore } from '../store/useAppStore';
import {
  normalizeWeatherResponse,
  normalizeAirQualityResponse,
  RawWeatherZoneReading,
  RawAirQualityZoneReading,
} from './adapters/weatherAdapter';
import { normalizeTransitEvent } from './adapters/transitAdapter';
import { normalizeComplaintEvent } from './adapters/complaintsAdapter';
import { normalizePowerEvent } from './adapters/powerAdapter';
import { normalizeRoadTrafficEvent, RawCorridorTrafficPayload } from './adapters/roadTrafficAdapter';

import { TransitGenerator } from './generators/transitGenerator';
import { ComplaintsGenerator } from './generators/complaintsGenerator';
import { PowerGenerator } from './generators/powerGenerator';
import { WeatherFallbackGenerator } from './generators/weatherFallbackGenerator';
import { RoadTrafficFallbackGenerator } from './generators/roadTrafficFallbackGenerator';
import { SeededRandom } from './random';

const TIMEOUT_MS = 8000;
const WEATHER_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const AQI_POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const ROUTES_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes retry when in fallback

export class FeedManager {
  private static instance: FeedManager | null = null;

  private transitGen: TransitGenerator;
  private complaintsGen: ComplaintsGenerator;
  private powerGen: PowerGenerator;
  private weatherFallbackGen: WeatherFallbackGenerator;

  private isRunning: boolean = false;
  private weatherTimer: NodeJS.Timeout | null = null;
  private aqiTimer: NodeJS.Timeout | null = null;
  private transitTimer: NodeJS.Timeout | null = null;
  private complaintsTimer: NodeJS.Timeout | null = null;
  private powerTimer: NodeJS.Timeout | null = null;
  private trafficTimer: NodeJS.Timeout | null = null;
  private routesTrafficTimer: NodeJS.Timeout | null = null;
  private rateTimer: NodeJS.Timeout | null = null;
  private lastTrafficPollTime: number = 0;

  // Rolling event counters for events/min calculation
  private eventTimestamps: Record<string, number[]> = {
    'open-meteo-weather': [],
    'open-meteo-air-quality': [],
    'jmrc-transit-telemetry': [],
    'citizen-complaints-stream': [],
    'jvvnl-power-grid': [],
    'traffic-police-itms': [],
    'road-traffic-routes-api': [],
  };

  private constructor() {
    const prng = new SeededRandom(20260924);
    this.transitGen = new TransitGenerator(prng);
    this.complaintsGen = new ComplaintsGenerator(prng);
    this.powerGen = new PowerGenerator(prng);
    this.weatherFallbackGen = new WeatherFallbackGenerator(prng);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isRunning) {
          const now = Date.now();
          if (now - this.lastTrafficPollTime >= ROUTES_POLL_INTERVAL_MS) {
            console.log('[FeedManager] Tab visible and 10+ mins elapsed; resuming Google Routes poll.');
            this.fetchRoadTraffic();
          }
        }
      });
    }
  }

  public static getInstance(): FeedManager {
    if (!FeedManager.instance) {
      FeedManager.instance = new FeedManager();
    }
    return FeedManager.instance;
  }

  /**
   * Starts all feeds and schedules recurring polling.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[FeedManager] Initializing CityPulse Jaipur multi-modal feed ingestion...');

    // 1. Initial Weather, Air Quality & Road Traffic fetch
    this.fetchWeather();
    this.fetchAirQuality();
    this.fetchRoadTraffic();

    // 2. Start simulated feeds
    this.scheduleNextTransit();
    this.scheduleNextComplaints();
    this.scheduleNextPower();
    this.scheduleNextTrafficPolice();

    // 3. Periodic rate calculation cleaner every 5s
    if (this.rateTimer) clearInterval(this.rateTimer);
    this.rateTimer = setInterval(() => this.updateRateMetrics(), 5000);
  }

  /**
   * Stops all active timers and clears references to prevent memory leaks.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.weatherTimer) { clearTimeout(this.weatherTimer); this.weatherTimer = null; }
    if (this.aqiTimer) { clearTimeout(this.aqiTimer); this.aqiTimer = null; }
    if (this.transitTimer) { clearTimeout(this.transitTimer); this.transitTimer = null; }
    if (this.complaintsTimer) { clearTimeout(this.complaintsTimer); this.complaintsTimer = null; }
    if (this.powerTimer) { clearTimeout(this.powerTimer); this.powerTimer = null; }
    if (this.trafficTimer) { clearTimeout(this.trafficTimer); this.trafficTimer = null; }
    if (this.routesTrafficTimer) { clearTimeout(this.routesTrafficTimer); this.routesTrafficTimer = null; }
    if (this.rateTimer) { clearInterval(this.rateTimer); this.rateTimer = null; }
    console.log('[FeedManager] Stopped all feed listeners.');
  }

  private recordEventOccurrences(feedId: string, count: number): void {
    const now = Date.now();
    if (!this.eventTimestamps[feedId]) this.eventTimestamps[feedId] = [];
    for (let i = 0; i < count; i++) {
      this.eventTimestamps[feedId].push(now);
    }
  }

  private updateRateMetrics(): void {
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const store = useAppStore.getState();

    Object.keys(this.eventTimestamps).forEach((feedId) => {
      // Clean timestamps older than 60s
      this.eventTimestamps[feedId] = this.eventTimestamps[feedId].filter((t) => t >= oneMinAgo);
      const rate = this.eventTimestamps[feedId].length;
      store.updateFeedStatus(feedId, { eventsPerMin: rate });
    });
  }

  /* =========================================================================
   * 1. OPEN-METEO WEATHER (ALL 9 ZONES IN ONE CALL)
   * ========================================================================= */
  public async fetchWeather(): Promise<void> {
    const store = useAppStore.getState();
    if (store.disabledFeedIds.includes('open-meteo-weather')) {
      if (this.isRunning) {
        if (this.weatherTimer) clearTimeout(this.weatherTimer);
        this.weatherTimer = setTimeout(() => this.fetchWeather(), 6000);
      }
      return;
    }

    const lats = JAIPUR_ZONES.map((z) => z.center.lat).join(',');
    const lngs = JAIPUR_ZONES.map((z) => z.center.lng).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m&timezone=Asia/Kolkata`;

    const startTime = Date.now();
    let isSuccess = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Weather API returned HTTP ${res.status}`);
      const data = await res.json();
      const latency = Date.now() - startTime;

      // Open-Meteo returns array of objects when multiple coordinates are passed
      const rawList: RawWeatherZoneReading[] = Array.isArray(data) ? data : [data];

      // Console logging for verification as required in brief
      console.log('[Open-Meteo Weather Raw Response]', rawList);

      const { events, weatherState } = normalizeWeatherResponse(rawList, 'live_api');

      store.updateZoneWeatherAQI(weatherState);
      if (events.length > 0) {
        store.ingestEvents(events);
        this.recordEventOccurrences('open-meteo-weather', events.length);
      }

      const prevFeed = store.feedStatuses.find((f) => f.feedId === 'open-meteo-weather');
      store.updateFeedStatus('open-meteo-weather', {
        status: 'live',
        origin: 'live_api',
        latencyMs: latency,
        lastHeartbeat: Date.now(),
        lastError: undefined,
        totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
      });

      isSuccess = true;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Open-Meteo Weather Failed/Timed Out - Switching to Fallback]:', errMsg);

      // Fallback: Generate realistic simulated weather readings marked "simulated_fallback"
      const fallbackList = this.weatherFallbackGen.generateFallbackWeather();
      const { events, weatherState } = normalizeWeatherResponse(fallbackList, 'simulated_fallback');

      store.updateZoneWeatherAQI(weatherState);
      if (events.length > 0) {
        store.ingestEvents(events);
        this.recordEventOccurrences('open-meteo-weather', events.length);
      }

      const prevFeed = store.feedStatuses.find((f) => f.feedId === 'open-meteo-weather');
      store.updateFeedStatus('open-meteo-weather', {
        status: 'fallback',
        origin: 'simulated_fallback',
        latencyMs: Date.now() - startTime,
        lastHeartbeat: Date.now(),
        lastError: errMsg,
        totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
      });
    }

    if (this.isRunning) {
      // If failed, retry every 2 minutes; if success, schedule next in 10 minutes
      const nextDelay = isSuccess ? WEATHER_POLL_INTERVAL_MS : RETRY_INTERVAL_MS;
      if (this.weatherTimer) clearTimeout(this.weatherTimer);
      this.weatherTimer = setTimeout(() => this.fetchWeather(), nextDelay);
    }
  }

  /* =========================================================================
   * 2. OPEN-METEO AIR QUALITY (ALL 9 ZONES IN ONE CALL)
   * ========================================================================= */
  public async fetchAirQuality(): Promise<void> {
    const store = useAppStore.getState();
    if (store.disabledFeedIds.includes('open-meteo-air-quality')) {
      if (this.isRunning) {
        if (this.aqiTimer) clearTimeout(this.aqiTimer);
        this.aqiTimer = setTimeout(() => this.fetchAirQuality(), 6000);
      }
      return;
    }

    const lats = JAIPUR_ZONES.map((z) => z.center.lat).join(',');
    const lngs = JAIPUR_ZONES.map((z) => z.center.lng).join(',');

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lngs}&current=pm2_5,pm10&timezone=Asia/Kolkata`;

    const startTime = Date.now();
    let isSuccess = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Air Quality API returned HTTP ${res.status}`);
      const data = await res.json();
      const latency = Date.now() - startTime;

      const rawList: RawAirQualityZoneReading[] = Array.isArray(data) ? data : [data];

      // Console logging for verification as required in brief
      console.log('[Open-Meteo AQI Raw Response]', rawList);

      const { events, aqiState } = normalizeAirQualityResponse(rawList, 'live_api');

      store.updateZoneWeatherAQI(aqiState);
      if (events.length > 0) {
        store.ingestEvents(events);
        this.recordEventOccurrences('open-meteo-air-quality', events.length);
      }

      const prevFeed = store.feedStatuses.find((f) => f.feedId === 'open-meteo-air-quality');
      store.updateFeedStatus('open-meteo-air-quality', {
        status: 'live',
        origin: 'live_api',
        latencyMs: latency,
        lastHeartbeat: Date.now(),
        lastError: undefined,
        totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
      });

      isSuccess = true;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Open-Meteo AQI Failed/Timed Out - Switching to Fallback]:', errMsg);

      // Fallback: Generate realistic simulated AQI readings marked "simulated_fallback"
      const fallbackList = this.weatherFallbackGen.generateFallbackAirQuality();
      const { events, aqiState } = normalizeAirQualityResponse(fallbackList, 'simulated_fallback');

      store.updateZoneWeatherAQI(aqiState);
      if (events.length > 0) {
        store.ingestEvents(events);
        this.recordEventOccurrences('open-meteo-air-quality', events.length);
      }

      const prevFeed = store.feedStatuses.find((f) => f.feedId === 'open-meteo-air-quality');
      store.updateFeedStatus('open-meteo-air-quality', {
        status: 'fallback',
        origin: 'simulated_fallback',
        latencyMs: Date.now() - startTime,
        lastHeartbeat: Date.now(),
        lastError: errMsg,
        totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
      });
    }

    if (this.isRunning) {
      // If failed, retry every 2 minutes; if success, schedule next in 15 minutes
      const nextDelay = isSuccess ? AQI_POLL_INTERVAL_MS : RETRY_INTERVAL_MS;
      if (this.aqiTimer) clearTimeout(this.aqiTimer);
      this.aqiTimer = setTimeout(() => this.fetchAirQuality(), nextDelay);
    }
  }

  /* =========================================================================
   * 3. SIMULATED TRANSIT FEED (8–12 SECONDS)
   * ========================================================================= */
  private scheduleNextTransit(): void {
    if (!this.isRunning) return;
    const intervalMs = Math.floor(Math.random() * 4000) + 8000; // 8–12s

    if (this.transitTimer) clearTimeout(this.transitTimer);
    this.transitTimer = setTimeout(() => {
      const store = useAppStore.getState();
      if (!store.disabledFeedIds.includes('jmrc-transit-telemetry')) {
        try {
          const raw = this.transitGen.generateNext();
          const event = normalizeTransitEvent(raw);

          store.ingestEvents([event]);
          this.recordEventOccurrences('jmrc-transit-telemetry', 1);

          const prevFeed = store.feedStatuses.find((f) => f.feedId === 'jmrc-transit-telemetry');
          store.updateFeedStatus('jmrc-transit-telemetry', {
            status: 'live',
            lastHeartbeat: Date.now(),
            totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + 1,
          });
        } catch (err) {
          console.error('Error generating transit event:', err);
        }
      }
      this.scheduleNextTransit();
    }, intervalMs);
  }

  /* =========================================================================
   * 4. SIMULATED CITIZEN COMPLAINTS FEED (POISSON BURSTS, 10–18 SECONDS)
   * ========================================================================= */
  private scheduleNextComplaints(): void {
    if (!this.isRunning) return;
    const intervalMs = Math.floor(Math.random() * 8000) + 10000; // 10–18s

    if (this.complaintsTimer) clearTimeout(this.complaintsTimer);
    this.complaintsTimer = setTimeout(() => {
      const store = useAppStore.getState();
      if (!store.disabledFeedIds.includes('citizen-complaints-stream')) {
        try {
          const rawBurst = this.complaintsGen.generateBurst(1.2);
          if (rawBurst.length > 0) {
            const events = rawBurst.map(normalizeComplaintEvent);

            store.ingestEvents(events);
            this.recordEventOccurrences('citizen-complaints-stream', events.length);

            const prevFeed = store.feedStatuses.find((f) => f.feedId === 'citizen-complaints-stream');
            store.updateFeedStatus('citizen-complaints-stream', {
              status: 'live',
              lastHeartbeat: Date.now(),
              totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
            });
          }
        } catch (err) {
          console.error('Error generating complaints burst:', err);
        }
      }
      this.scheduleNextComplaints();
    }, intervalMs);
  }

  /* =========================================================================
   * 5. SIMULATED POWER GRID FEED (45–90 SECONDS)
   * ========================================================================= */
  private scheduleNextPower(): void {
    if (!this.isRunning) return;
    const intervalMs = Math.floor(Math.random() * 45000) + 45000; // 45–90s

    if (this.powerTimer) clearTimeout(this.powerTimer);
    this.powerTimer = setTimeout(() => {
      const store = useAppStore.getState();
      if (!store.disabledFeedIds.includes('jvvnl-power-grid')) {
        try {
          const raw = this.powerGen.generateEvent();
          const event = normalizePowerEvent(raw);

          store.ingestEvents([event]);
          this.recordEventOccurrences('jvvnl-power-grid', 1);

          const prevFeed = store.feedStatuses.find((f) => f.feedId === 'jvvnl-power-grid');
          store.updateFeedStatus('jvvnl-power-grid', {
            status: 'live',
            lastHeartbeat: Date.now(),
            totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + 1,
          });
        } catch (err) {
          console.error('Error generating power event:', err);
        }
      }
      this.scheduleNextPower();
    }, intervalMs);
  }

  /* =========================================================================
   * 6. SIMULATED TRAFFIC POLICE & ITMS SURVEILLANCE FEED (15–35 SECONDS)
   * ========================================================================= */
  private scheduleNextTrafficPolice(): void {
    if (!this.isRunning) return;
    const intervalMs = Math.floor(Math.random() * 20000) + 15000; // 15–35s

    if (this.trafficTimer) clearTimeout(this.trafficTimer);
    this.trafficTimer = setTimeout(() => {
      const store = useAppStore.getState();
      if (!store.disabledFeedIds.includes('traffic-police-itms')) {
        try {
          const zone = JAIPUR_ZONES[Math.floor(Math.random() * JAIPUR_ZONES.length)];
          const items = [
            { en: 'ITMS Junction Bottleneck', hi: 'आईटीएमएस चौराहा बॉटलनेक दर्ज', sev: 'medium' as const },
            { en: 'Traffic Flow Regulation Active', hi: 'यातायात प्रवाह विनियमन सक्रिय', sev: 'low' as const },
            { en: 'CCTV Detected Arterial Slowdown', hi: 'सीसीटीवी निगरानी में मार्ग गति धीमी दर्ज', sev: 'medium' as const },
            { en: 'Commercial Vehicle Stoppage Tailback', hi: 'व्यावसायिक वाहन रुकने से कतारबद्ध दबाव', sev: 'high' as const },
          ];
          const chosen = items[Math.floor(Math.random() * items.length)];

          const event = {
            id: `evt-itms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            timestampIST: new Date().toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }) + ' IST',
            zoneId: zone.id,
            category: 'traffic' as const,
            severity: chosen.sev,
            titleEn: `${chosen.en} - ${zone.nameEn}`,
            titleHi: `${chosen.hi} - ${zone.nameHi}`,
            descriptionEn: `Automated traffic analytics identified vehicular buildup near ${zone.nameEn}.`,
            descriptionHi: `${zone.nameHi} में स्वचालित कैमरा विश्लेषण द्वारा यातायात घनत्व दर्ज।`,
            locationName: `${zone.nameEn} Arterial Junction`,
            coordinates: zone.center,
            source: 'traffic_camera' as const,
            status: 'active' as const,
            metadata: { origin: 'simulated' as const },
          };

          store.ingestEvents([event]);
          this.recordEventOccurrences('traffic-police-itms', 1);

          const prevFeed = store.feedStatuses.find((f) => f.feedId === 'traffic-police-itms');
          store.updateFeedStatus('traffic-police-itms', {
            status: 'live',
            lastHeartbeat: Date.now(),
            totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + 1,
          });
        } catch (err) {
          console.warn('Notice in ITMS feeder cycle:', err);
        }
      }
      this.scheduleNextTrafficPolice();
    }, intervalMs);
  }

  /* =========================================================================
   * 7. GOOGLE ROUTES API ROAD TRAFFIC (8 CORRIDORS, 10-MINUTE INTERVAL)
   * ========================================================================= */
  public async fetchRoadTraffic(): Promise<void> {
    if (typeof document !== 'undefined' && document.hidden) {
      console.log('[FeedManager] Tab hidden; pausing Google Routes API polling to conserve quota.');
      return;
    }

    const store = useAppStore.getState();
    const isSimulatedFailure = store.disabledFeedIds.includes('road-traffic-routes-api');

    this.lastTrafficPollTime = Date.now();

    if (isSimulatedFailure) {
      console.log('[FeedManager] Road traffic feed toggled to simulated failure; falling back to simulated traffic.');
      const fallbackPayloads = RoadTrafficFallbackGenerator.generateAllCorridors();
      const events = fallbackPayloads.map(normalizeRoadTrafficEvent);
      store.ingestEvents(events);
      this.recordEventOccurrences('road-traffic-routes-api', events.length);

      const prevFeed = store.feedStatuses.find((f) => f.feedId === 'road-traffic-routes-api');
      store.updateFeedStatus('road-traffic-routes-api', {
        status: 'fallback',
        origin: 'simulated_fallback',
        lastHeartbeat: Date.now(),
        totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
      });

      if (this.isRunning) {
        if (this.routesTrafficTimer) clearTimeout(this.routesTrafficTimer);
        this.routesTrafficTimer = setTimeout(() => this.fetchRoadTraffic(), ROUTES_POLL_INTERVAL_MS);
      }
      return;
    }

    try {
      const startTime = Date.now();
      const res = await fetch('/api/routes/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error(`Routes API proxy returned HTTP ${res.status}`);
      const data = await res.json();
      const latency = Date.now() - startTime;

      if (Array.isArray(data.corridors) && data.corridors.length > 0) {
        const events = data.corridors.map((payload: RawCorridorTrafficPayload) =>
          normalizeRoadTrafficEvent(payload)
        );

        store.ingestEvents(events);
        this.recordEventOccurrences('road-traffic-routes-api', events.length);

        const isLive = data.corridors[0]?.origin === 'live_api';
        const prevFeed = store.feedStatuses.find((f) => f.feedId === 'road-traffic-routes-api');
        store.updateFeedStatus('road-traffic-routes-api', {
          status: isLive ? 'live' : 'fallback',
          origin: isLive ? 'live_api' : 'simulated_fallback',
          latencyMs: latency,
          lastHeartbeat: Date.now(),
          totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
        });
      }
    } catch (err) {
      console.warn('[FeedManager] Routes API fetch notice; switching to simulated traffic generator:', err);
      const fallbackPayloads = RoadTrafficFallbackGenerator.generateAllCorridors();
      const events = fallbackPayloads.map(normalizeRoadTrafficEvent);
      store.ingestEvents(events);
      this.recordEventOccurrences('road-traffic-routes-api', events.length);

      const prevFeed = store.feedStatuses.find((f) => f.feedId === 'road-traffic-routes-api');
      store.updateFeedStatus('road-traffic-routes-api', {
        status: 'fallback',
        origin: 'simulated_fallback',
        lastHeartbeat: Date.now(),
        totalEventsIngested: (prevFeed?.totalEventsIngested || 0) + events.length,
      });
    }

    if (this.isRunning) {
      if (this.routesTrafficTimer) clearTimeout(this.routesTrafficTimer);
      this.routesTrafficTimer = setTimeout(() => this.fetchRoadTraffic(), ROUTES_POLL_INTERVAL_MS);
    }
  }
}
