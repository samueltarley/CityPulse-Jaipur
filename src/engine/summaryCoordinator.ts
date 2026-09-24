/**
 * AI Summary Coordinator for CityPulse Jaipur (Spec 6.1).
 * Coordinates:
 * - 60-second periodic refresh
 * - Trigger on Pulse band change
 * - Trigger on new correlation emergence
 * - Manual on-demand refresh
 * - Mutex guard against overlapping requests
 */

import { useAppStore } from '../store/useAppStore';
import { PulseBand } from '../types';
import {
  buildCitywideNormalizedPayload,
  buildZoneNormalizedPayload,
  requestAISummary,
} from '../services/gemini';

class SummaryCoordinator {
  private static instance: SummaryCoordinator | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isCityRequestInFlight = false;
  private inFlightZones = new Set<string>();

  private prevBand: PulseBand | null = null;
  private prevCorrelationFingerprint = '';
  private isStarted = false;
  private unsubscribe: (() => void) | null = null;
  private initTimer: NodeJS.Timeout | null = null;

  public static getInstance(): SummaryCoordinator {
    if (!SummaryCoordinator.instance) {
      SummaryCoordinator.instance = new SummaryCoordinator();
    }
    return SummaryCoordinator.instance;
  }

  public start() {
    if (this.isStarted) return;
    this.isStarted = true;

    const store = useAppStore.getState();
    this.prevBand = store.pulseMetrics.band;
    this.prevCorrelationFingerprint = store.correlations.map((c) => c.id).join('|');

    // Generate initial live city summary shortly after startup
    if (this.initTimer) clearTimeout(this.initTimer);
    this.initTimer = setTimeout(() => {
      this.refreshCitySummary();
    }, 1500);

    // 60-second periodic timer
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.refreshCitySummary();
    }, 60000);

    // Subscribe to store updates for band change and new correlations
    this.unsubscribe = useAppStore.subscribe((state) => {
      const currentBand = state.pulseMetrics.band;
      const currentCorrFingerprint = state.correlations.map((c) => c.id).join('|');

      // Trigger on band change
      if (this.prevBand && this.prevBand !== currentBand) {
        console.log(`[SummaryCoordinator] Band changed from ${this.prevBand} to ${currentBand}. Refreshing city summary.`);
        this.prevBand = currentBand;
        this.refreshCitySummary();
      } else if (!this.prevBand) {
        this.prevBand = currentBand;
      }

      // Trigger on new correlation detected
      if (currentCorrFingerprint !== this.prevCorrelationFingerprint) {
        console.log('[SummaryCoordinator] New correlation detected. Refreshing city summary.');
        this.prevCorrelationFingerprint = currentCorrFingerprint;
        this.refreshCitySummary();
      }
    });
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isStarted = false;
  }

  /**
   * Refreshes citywide AI summary.
   * Ensures non-overlapping execution via isCityRequestInFlight guard.
   */
  public async refreshCitySummary(): Promise<void> {
    if (this.isCityRequestInFlight) {
      console.log('[SummaryCoordinator] City summary generation already in flight. Skipping overlapping request.');
      return;
    }

    this.isCityRequestInFlight = true;
    const store = useAppStore.getState();
    store.setIsGeneratingCitySummary(true);

    try {
      const payload = buildCitywideNormalizedPayload(
        store.pulseMetrics,
        store.anomalies,
        store.correlations,
        store.clusters,
        store.feedStatuses,
        store.events
      );

      const summary = await requestAISummary(payload);
      useAppStore.getState().setCitySummary(summary);
    } catch (err) {
      console.warn('[SummaryCoordinator] Notice while refreshing city summary:', err);
    } finally {
      this.isCityRequestInFlight = false;
      useAppStore.getState().setIsGeneratingCitySummary(false);
    }
  }

  /**
   * Refreshes zone-specific AI summary.
   * Ensures non-overlapping execution per zone via inFlightZones set.
   */
  public async refreshZoneSummary(zoneId: string): Promise<void> {
    if (this.inFlightZones.has(zoneId)) {
      console.log(`[SummaryCoordinator] Summary generation for zone ${zoneId} already in flight. Skipping.`);
      return;
    }

    this.inFlightZones.add(zoneId);
    const store = useAppStore.getState();
    store.setIsGeneratingZoneSummary(zoneId, true);

    try {
      const payload = buildZoneNormalizedPayload(
        zoneId,
        store.pulseMetrics,
        store.zoneWeatherAQI,
        store.anomalies,
        store.correlations,
        store.clusters,
        store.feedStatuses,
        store.events
      );

      const summary = await requestAISummary(payload);
      useAppStore.getState().setZoneSummary(zoneId, summary);
    } catch (err) {
      console.warn(`[SummaryCoordinator] Notice while refreshing zone summary for ${zoneId}:`, err);
    } finally {
      this.inFlightZones.delete(zoneId);
      useAppStore.getState().setIsGeneratingZoneSummary(zoneId, false);
    }
  }
}

export const summaryCoordinator = SummaryCoordinator.getInstance();
