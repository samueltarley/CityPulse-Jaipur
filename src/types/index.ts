/**
 * CityPulse Jaipur – Core Type Definitions
 * Shared types for Civic Events, Anomalies, Correlations, Zones, Transit, and UI State.
 */

export type UserRole = 'resident' | 'staff';
export type Language = 'en' | 'hi';
export type ThemeMode = 'day' | 'raat';

export type TabId = 'dashboard' | 'report' | 'public_help' | 'staff' | 'replay' | 'about';

export type EventOrigin = 'live_api' | 'simulated' | 'simulated_fallback';
export type FeedHealthStatus = 'live' | 'delayed' | 'offline' | 'fallback';

export type EventCategory =
  | 'traffic'
  | 'water'
  | 'air_quality'
  | 'sanitation'
  | 'transit'
  | 'crowd'
  | 'power';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EventSource =
  | 'iot_sensor'
  | 'metro_feed'
  | 'resident_report'
  | 'traffic_camera'
  | 'water_telemetry'
  | 'weather_station'
  | 'power_grid'
  | 'smart_city_ai';

export type EventStatus = 'active' | 'investigating' | 'mitigating' | 'resolved';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CivicEvent {
  id: string;
  timestamp: number;
  timestampIST?: string;
  zoneId: string;
  category: EventCategory;
  severity: EventSeverity;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  locationName: string;
  coordinates: Coordinates;
  source: EventSource;
  status: EventStatus;
  affectedRadiusMeters?: number;
  metadata?: {
    origin?: EventOrigin;
    rawPayload?: unknown;
    [key: string]: unknown;
  };
}

export type PulseBand = 'calm' | 'watch' | 'stressed' | 'critical';

export interface Correlation {
  id: string;
  eventIds: string[];
  zoneIds?: string[];
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number; // 0.0 to 1.0
  type: string;
  titleEn: string;
  titleHi: string;
  explanationEn: string;
  explanationHi: string;
  detectedAt: number;
  plausiblePair?: string;
  recommendedActionEn?: string;
  recommendedActionHi?: string;
}

export interface Anomaly {
  id: string;
  zoneId: string;
  source?: EventSource | string;
  category: EventCategory;
  metricNameEn: string;
  metricNameHi: string;
  baselineValue: number;
  currentValue: number;
  zScore?: number;
  deviationPercent: number;
  severity: EventSeverity;
  isThresholdBreach?: boolean;
  detectedAt: number;
  summaryEn: string;
  summaryHi: string;
}

export interface Cluster {
  id: string;
  zoneId: string;
  eventIds: string[];
  centroid: Coordinates;
  radiusMeters: number;
  theme: string;
  intensity: number; // 0 to 100
  dominantCategory: EventCategory;
  updatedAt: number;
}

export type AgentFlagSeverity = 'info' | 'warning' | 'critical';
export type AgentFlagAudience = 'residents' | 'city_staff' | 'both';
export type AgentConfidence = 'low' | 'medium' | 'high';
export type AgentFlagStatus = 'open' | 'dismissed' | 'acknowledged' | 'escalated';

export interface AgentFlag {
  id: string;
  flagType: string; // e.g. 'rain_waterlogging_transit', 'heat_power_strain', 'aqi_spike', 'grievance_cluster'
  zoneIds: string[];
  severity: AgentFlagSeverity;
  title: {
    en: string;
    hi: string;
  };
  reasoning: {
    en: string;
    hi: string;
  };
  evidenceEventIds: string[];
  suggestedAction: {
    en: string;
    hi: string;
  };
  audience: AgentFlagAudience;
  confidence: AgentConfidence;
  status: AgentFlagStatus;
  createdAt: number;
  timeLabel: string;
  dismissedAt?: number;
  dismissReason?: string;
  acknowledgedAt?: number;
  escalatedAt?: number;
  // Legacy / convenience fields
  flaggedBy?: string;
  reasonEn?: string;
  reasonHi?: string;
  urgency?: 'routine' | 'priority' | 'emergency';
  eventId?: string;
  timestamp?: number;
}

export interface AgentCycleLog {
  id: string;
  timestamp: number;
  timeLabel: string;
  phase: 'OBSERVE' | 'ANALYZE' | 'DECIDE' | 'FLAG' | 'IDLE';
  summaryLine: string;
  eventsObservedCount: number;
  correlationsCount: number;
  flagsRaisedCount: number;
  noActionReason?: string;
}

export interface AgentSnapshot {
  timestamp: number;
  eventsCount: number;
  zonePulses: Record<string, { score: number; band: string }>;
  activeAnomalies: Array<{ id: string; zoneId: string; metric: string; severity: string; summary: string }>;
  activeCorrelations: Array<{ id: string; pair: string; zones: string[]; confidence: string }>;
  activeClusters: Array<{ id: string; zoneId: string; theme: string; count: number }>;
  feedHealth: Record<string, string>;
  openResidentReports: Array<{ id: string; zoneId: string; category: string; title: string; landmark: string }>;
  openFlagsCount: number;
  dismissedFlagKeys: string[];
  candidateEvents: Array<{ id: string; zoneId: string; category: string; title: string; severity: string; location: string }>;
  nearbyEmergencyHelp?: Record<string, { hospital: string; hospitalDist: string; police: string }>;
}

export type ResidentReportStatus =
  | 'submitted'
  | 'considered'
  | 'acknowledged'
  | 'team_sent'
  | 'in_progress'
  | 'need_info'
  | 'resolved'
  | 'rejected'
  | 'triaged';

export interface ReportTimelineEntry {
  id: string;
  timestamp: number;
  status: ResidentReportStatus;
  messageEn: string;
  messageHi: string;
  team?: string;
  expectedTime?: string;
  staffName: string; // e.g. "STARKTECH"
}

export interface ResidentReport {
  id: string; // e.g. "JPR-2026-00123"
  timestamp: number;
  zoneId: string;
  category: EventCategory;
  rawCategory?: string;
  title: string;
  reason?: string; // Reason for report (किस बात के लिए रिपोर्ट है - in any language: Hindi, English, Hinglish, Rajasthani etc.)
  description: string;
  landmark: string;
  coordinates?: Coordinates;
  photoUrl?: string;
  upvotes: number;
  severity?: EventSeverity;
  status: ResidentReportStatus;
  resolutionNote?: string;
  resolvedAt?: number;
  acknowledgedAt?: number;
  teamSentAt?: number;
  inProgressAt?: number;
  isAnonymous: boolean;
  contactMasked?: string;
  assignedDepartment?: string;
  assignedTeam?: string;
  expectedTime?: string;
  timeline?: ReportTimelineEntry[];
  reportedByMe?: boolean;
}

export interface StaffThresholds {
  pulseAlertThreshold: number; // e.g., 50
  aqiAlertThreshold: number; // e.g., 200
  waterloggingAlertCount: number; // e.g., 3
  browserNotificationsEnabled: boolean;
  monitoredZoneIds: string[];
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  timestamp: number;
}

export interface LiveAlertToast {
  id: string;
  eventId: string;
  zoneId: string;
  category: EventCategory;
  severity: EventSeverity;
  areaNameEn: string;
  areaNameHi: string;
  shortTextEn: string;
  shortTextHi: string;
  timestamp: number;
}

export interface FeedStatus {
  feedId: string;
  nameEn: string;
  nameHi: string;
  category: EventCategory;
  status: FeedHealthStatus;
  origin: EventOrigin;
  lastHeartbeat: number;
  eventsPerMin: number;
  totalEventsIngested: number;
  latencyMs: number;
  sourceEndpoint: string;
  lastError?: string;
}

export interface ReplayTimelineMarker {
  id: string;
  timestamp: number;
  dayNumber: number;
  timeLabel: string;
  type: 'anomaly' | 'correlation' | 'scenario';
  scenarioKey: 'monsoon' | 'heatwave' | 'dust_storm' | 'festival';
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  zoneIds: string[];
  severity: EventSeverity;
}

export type DemoScenarioId =
  | 'monsoon_flood'
  | 'summer_heatwave'
  | 'dust_storm'
  | 'festival_procession'
  | 'diwali_smog'
  | 'industrial_pollution';

export interface DemoScenarioDefinition {
  id: DemoScenarioId;
  titleEn: string;
  titleHi: string;
  category: EventCategory;
  zones: string[];
  durationSeconds: number;
  descriptionEn: string;
  descriptionHi: string;
  iconName: string;
  weatherOverride?: {
    temperatureC?: number;
    rainMm?: number;
    precipitationMm?: number;
    pm10?: number;
    pm25?: number;
    aqi?: number;
    aqiCategory?: AQICategory;
    weatherDescEn?: string;
    weatherDescHi?: string;
    windSpeedKmh?: number;
    windGustsKmh?: number;
  };
}

export type AQICategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export interface ZoneWeatherAQI {
  zoneId: string;
  zoneNameEn: string;
  zoneNameHi: string;
  temperatureC: number;
  relativeHumidityPct: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  rainMm: number;
  weatherCode: number;
  weatherDescEn: string;
  weatherDescHi: string;
  weatherIcon: string;
  windSpeedKmh: number;
  windGustsKmh: number;
  pm25: number;
  pm10: number;
  aqi: number;
  aqiCategory: AQICategory;
  cpcbCategory?: string;
  aqiCategoryHi: string;
  subIndexPM25: number;
  subIndexPM10: number;
  dominantPollutant: 'PM2.5' | 'PM10';
  lastUpdated: number;
  origin: EventOrigin;
}

export interface Zone {
  id: string;
  nameEn: string;
  nameHi: string;
  code: string;
  center: Coordinates;
  bounds: [Coordinates, Coordinates]; // southwest, northeast
  adjacentZoneIds: string[];
  populationWeight: number; // 0.05 to 0.25
  areaSqKm: number;
  descriptionEn: string;
  descriptionHi: string;
  keyLandmarks: string[];
  wardNumbers: number[];
}

export interface MetroStation {
  id: string;
  nameEn: string;
  nameHi: string;
  stationNumber: number;
  coordinates: Coordinates;
  zoneId: string;
  isInterchange: boolean;
  line: 'pink';
}

export interface BusCorridor {
  id: string;
  nameEn: string;
  nameHi: string;
  routeCode: string;
  zoneIds: string[];
  startPoint: string;
  endPoint: string;
  frequencyMinutes: number;
  dailyRidershipApprox: number;
}

export interface PulseThresholds {
  optimalMin: number; // >= 80 (Good/Healthy)
  moderateMin: number; // >= 55 (Moderate)
  elevatedMin: number; // >= 35 (Elevated stress)
  criticalMin: number; // < 35 (Critical)
}

export interface PulseWeights {
  traffic: number;
  water: number;
  airQuality: number;
  sanitation: number;
  transit: number;
  crowd: number;
  power: number;
}

export interface ZonePulseDetail {
  zoneId: string;
  score: number;
  band: PulseBand;
  trend: 'improving' | 'stable' | 'deteriorating';
  subscores: {
    weather: number;
    aqi: number;
    transit: number;
    complaints: number;
    power: number;
  };
  isPartialData: boolean;
  activeWeights: {
    weather: number;
    aqi: number;
    transit: number;
    complaints: number;
    power: number;
  };
  history: number[]; // Rolling sparkline points
  topIssueEn?: string;
  topIssueHi?: string;
}

export interface PulseHistoryPoint {
  timestamp: number;
  timeLabel: string;
  cityScore: number;
  zoneScores: Record<string, number>;
}

export interface PulseMetrics {
  cityScore: number; // 0-100 (100 is best)
  status: 'optimal' | 'moderate' | 'elevated' | 'critical';
  band: PulseBand;
  trend: 'improving' | 'stable' | 'deteriorating';
  categoryScores: Record<EventCategory, number>;
  zoneScores: Record<string, number>;
  zoneDetails: Record<string, ZonePulseDetail>;
  pulseHistory: PulseHistoryPoint[];
  activeIncidentsCount: number;
  lastCalculatedAt: number;
  summaryEn: string;
  summaryHi: string;
}

export interface AISummary {
  en: string;
  hi: string;
  generatedAt: number;
  timeLabel: string;
  isFallback?: boolean;
}

export interface SummaryNormalizedPayload {
  scope: 'citywide' | 'zone';
  zoneId?: string;
  zoneNameEn?: string;
  zoneNameHi?: string;
  pulseScore: number;
  band: PulseBand;
  trend?: string;
  zoneScoresSummary?: Record<string, { score: number; band: string; topIssue?: string }>;
  subscores?: {
    weather: number;
    aqi: number;
    transit: number;
    complaints: number;
    power: number;
  };
  weather?: {
    temperatureC: number;
    feelsLikeC: number;
    humidityPct: number;
    rainMm: number;
    windKmh: number;
    aqi: number;
    aqiCategory: string;
    description: string;
  };
  isPartialData?: boolean;
  topAnomalies: Array<{
    metric: string;
    zoneName: string;
    severity: string;
    summaryEn: string;
    isThresholdAnomaly?: boolean;
  }>;
  activeCorrelations: Array<{
    plausiblePair: string;
    explanationEn: string;
    confidence: string;
    zones: string[];
  }>;
  activeClusters: Array<{
    theme: string;
    count: number;
    zoneName: string;
  }>;
  feedHealth: Record<string, { status: string; isSimulatedFallback: boolean }>;
  recentNotableEvents: Array<{
    category: string;
    titleEn: string;
    locationName: string;
    severity: string;
    timeAgoMinutes: number;
  }>;
}
