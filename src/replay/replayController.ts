/**
 * CityPulse Jaipur – Historical Replay Controller (Spec 8.5)
 *
 * Controls playback, scrubbing, speed toggles (10x, 60x, 360x), and live-snapshot
 * recalculations across the entire 7-day seeded dataset.
 */

import { useAppStore } from '../store/useAppStore';
import { get7DayReplayDataset, SeededReplayDataset, ONE_DAY_MS } from './seededGenerator';
import { calculateAllPulseScores } from '../engine/pulseScore';
import { detectAnomalies } from '../engine/anomaly';
import { detectCorrelations } from '../engine/correlation';
import { detectClusters } from '../engine/clustering';
import {
  CivicEvent,
  Correlation,
  Anomaly,
  Cluster,
  PulseMetrics,
  ZoneWeatherAQI,
  ReplayTimelineMarker,
} from '../types';

interface SavedLiveState {
  events: CivicEvent[];
  pulseMetrics: PulseMetrics;
  correlations: Correlation[];
  anomalies: Anomaly[];
  clusters: Cluster[];
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>;
}

export class ReplayController {
  private static instance: ReplayController | null = null;
  private dataset: SeededReplayDataset | null = null;
  private savedLiveState: SavedLiveState | null = null;
  private playTimer: NodeJS.Timeout | null = null;

  public static getInstance(): ReplayController {
    if (!ReplayController.instance) {
      ReplayController.instance = new ReplayController();
    }
    return ReplayController.instance;
  }

  public getDataset(): SeededReplayDataset {
    if (!this.dataset) {
      this.dataset = get7DayReplayDataset();
    }
    return this.dataset;
  }

  /**
   * Enter 7-Day Replay Mode
   */
  public enterReplayMode(initialTimestamp?: number) {
    const store = useAppStore.getState();
    const dataset = this.getDataset();

    // 1. Save live snapshot if not already saved
    if (!this.savedLiveState) {
      this.savedLiveState = {
        events: [...store.events],
        pulseMetrics: { ...store.pulseMetrics },
        correlations: [...store.correlations],
        anomalies: [...store.anomalies],
        clusters: [...store.clusters],
        zoneWeatherAQI: { ...store.zoneWeatherAQI },
      };
    }

    const startTs = initialTimestamp || dataset.timelineMarkers[0]?.timestamp || (dataset.startTimestamp + ONE_DAY_MS);

    useAppStore.setState({
      isReplayMode: true,
      replayCurrentTimestamp: startTs,
      replayStartTimestamp: dataset.startTimestamp,
      replayEndTimestamp: dataset.endTimestamp,
      replaySpeed: 60,
      isReplayPlaying: false,
      replayTimelineMarkers: dataset.timelineMarkers,
    });

    this.applySnapshotAtTimestamp(startTs);

    store.addToast({
      title: 'Entered 7-Day Replay Mode',
      message: 'Dashboard is now running on deterministic historical telemetry.',
      type: 'info',
    });
  }

  /**
   * Exit Replay Mode and restore live telemetry
   */
  public exitReplayMode() {
    this.pause();

    const store = useAppStore.getState();
    if (this.savedLiveState) {
      useAppStore.setState({
        events: this.savedLiveState.events,
        pulseMetrics: this.savedLiveState.pulseMetrics,
        correlations: this.savedLiveState.correlations,
        anomalies: this.savedLiveState.anomalies,
        clusters: this.savedLiveState.clusters,
        zoneWeatherAQI: this.savedLiveState.zoneWeatherAQI,
        isReplayMode: false,
        isReplayPlaying: false,
      });
      this.savedLiveState = null;
    } else {
      useAppStore.setState({
        isReplayMode: false,
        isReplayPlaying: false,
      });
    }

    store.addToast({
      title: 'Restored Live Telemetry',
      message: 'Returned to live municipal streams and sensors.',
      type: 'success',
    });
  }

  /**
   * Scrub to a specific timestamp across the 7-day range
   */
  public scrubTo(timestamp: number) {
    const dataset = this.getDataset();
    const clamped = Math.max(dataset.startTimestamp, Math.min(dataset.endTimestamp, timestamp));
    useAppStore.setState({ replayCurrentTimestamp: clamped });
    this.applySnapshotAtTimestamp(clamped);
  }

  /**
   * Toggle Play / Pause
   */
  public togglePlay() {
    const store = useAppStore.getState();
    if (store.isReplayPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play() {
    if (this.playTimer) clearInterval(this.playTimer);
    useAppStore.setState({ isReplayPlaying: true });

    const TICK_MS = 500;
    this.playTimer = setInterval(() => {
      const state = useAppStore.getState();
      if (!state.isReplayMode || !state.isReplayPlaying) {
        this.pause();
        return;
      }

      const dataset = this.getDataset();
      const advanceMs = (TICK_MS * state.replaySpeed);
      let nextTs = state.replayCurrentTimestamp + advanceMs;

      if (nextTs >= dataset.endTimestamp) {
        nextTs = dataset.startTimestamp; // loop around
      }

      useAppStore.setState({ replayCurrentTimestamp: nextTs });
      this.applySnapshotAtTimestamp(nextTs);
    }, TICK_MS);
  }

  public pause() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    useAppStore.setState({ isReplayPlaying: false });
  }

  public setSpeed(speed: 10 | 60 | 360) {
    useAppStore.setState({ replaySpeed: speed });
  }

  /**
   * Apply replay snapshot at given timestamp:
   * Recalculates weather, events window, pulse, anomalies, correlations, and clusters
   */
  public applySnapshotAtTimestamp(timestamp: number) {
    const dataset = this.getDataset();
    const store = useAppStore.getState();

    // Determine day (1 to 7)
    const elapsed = timestamp - dataset.startTimestamp;
    const dayIndex = Math.min(7, Math.max(1, Math.floor(elapsed / ONE_DAY_MS) + 1));

    // Get weather for this day
    const dayWeather = dataset.dayWeatherSnapshots[dayIndex] || store.zoneWeatherAQI;

    // Rolling window of events up to timestamp (events in past 2 hours)
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const windowStart = timestamp - TWO_HOURS_MS;
    const currentWindowEvents = dataset.events.filter(
      (e) => e.timestamp <= timestamp && e.timestamp >= windowStart
    );

    // Compute Engine state
    const pulse = calculateAllPulseScores(
      currentWindowEvents,
      dayWeather,
      store.feedStatuses,
      store.disabledFeedIds,
      store.pulseMetrics.pulseHistory
    );
    const anomalies = detectAnomalies(currentWindowEvents, dayWeather, timestamp);
    const correlations = detectCorrelations(anomalies, currentWindowEvents, dayWeather, timestamp);
    const clusters = detectClusters(currentWindowEvents, timestamp);

    useAppStore.setState({
      events: currentWindowEvents,
      zoneWeatherAQI: dayWeather,
      pulseMetrics: pulse,
      anomalies,
      correlations,
      clusters,
    });
  }
}

export const replayController = ReplayController.getInstance();
