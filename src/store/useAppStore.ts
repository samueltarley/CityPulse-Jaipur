import { create } from 'zustand';
import {
  UserRole,
  ThemeMode,
  TabId,
  CivicEvent,
  Correlation,
  Anomaly,
  Cluster,
  AgentFlag,
  ResidentReport,
  ResidentReportStatus,
  ReportTimelineEntry,
  FeedStatus,
  PulseMetrics,
  ZoneWeatherAQI,
  PulseHistoryPoint,
  ZonePulseDetail,
  AISummary,
  AgentCycleLog,
  StaffThresholds,
  ToastNotification,
  LiveAlertToast,
  ReplayTimelineMarker,
  DemoScenarioId,
} from '../types';
import { calculateCityPulse, getPulseBand } from '../engine/pulseScore';
import { detectAnomalies } from '../engine/anomaly';
import { detectCorrelations } from '../engine/correlation';
import { detectGrievanceClusters } from '../engine/clustering';
import { JAIPUR_ZONES } from '../config/city';
import { getShortProblemText } from '../utils/alertUtils';

const MAX_EVENT_STORE_SIZE = 3000;

export function deduplicateEvents(events: CivicEvent[]): CivicEvent[] {
  const result: CivicEvent[] = [];
  const FIFTEEN_MINS_MS = 15 * 60 * 1000;

  for (const evt of events) {
    const isDuplicate = result.some((existing) => {
      const sameSource = existing.source === evt.source;
      const sameZone = existing.zoneId === evt.zoneId;
      const sameTitle = existing.titleEn.trim().toLowerCase() === evt.titleEn.trim().toLowerCase();
      const within15Mins = Math.abs(existing.timestamp - evt.timestamp) < FIFTEEN_MINS_MS;
      return (existing.id === evt.id) || (sameSource && sameZone && sameTitle && within15Mins);
    });

    if (!isDuplicate) {
      result.push(evt);
    }
  }

  return result;
}

interface AppState {
  // Roles & View
  role: UserRole;
  activeTab: TabId;
  theme: ThemeMode;
  selectedZoneId: string | null;
  userMyAreaZoneId: string;
  isStaffAuthModalOpen: boolean;
  staffUsername: string | null;

  // Live Alerts Box & Toasts
  isLiveAlertsOpen: boolean;
  isLiveAlertsMinimized: boolean;
  isAlertToastsMuted: boolean;
  liveAlertToasts: LiveAlertToast[];
  lastToastHistory: Record<string, number>;
  unreadAlertsCount: number;

  // Pulse & Metrics
  pulseMetrics: PulseMetrics;

  // Real-time feeds & weather/AQI
  zoneWeatherAQI: Record<string, ZoneWeatherAQI>;
  feedStatuses: FeedStatus[];
  disabledFeedIds: string[];

  // Data Collections (capped at 3000 events)
  events: CivicEvent[];
  correlations: Correlation[];
  anomalies: Anomaly[];
  clusters: Cluster[];
  agentFlags: AgentFlag[];
  residentReports: ResidentReport[];

  // Staff Thresholds & Toasts
  staffThresholds: StaffThresholds;
  toasts: ToastNotification[];

  // AI Summaries (Spec 6.1)
  citySummary: AISummary | null;
  zoneSummaries: Record<string, AISummary>;
  isGeneratingCitySummary: boolean;
  isGeneratingZoneSummary: Record<string, boolean>;

  // Nabz Agent State (Spec 6.2)
  dismissedFlagKeys: string[];
  agentCycleLogs: AgentCycleLog[];
  isAgentRunning: boolean;
  isAgentThinking: boolean;
  highlightedEventIds: string[];

  // Historical Replay & Demo (Spec 8.5)
  isReplayMode: boolean;
  replayCurrentTimestamp: number;
  replayStartTimestamp: number;
  replayEndTimestamp: number;
  replaySpeed: 10 | 60 | 360;
  isReplayPlaying: boolean;
  replayTimelineMarkers: ReplayTimelineMarker[];
  activeDemoScenarioId: DemoScenarioId | null;

  // Actions
  setRole: (role: UserRole) => void;
  setIsStaffAuthModalOpen: (open: boolean) => void;
  setStaffUsername: (username: string | null) => void;
  setActiveTab: (tab: TabId) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setUserMyAreaZoneId: (zoneId: string) => void;
  setPulseScore: (score: number) => void;
  recomputeAnalytics: () => void;
  
  // Replay & Demo actions
  setIsReplayMode: (isReplay: boolean) => void;
  setReplayCurrentTimestamp: (ts: number) => void;
  setReplaySpeed: (speed: 10 | 60 | 360) => void;
  setIsReplayPlaying: (playing: boolean) => void;
  setActiveDemoScenarioId: (id: DemoScenarioId | null) => void;

  // Live Alerts actions
  toggleLiveAlerts: () => void;
  setIsLiveAlertsOpen: (open: boolean) => void;
  setIsLiveAlertsMinimized: (minimized: boolean) => void;
  toggleAlertToastsMuted: () => void;
  dismissLiveToast: (id: string) => void;
  clearUnreadAlerts: () => void;
  
  // Feed ingestion & state updates
  ingestEvents: (newEvents: CivicEvent[]) => void;
  setEvents: (events: CivicEvent[]) => void;
  updateFeedStatus: (feedId: string, updates: Partial<FeedStatus>) => void;
  toggleFeedDisabled: (feedId: string) => void;
  updateZoneWeatherAQI: (updates: Record<string, Partial<ZoneWeatherAQI>>) => void;
  addResidentReport: (report: ResidentReport) => void;
  updateReportStatus: (
    reportId: string,
    status: ResidentReportStatus,
    optionsOrNote?: string | {
      note?: string;
      messageEn?: string;
      messageHi?: string;
      team?: string;
      expectedTime?: string;
      staffName?: string;
    }
  ) => void;
  addReportReply: (
    reportId: string,
    reply: {
      messageEn: string;
      messageHi?: string;
      status?: ResidentReportStatus;
      team?: string;
      expectedTime?: string;
      staffName?: string;
    }
  ) => void;
  bulkUpdateReports: (
    reportIds: string[],
    status: ResidentReportStatus,
    options?: {
      note?: string;
      messageEn?: string;
      messageHi?: string;
      team?: string;
      expectedTime?: string;
      staffName?: string;
    }
  ) => void;

  // Staff Thresholds & Notifications
  setStaffThresholds: (thresholds: Partial<StaffThresholds>) => void;
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;

  // AI Summary Actions
  setCitySummary: (summary: AISummary) => void;
  setZoneSummary: (zoneId: string, summary: AISummary) => void;
  setIsGeneratingCitySummary: (val: boolean) => void;
  setIsGeneratingZoneSummary: (zoneId: string, val: boolean) => void;

  // Nabz Agent Actions
  addAgentFlags: (flags: AgentFlag[]) => void;
  dismissAgentFlag: (flagId: string) => void;
  dismissAgentFlagWithReason: (flagId: string, reason: string) => void;
  acknowledgeAgentFlag: (flagId: string) => void;
  escalateAgentFlag: (flagId: string) => void;
  setHighlightedEventIds: (ids: string[]) => void;
  setIsAgentRunning: (running: boolean) => void;
  setIsAgentThinking: (thinking: boolean) => void;
  addAgentCycleLog: (log: AgentCycleLog) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  // Initialize theme from storage or system preference
  const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('citypulse_theme')) as ThemeMode || 'day';

  if (typeof document !== 'undefined') {
    if (savedTheme === 'raat') {
      document.documentElement.classList.add('raat');
    } else {
      document.documentElement.classList.remove('raat');
    }
  }

  const initialFeedStatuses: FeedStatus[] = [
    {
      feedId: 'open-meteo-weather',
      nameEn: 'Open-Meteo Multi-Zone Weather API',
      nameHi: 'ओपन-मेटियो बहु-क्षेत्रीय मौसम एपीआई',
      category: 'water',
      status: 'live',
      origin: 'live_api',
      lastHeartbeat: Date.now(),
      eventsPerMin: 0,
      totalEventsIngested: 0,
      latencyMs: 0,
      sourceEndpoint: 'https://api.open-meteo.com/v1/forecast',
    },
    {
      feedId: 'open-meteo-air-quality',
      nameEn: 'Open-Meteo CPCB Air Quality API',
      nameHi: 'ओपन-मेटियो सीपीसीबी वायु गुणवत्ता एपीआई',
      category: 'air_quality',
      status: 'live',
      origin: 'live_api',
      lastHeartbeat: Date.now(),
      eventsPerMin: 0,
      totalEventsIngested: 0,
      latencyMs: 0,
      sourceEndpoint: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    },
    {
      feedId: 'jmrc-transit-telemetry',
      nameEn: 'JMRC Pink Line & JCTSL Bus Transit Telemetry',
      nameHi: 'पिंक लाइन मेट्रो व जेसीटीएसएल बस आवागमन टेलीमेट्री',
      category: 'transit',
      status: 'live',
      origin: 'simulated',
      lastHeartbeat: Date.now(),
      eventsPerMin: 0,
      totalEventsIngested: 0,
      latencyMs: 25,
      sourceEndpoint: 'jmrc://feed.pinkline.jaipur/stations',
    },
    {
      feedId: 'citizen-complaints-stream',
      nameEn: 'Citizen Grievance Stream (Sampark 181)',
      nameHi: 'नागरिक शिकायत प्रवाह (संपर्क 181)',
      category: 'sanitation',
      status: 'live',
      origin: 'simulated',
      lastHeartbeat: Date.now(),
      eventsPerMin: 0,
      totalEventsIngested: 0,
      latencyMs: 30,
      sourceEndpoint: 'sampark://rajasthan.gov.in/grievances/jaipur',
    },
    {
      feedId: 'jvvnl-power-grid',
      nameEn: 'JVVNL Power Grid & Feeder SCADA',
      nameHi: 'जयपुर डिस्कॉम 33/11kV फीडर स्काडा',
      category: 'power',
      status: 'live',
      origin: 'simulated',
      lastHeartbeat: Date.now(),
      eventsPerMin: 0,
      totalEventsIngested: 0,
      latencyMs: 40,
      sourceEndpoint: 'jvvnl://scada.discom.rajasthan/feeders',
    },
    {
      feedId: 'traffic-police-itms',
      nameEn: 'Jaipur Traffic Police ITMS Feeder',
      nameHi: 'जयपुर यातायात पुलिस व आईटीएमएस फीडर',
      category: 'traffic',
      status: 'live',
      origin: 'simulated',
      lastHeartbeat: Date.now(),
      eventsPerMin: 3,
      totalEventsIngested: 16,
      latencyMs: 22,
      sourceEndpoint: 'itms://jaipur.rajasthan.police.gov.in/telemetry',
    },
    {
      feedId: 'road-traffic-routes-api',
      nameEn: 'Google Routes API Traffic Telemetry (8 Corridors)',
      nameHi: 'गूगल रूट्स एपीआई सड़क यातायात टेलीमेट्री (8 मुख्य मार्ग)',
      category: 'traffic',
      status: 'live',
      origin: 'live_api',
      lastHeartbeat: Date.now(),
      eventsPerMin: 1,
      totalEventsIngested: 8,
      latencyMs: 145,
      sourceEndpoint: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    },
  ];

  // Seed initial 12 history points spanning the past 2 hours
  const now = Date.now();
  const initialHistory: PulseHistoryPoint[] = [];
  const baseScores: Record<string, number> = {
    'walled-city': 72,
    mansarovar: 85,
    'malviya-nagar': 78,
    'vaishali-nagar': 82,
    'raja-park': 76,
    sanganer: 80,
    amer: 74,
    jagatpura: 87,
    'cscheme-civillines': 84,
  };

  for (let i = 11; i >= 0; i--) {
    const t = now - i * 10 * 60 * 1000;
    const timeLabel = new Date(t).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    });
    const zonePtScores: Record<string, number> = {};
    let weightedSum = 0;
    JAIPUR_ZONES.forEach((z) => {
      // gentle historical variation
      const jitter = Math.sin((i + z.code.length) * 0.7) * 3;
      const score = Math.round(Math.max(50, Math.min(96, (baseScores[z.id] || 78) + jitter)));
      zonePtScores[z.id] = score;
      weightedSum += score * z.populationWeight;
    });

    initialHistory.push({
      timestamp: t,
      timeLabel,
      cityScore: Math.round(weightedSum),
      zoneScores: zonePtScores,
    });
  }

  // Initial zone details
  const initialZoneDetails: Record<string, ZonePulseDetail> = {};
  JAIPUR_ZONES.forEach((zone) => {
    const score = baseScores[zone.id] || 78;
    const band = getPulseBand(score);
    initialZoneDetails[zone.id] = {
      zoneId: zone.id,
      score,
      band,
      trend: 'stable',
      subscores: {
        weather: 88,
        aqi: 76,
        transit: 82,
        complaints: 80,
        power: 90,
      },
      isPartialData: false,
      activeWeights: {
        weather: 0.2,
        aqi: 0.2,
        transit: 0.2,
        complaints: 0.25,
        power: 0.15,
      },
      history: initialHistory.map((h) => h.zoneScores[zone.id] ?? score),
      topIssueEn: score < 75 ? 'Transit Crawl & Delays' : 'Optimal Rhythm',
      topIssueHi: score < 75 ? 'परिवहन व मेट्रो विलंब' : 'सामान्य प्रवाह',
    };
  });

  const cityScore = 79;
  const initialPulseMetrics: PulseMetrics = {
    cityScore,
    status: 'optimal',
    band: getPulseBand(cityScore),
    trend: 'stable',
    categoryScores: {
      traffic: 78,
      water: 85,
      air_quality: 74,
      sanitation: 82,
      transit: 84,
      crowd: 78,
      power: 90,
    },
    zoneScores: baseScores,
    zoneDetails: initialZoneDetails,
    pulseHistory: initialHistory,
    activeIncidentsCount: 0,
    lastCalculatedAt: now,
    summaryEn: 'Pink City is operating in Calm rhythm (79/100); all vital grids, Pink Line metro, and civic services are flowing smoothly.',
    summaryHi: 'गुलाबी नगरी शांत प्रवाह में है (79/100); मेट्रो, विद्युत ग्रिड और नागरिक सेवाएं सुचारू रूप से संचालित हैं।',
  };

  return {
    role: 'resident',
    activeTab: 'dashboard',
    theme: savedTheme,
    selectedZoneId: null,
    userMyAreaZoneId: 'mansarovar',
    isStaffAuthModalOpen: false,
    staffUsername: null,

    pulseMetrics: initialPulseMetrics,

    zoneWeatherAQI: {},
    feedStatuses: initialFeedStatuses,

    disabledFeedIds: [],
    toasts: [],
    isLiveAlertsOpen: false,
    isLiveAlertsMinimized: false,
    isAlertToastsMuted: false,
    liveAlertToasts: [],
    lastToastHistory: {},
    unreadAlertsCount: 0,
    staffThresholds: {
      pulseAlertThreshold: 50,
      aqiAlertThreshold: 200,
      waterloggingAlertCount: 3,
      browserNotificationsEnabled: false,
      monitoredZoneIds: JAIPUR_ZONES.map((z) => z.id),
    },

    events: [],
    correlations: [],
    anomalies: [],
    clusters: [],
    agentFlags: [],
    residentReports: [
      {
        id: 'JPR-2026-00089',
        timestamp: now - 35 * 60 * 1000,
        zoneId: 'walled-city',
        category: 'sanitation',
        rawCategory: 'garbage',
        title: 'Garbage Dump Accumulation',
        description: 'Secondary garbage container overflowing near Johari Bazar crossroad, spreading into roadway.',
        landmark: 'Johari Bazar, near Badi Chaupar',
        coordinates: { lat: 26.9239, lng: 75.8267 },
        severity: 'high',
        status: 'in_progress',
        isAnonymous: true,
        upvotes: 6,
        assignedDepartment: 'Jaipur Municipal Corporation (Heritage)',
        assignedTeam: 'JMC Sanitation',
        expectedTime: '4 hrs',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-1',
            timestamp: now - 35 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-2',
            timestamp: now - 28 * 60 * 1000,
            status: 'considered',
            messageEn: 'We have received your complaint and it is under review.',
            messageHi: 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-3',
            timestamp: now - 20 * 60 * 1000,
            status: 'team_sent',
            messageEn: 'A JMC Sanitation team has been sent to solve the problem. Expected time: 4 hrs.',
            messageHi: 'समस्या के समाधान के लिए JMC Sanitation टीम भेज दी गई है। अपेक्षित समय: 4 hrs।',
            team: 'JMC Sanitation',
            expectedTime: '4 hrs',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-4',
            timestamp: now - 10 * 60 * 1000,
            status: 'in_progress',
            messageEn: 'Work has started on your complaint.',
            messageHi: 'आपकी शिकायत पर कार्य प्रारंभ हो चुका है।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00092',
        timestamp: now - 45 * 60 * 1000,
        zoneId: 'sanganer',
        category: 'water',
        rawCategory: 'waterlogging',
        title: 'Underpass Severe Waterlogging',
        description: 'Rainwater stagnation up to 1.5 feet beneath Sanganer railway underpass restricting light vehicular movement.',
        landmark: 'Sanganer Railway Crossing Underpass',
        coordinates: { lat: 26.8167, lng: 75.7833 },
        severity: 'critical',
        status: 'team_sent',
        isAnonymous: true,
        upvotes: 12,
        assignedDepartment: 'PHED & JMC Drainage Wing',
        assignedTeam: 'PHED Water',
        expectedTime: '1 hr',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-10',
            timestamp: now - 45 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-11',
            timestamp: now - 30 * 60 * 1000,
            status: 'considered',
            messageEn: 'We have received your complaint and it is under review.',
            messageHi: 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-12',
            timestamp: now - 15 * 60 * 1000,
            status: 'team_sent',
            messageEn: 'A PHED Water team has been sent to solve the problem. Expected time: 1 hr.',
            messageHi: 'समस्या के समाधान के लिए PHED Water टीम भेज दी गई है। अपेक्षित समय: 1 hr।',
            team: 'PHED Water',
            expectedTime: '1 hr',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00095',
        timestamp: now - 70 * 60 * 1000,
        zoneId: 'vaishali-nagar',
        category: 'traffic',
        rawCategory: 'pothole',
        title: 'Deep Asphalt Pothole on Amrapali Marg',
        description: 'Hazardous cave-in and potholes on the left carriage way causing two-wheeler skids.',
        landmark: 'Near National Handloom, Amrapali Marg',
        coordinates: { lat: 26.9067, lng: 75.7412 },
        severity: 'medium',
        status: 'submitted',
        isAnonymous: true,
        upvotes: 4,
        assignedDepartment: 'Jaipur Development Authority (JDA)',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-20',
            timestamp: now - 70 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00078',
        timestamp: now - 180 * 60 * 1000,
        zoneId: 'raja-park',
        category: 'power',
        rawCategory: 'streetlight',
        title: 'Streetlights Inoperative on Lane 4',
        description: 'Continuous blackout of 5 street lamp poles creating safety concerns after 8 PM.',
        landmark: 'Dhruv Marg, Lane 4, Raja Park',
        coordinates: { lat: 26.8967, lng: 75.8344 },
        severity: 'low',
        status: 'resolved',
        resolutionNote: 'JVVNL Luminaire Maintenance crew replaced blown capacitor and verified illumination at 22:15.',
        resolvedAt: now - 40 * 60 * 1000,
        isAnonymous: true,
        upvotes: 2,
        assignedDepartment: 'JVVNL Street Lighting Cell',
        assignedTeam: 'JVVNL Power',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-30',
            timestamp: now - 180 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-31',
            timestamp: now - 120 * 60 * 1000,
            status: 'considered',
            messageEn: 'We have received your complaint and it is under review.',
            messageHi: 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-32',
            timestamp: now - 75 * 60 * 1000,
            status: 'team_sent',
            messageEn: 'A JVVNL Power team has been sent to solve the problem. Expected time: Today.',
            messageHi: 'समस्या के समाधान के लिए JVVNL Power टीम भेज दी गई है। अपेक्षित समय: Today।',
            team: 'JVVNL Power',
            expectedTime: 'Today',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-33',
            timestamp: now - 40 * 60 * 1000,
            status: 'resolved',
            messageEn: 'Your complaint has been resolved. JVVNL Luminaire Maintenance crew replaced blown capacitor and verified illumination.',
            messageHi: 'आपकी शिकायत का निवारण कर दिया गया है। JVVNL Luminaire Maintenance crew replaced blown capacitor and verified illumination.',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00101',
        timestamp: now - 110 * 60 * 1000,
        zoneId: 'walled-city',
        category: 'water',
        rawCategory: 'waterlogging',
        title: 'Tripolia Bazar Drainage Blockage',
        description: 'Heavy water stagnation outside shops causing customer inconvenience.',
        landmark: 'Tripolia Bazar near Choti Chaupar',
        coordinates: { lat: 26.9242, lng: 75.8235 },
        severity: 'high',
        status: 'considered',
        isAnonymous: true,
        upvotes: 8,
        assignedDepartment: 'JMC Sewerage & Drainage Wing',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-40',
            timestamp: now - 110 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-41',
            timestamp: now - 60 * 60 * 1000,
            status: 'considered',
            messageEn: 'We have received your complaint and it is under review.',
            messageHi: 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00104',
        timestamp: now - 130 * 60 * 1000,
        zoneId: 'mansarovar',
        category: 'sanitation',
        rawCategory: 'stray_cattle',
        title: 'Herd of Stray Cattle on Main Road',
        description: 'Around 8 stray cows blocking the crossing near Shipra Path market.',
        landmark: 'Shipra Path near VT Road market',
        coordinates: { lat: 26.8584, lng: 75.7672 },
        severity: 'medium',
        status: 'team_sent',
        isAnonymous: true,
        upvotes: 5,
        assignedDepartment: 'JMC Animal Management Wing',
        assignedTeam: 'Animal Control',
        expectedTime: 'Today',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-50',
            timestamp: now - 130 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-51',
            timestamp: now - 90 * 60 * 1000,
            status: 'team_sent',
            messageEn: 'An Animal Control team has been sent to solve the problem. Expected time: Today.',
            messageHi: 'समस्या के समाधान के लिए Animal Control टीम भेज दी गई है। अपेक्षित समय: Today।',
            team: 'Animal Control',
            expectedTime: 'Today',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00108',
        timestamp: now - 150 * 60 * 1000,
        zoneId: 'malviya-nagar',
        category: 'sanitation',
        rawCategory: 'sewage',
        title: 'Sewage Chamber Overflowing',
        description: 'Foul-smelling effluent bubbling onto footpath outside commercial complex.',
        landmark: 'Sector 3 Commercial Hub near Calgiri Road',
        coordinates: { lat: 26.8541, lng: 75.8175 },
        severity: 'high',
        status: 'in_progress',
        isAnonymous: true,
        upvotes: 9,
        assignedDepartment: 'JMC Sewerage & Drainage Wing',
        assignedTeam: 'JMC Sanitation',
        expectedTime: '4 hrs',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-60',
            timestamp: now - 150 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-61',
            timestamp: now - 80 * 60 * 1000,
            status: 'in_progress',
            messageEn: 'Work has started on your complaint.',
            messageHi: 'आपकी शिकायत पर कार्य प्रारंभ हो चुका है।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00112',
        timestamp: now - 90 * 60 * 1000,
        zoneId: 'amer',
        category: 'traffic',
        rawCategory: 'traffic',
        title: 'Tourist Bus Gridlock at Amer Stand',
        description: 'Vehicles blocking both lanes near the Amer Fort entrance parking.',
        landmark: 'Amer Fort elephant stand & bus depot',
        coordinates: { lat: 26.9855, lng: 75.8513 },
        severity: 'critical',
        status: 'team_sent',
        isAnonymous: true,
        upvotes: 15,
        assignedDepartment: 'Jaipur City Police & Traffic Division',
        assignedTeam: 'Traffic Police',
        expectedTime: '1 hr',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-70',
            timestamp: now - 90 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-71',
            timestamp: now - 35 * 60 * 1000,
            status: 'team_sent',
            messageEn: 'A Traffic Police team has been sent to solve the problem. Expected time: 1 hr.',
            messageHi: 'समस्या के समाधान के लिए Traffic Police टीम भेज दी गई है। अपेक्षित समय: 1 hr।',
            team: 'Traffic Police',
            expectedTime: '1 hr',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00115',
        timestamp: now - 210 * 60 * 1000,
        zoneId: 'jagatpura',
        category: 'water',
        rawCategory: 'water_supply',
        title: 'Pipeline Low Pressure & Dry Lines',
        description: 'Sector 7 residents experiencing complete water supply cut off since morning.',
        landmark: 'Near Mahal Road flyover sector 7',
        coordinates: { lat: 26.8285, lng: 75.8458 },
        severity: 'high',
        status: 'submitted',
        isAnonymous: true,
        upvotes: 7,
        assignedDepartment: 'Public Health Engineering Dept (PHED)',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-80',
            timestamp: now - 210 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00119',
        timestamp: now - 50 * 60 * 1000,
        zoneId: 'cscheme-civillines',
        category: 'crowd',
        rawCategory: 'noise',
        title: 'Loudspeakers Exceeding Decibel Limits',
        description: 'Unauthorized commercial speaker stacks operating beyond permitted hours.',
        landmark: 'Panch Batti crossroad near MI Road',
        coordinates: { lat: 26.9142, lng: 75.8021 },
        severity: 'medium',
        status: 'considered',
        isAnonymous: true,
        upvotes: 3,
        assignedDepartment: 'Jaipur City Police & RSPCB',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-90',
            timestamp: now - 50 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-91',
            timestamp: now - 20 * 60 * 1000,
            status: 'considered',
            messageEn: 'We have received your complaint and it is under review.',
            messageHi: 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00122',
        timestamp: now - 260 * 60 * 1000,
        zoneId: 'mansarovar',
        category: 'power',
        rawCategory: 'power',
        title: 'Transformer Sparking and Fluctuations',
        description: 'Distribution box throwing sparks during peak evening load.',
        landmark: 'Madhyam Marg near Galaxy Cinema',
        coordinates: { lat: 26.8522, lng: 75.7615 },
        severity: 'high',
        status: 'in_progress',
        isAnonymous: true,
        upvotes: 11,
        assignedDepartment: 'JVVNL & JMC Street Lighting Cell',
        assignedTeam: 'JVVNL Power',
        expectedTime: 'Today',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-100',
            timestamp: now - 260 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-101',
            timestamp: now - 180 * 60 * 1000,
            status: 'in_progress',
            messageEn: 'Work has started on your complaint.',
            messageHi: 'आपकी शिकायत पर कार्य प्रारंभ हो चुका है।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00125',
        timestamp: now - 140 * 60 * 1000,
        zoneId: 'sanganer',
        category: 'sanitation',
        rawCategory: 'garbage',
        title: 'Textile Waste Dump on Riverbed',
        description: 'Illegal dumping of dry cloth rags and plastic wrapping along Sanganer nullah.',
        landmark: 'Kagzi Mohalla craft center',
        coordinates: { lat: 26.8124, lng: 75.7791 },
        severity: 'high',
        status: 'team_sent',
        isAnonymous: true,
        upvotes: 8,
        assignedDepartment: 'Jaipur Municipal Corporation (Greater)',
        assignedTeam: 'JMC Sanitation',
        expectedTime: 'Today',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-110',
            timestamp: now - 140 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-111',
            timestamp: now - 80 * 60 * 1000,
            status: 'team_sent',
            messageEn: 'A JMC Sanitation team has been sent to solve the problem. Expected time: Today.',
            messageHi: 'समस्या के समाधान के लिए JMC Sanitation टीम भेज दी गई है। अपेक्षित समय: Today।',
            team: 'JMC Sanitation',
            expectedTime: 'Today',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00128',
        timestamp: now - 320 * 60 * 1000,
        zoneId: 'walled-city',
        category: 'traffic',
        rawCategory: 'pothole',
        title: 'Cave-in near Kishanpole Stone Pavement',
        description: 'Sunken stone slab posing severe hazard for cyclists and pedestrians.',
        landmark: 'Kishanpole Bazar lane 2',
        coordinates: { lat: 26.9205, lng: 75.8198 },
        severity: 'medium',
        status: 'submitted',
        isAnonymous: true,
        upvotes: 4,
        assignedDepartment: 'Jaipur Development Authority (JDA)',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-120',
            timestamp: now - 320 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00130',
        timestamp: now - 400 * 60 * 1000,
        zoneId: 'malviya-nagar',
        category: 'sanitation',
        rawCategory: 'garbage',
        title: 'Litter Box Overflow Cleared',
        description: 'Community dustbin cleared and surrounding area sprayed with disinfectant.',
        landmark: 'Pradhan Marg corner container',
        coordinates: { lat: 26.8556, lng: 75.8212 },
        severity: 'low',
        status: 'resolved',
        resolutionNote: 'Sanitation vehicle cleared 1.2 metric tons of waste and sanitized container base.',
        resolvedAt: now - 120 * 60 * 1000,
        isAnonymous: true,
        upvotes: 5,
        assignedDepartment: 'Jaipur Municipal Corporation (Greater)',
        assignedTeam: 'JMC Sanitation',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-130',
            timestamp: now - 400 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
          {
            id: 'tl-131',
            timestamp: now - 120 * 60 * 1000,
            status: 'resolved',
            messageEn: 'Your complaint has been resolved. Sanitation vehicle cleared 1.2 metric tons of waste and sanitized container base.',
            messageHi: 'आपकी शिकायत का निवारण कर दिया गया है। Sanitation vehicle cleared 1.2 metric tons of waste and sanitized container base.',
            staffName: 'STARKTECH',
          },
        ],
      },
      {
        id: 'JPR-2026-00133',
        timestamp: now - 30 * 60 * 1000,
        zoneId: 'amer',
        category: 'water',
        rawCategory: 'waterlogging',
        title: 'Highway Service Lane Inundation',
        description: 'Drainage culvert choked with debris causing water to pool on service lane.',
        landmark: 'Delhi Bypass intersection near Kunda',
        coordinates: { lat: 26.9922, lng: 75.8601 },
        severity: 'high',
        status: 'submitted',
        isAnonymous: true,
        upvotes: 6,
        assignedDepartment: 'JMC & Drainage Division',
        reportedByMe: false,
        timeline: [
          {
            id: 'tl-140',
            timestamp: now - 30 * 60 * 1000,
            status: 'submitted',
            messageEn: 'Complaint submitted by citizen.',
            messageHi: 'नागरिक द्वारा शिकायत दर्ज की गई।',
            staffName: 'STARKTECH',
          },
        ],
      },
    ],

    citySummary: {
      en: 'Pink City rhythm is Calm (79/100) with all major sectors including the Pink Line Metro and power grid operating normally. Weather and air quality remain within steady seasonal baselines across most wards.',
      hi: 'गुलाबी नगरी की नब्ज़ वर्तमान में 79/100 के साथ शांत बनी हुई है और पिंक लाइन मेट्रो सहित सभी प्रमुख नागरिक सेवाएं सामान्य रूप से चल रही हैं। शहर के अधिकांश क्षेत्रों में मौसम और वायु गुणवत्ता अनुकूल है।',
      generatedAt: now,
      timeLabel: new Date(now).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST',
      isFallback: false,
    },
    zoneSummaries: {},
    isGeneratingCitySummary: false,
    isGeneratingZoneSummary: {},

    dismissedFlagKeys: [],
    agentCycleLogs: [],
    isAgentRunning: true,
    isAgentThinking: false,
    highlightedEventIds: [],

    // Historical Replay & Demo (Spec 8.5)
    isReplayMode: false,
    replayCurrentTimestamp: 1790000000000,
    replayStartTimestamp: 1790000000000,
    replayEndTimestamp: 1790000000000 + 7 * 24 * 60 * 60 * 1000,
    replaySpeed: 60,
    isReplayPlaying: false,
    replayTimelineMarkers: [],
    activeDemoScenarioId: null,

    setIsReplayMode: (isReplayMode: boolean) => set({ isReplayMode }),
    setReplayCurrentTimestamp: (replayCurrentTimestamp: number) => set({ replayCurrentTimestamp }),
    setReplaySpeed: (replaySpeed: 10 | 60 | 360) => set({ replaySpeed }),
    setIsReplayPlaying: (isReplayPlaying: boolean) => set({ isReplayPlaying }),
    setActiveDemoScenarioId: (activeDemoScenarioId: DemoScenarioId | null) => set({ activeDemoScenarioId }),

    toggleLiveAlerts: () =>
      set((state) => {
        const nextOpen = !state.isLiveAlertsOpen;
        return {
          isLiveAlertsOpen: nextOpen,
          unreadAlertsCount: nextOpen ? 0 : state.unreadAlertsCount,
          isLiveAlertsMinimized: false,
        };
      }),
    setIsLiveAlertsOpen: (isLiveAlertsOpen: boolean) =>
      set((state) => ({
        isLiveAlertsOpen,
        unreadAlertsCount: isLiveAlertsOpen ? 0 : state.unreadAlertsCount,
        isLiveAlertsMinimized: isLiveAlertsOpen ? false : state.isLiveAlertsMinimized,
      })),
    setIsLiveAlertsMinimized: (isLiveAlertsMinimized: boolean) =>
      set({ isLiveAlertsMinimized }),
    toggleAlertToastsMuted: () =>
      set((state) => ({ isAlertToastsMuted: !state.isAlertToastsMuted })),
    dismissLiveToast: (id: string) =>
      set((state) => ({
        liveAlertToasts: state.liveAlertToasts.filter((t) => t.id !== id),
      })),
    clearUnreadAlerts: () => set({ unreadAlertsCount: 0 }),

    setRole: (role: UserRole) => {
      set({ role });
      if (role === 'resident') {
        set({ staffUsername: null });
        if (get().activeTab === 'staff') {
          set({ activeTab: 'dashboard' });
        }
      }
    },

    setIsStaffAuthModalOpen: (isStaffAuthModalOpen: boolean) => set({ isStaffAuthModalOpen }),
    setStaffUsername: (staffUsername: string | null) => set({ staffUsername }),

    setActiveTab: (activeTab: TabId) => set({ activeTab }),

    setTheme: (theme: ThemeMode) => {
      localStorage.setItem('citypulse_theme', theme);
      if (theme === 'raat') {
        document.documentElement.classList.add('raat');
      } else {
        document.documentElement.classList.remove('raat');
      }
      set({ theme });
    },

    toggleTheme: () => {
      const nextTheme: ThemeMode = get().theme === 'day' ? 'raat' : 'day';
      get().setTheme(nextTheme);
    },

    setSelectedZoneId: (selectedZoneId: string | null) => set({ selectedZoneId }),
    setUserMyAreaZoneId: (userMyAreaZoneId: string) => set({ userMyAreaZoneId }),

    setPulseScore: (score: number) => {
      set((state) => ({
        pulseMetrics: {
          ...state.pulseMetrics,
          cityScore: score,
          band: getPulseBand(score),
          status: score >= 78 ? 'optimal' : score >= 55 ? 'moderate' : score >= 35 ? 'elevated' : 'critical',
          lastCalculatedAt: Date.now(),
        },
      }));
    },

    recomputeAnalytics: () => {
      const { events, zoneWeatherAQI, feedStatuses, pulseMetrics } = get();
      const updatedPulse = calculateCityPulse(
        events,
        zoneWeatherAQI,
        feedStatuses,
        pulseMetrics.pulseHistory
      );
      const updatedAnomalies = detectAnomalies(events, zoneWeatherAQI);
      const updatedCorrelations = detectCorrelations(updatedAnomalies, events, zoneWeatherAQI);
      const updatedClusters = detectGrievanceClusters(events);

      set({
        pulseMetrics: updatedPulse,
        anomalies: updatedAnomalies,
        correlations: updatedCorrelations,
        clusters: updatedClusters,
      });
    },

    ingestEvents: (newEvents: CivicEvent[]) => {
      if (newEvents.length === 0) return;
      const now = Date.now();
      const TEN_MINS_MS = 10 * 60 * 1000;

      set((state) => {
        // 1. Deduplicate incoming events
        const dedupedIncoming = deduplicateEvents(newEvents);
        
        // 2. Check for new high/medium severity events to trigger popup toasts
        const newToasts: LiveAlertToast[] = [];
        const nextToastHistory = { ...state.lastToastHistory };

        if (!state.isAlertToastsMuted) {
          for (const evt of dedupedIncoming) {
            if (evt.severity === 'high' || evt.severity === 'critical' || evt.severity === 'medium') {
              const zone = JAIPUR_ZONES.find((z) => z.id === evt.zoneId);
              const shortTexts = getShortProblemText(evt);
              const toastKey = `${evt.zoneId}_${shortTexts.en.toLowerCase()}`;
              const lastShown = nextToastHistory[toastKey] || 0;

              // Don't show a toast for the same problem + area within 10 minutes
              if (now - lastShown >= TEN_MINS_MS) {
                nextToastHistory[toastKey] = now;
                newToasts.push({
                  id: `toast-${evt.id}-${now}`,
                  eventId: evt.id,
                  zoneId: evt.zoneId,
                  category: evt.category,
                  severity: evt.severity,
                  areaNameEn: zone ? zone.nameEn.split('(')[0].trim() : 'Jaipur',
                  areaNameHi: zone ? zone.nameHi.split('(')[0].trim() : 'जयपुर',
                  shortTextEn: shortTexts.en,
                  shortTextHi: shortTexts.hi,
                  timestamp: evt.timestamp,
                });
              }
            }
          }
        }

        // Maximum 3 toasts stacked at once
        const updatedLiveToasts = [...newToasts, ...state.liveAlertToasts].slice(0, 3);

        // Prepend new events (newest first), deduplicate everywhere (15 min rule), cap at 3000
        const combined = deduplicateEvents([...dedupedIncoming, ...state.events]).slice(0, MAX_EVENT_STORE_SIZE);

        const newUnread = state.isLiveAlertsOpen ? 0 : state.unreadAlertsCount + dedupedIncoming.length;

        const updatedPulse = calculateCityPulse(
          combined,
          state.zoneWeatherAQI,
          state.feedStatuses,
          state.pulseMetrics.pulseHistory
        );
        const updatedAnomalies = detectAnomalies(combined, state.zoneWeatherAQI);
        const updatedCorrelations = detectCorrelations(updatedAnomalies, combined, state.zoneWeatherAQI);
        const updatedClusters = detectGrievanceClusters(combined);

        return {
          events: combined,
          liveAlertToasts: updatedLiveToasts,
          lastToastHistory: nextToastHistory,
          unreadAlertsCount: newUnread,
          pulseMetrics: updatedPulse,
          anomalies: updatedAnomalies,
          correlations: updatedCorrelations,
          clusters: updatedClusters,
        };
      });
    },

    setEvents: (events: CivicEvent[]) => {
      const deduped = deduplicateEvents(events).slice(0, MAX_EVENT_STORE_SIZE);
      const { zoneWeatherAQI, feedStatuses, pulseMetrics } = get();
      const updatedPulse = calculateCityPulse(deduped, zoneWeatherAQI, feedStatuses, pulseMetrics.pulseHistory);
      const updatedAnomalies = detectAnomalies(deduped, zoneWeatherAQI);
      const updatedCorrelations = detectCorrelations(updatedAnomalies, deduped, zoneWeatherAQI);
      const updatedClusters = detectGrievanceClusters(deduped);

      set({
        events: deduped,
        pulseMetrics: updatedPulse,
        anomalies: updatedAnomalies,
        correlations: updatedCorrelations,
        clusters: updatedClusters,
      });
    },

    updateFeedStatus: (feedId: string, updates: Partial<FeedStatus>) => {
      set((state) => {
        const nextFeedStatuses = state.feedStatuses.map((feed) =>
          feed.feedId === feedId ? { ...feed, ...updates } : feed
        );
        const updatedPulse = calculateCityPulse(
          state.events,
          state.zoneWeatherAQI,
          nextFeedStatuses,
          state.pulseMetrics.pulseHistory
        );
        return {
          feedStatuses: nextFeedStatuses,
          pulseMetrics: updatedPulse,
        };
      });
    },

    updateZoneWeatherAQI: (updates: Record<string, Partial<ZoneWeatherAQI>>) => {
      set((state) => {
        const merged = { ...state.zoneWeatherAQI };
        Object.entries(updates).forEach(([zoneId, data]) => {
          merged[zoneId] = {
            ...(merged[zoneId] || {}),
            ...data,
          } as ZoneWeatherAQI;
        });

        const updatedPulse = calculateCityPulse(
          state.events,
          merged,
          state.feedStatuses,
          state.pulseMetrics.pulseHistory
        );
        const updatedAnomalies = detectAnomalies(state.events, merged);
        const updatedCorrelations = detectCorrelations(updatedAnomalies, state.events, merged);

        return {
          zoneWeatherAQI: merged,
          pulseMetrics: updatedPulse,
          anomalies: updatedAnomalies,
          correlations: updatedCorrelations,
        };
      });
    },

    toggleFeedDisabled: (feedId: string) => {
      set((state) => {
        const isCurrentlyDisabled = state.disabledFeedIds.includes(feedId);
        const nextDisabled = isCurrentlyDisabled
          ? state.disabledFeedIds.filter((id) => id !== feedId)
          : [...state.disabledFeedIds, feedId];

        const nextFeedStatuses = state.feedStatuses.map((f) => {
          if (f.feedId !== feedId) return f;
          if (!isCurrentlyDisabled) {
            return {
              ...f,
              status: 'offline' as const,
              lastError: 'Simulated failure triggered by city staff',
            };
          } else {
            return {
              ...f,
              status: 'live' as const,
              lastError: undefined,
              lastHeartbeat: Date.now(),
            };
          }
        });

        const updatedPulse = calculateCityPulse(
          state.events,
          state.zoneWeatherAQI,
          nextFeedStatuses,
          state.pulseMetrics.pulseHistory
        );

        return {
          disabledFeedIds: nextDisabled,
          feedStatuses: nextFeedStatuses,
          pulseMetrics: updatedPulse,
        };
      });
    },

    addResidentReport: (report: ResidentReport) => {
      // 1. Save to localStorage for My Reports persistence
      try {
        const stored = JSON.parse(localStorage.getItem('citypulse_my_reports') || '[]');
        if (!stored.includes(report.id)) {
          stored.unshift(report.id);
          localStorage.setItem('citypulse_my_reports', JSON.stringify(stored.slice(0, 50)));
        }
      } catch {
        // Storage unavailable or disabled
      }

      // 2. Generate a corresponding CivicEvent so it enters the full pipeline (pulse, anomalies, clusters)
      const civicEvent: CivicEvent = {
        id: `evt-resident-${report.id}`,
        timestamp: report.timestamp,
        timestampIST: new Date(report.timestamp).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' IST',
        zoneId: report.zoneId,
        category: report.category,
        severity: report.severity || 'medium',
        titleEn: `Citizen Report (${report.id}): ${report.title}`,
        titleHi: `नागरिक शिकायत (${report.id}): ${report.title}`,
        descriptionEn: report.description,
        descriptionHi: report.description,
        locationName: report.landmark || 'Jaipur City',
        coordinates: report.coordinates || { lat: 26.9124, lng: 75.7873 },
        source: 'resident_report',
        status: 'active',
        metadata: {
          ticketId: report.id,
          origin: 'live_api',
        },
      };

      set((state) => {
        const nextReports = [report, ...state.residentReports];
        const nextEvents = [civicEvent, ...state.events].slice(0, MAX_EVENT_STORE_SIZE);

        const updatedPulse = calculateCityPulse(
          nextEvents,
          state.zoneWeatherAQI,
          state.feedStatuses,
          state.pulseMetrics.pulseHistory
        );
        const updatedAnomalies = detectAnomalies(nextEvents, state.zoneWeatherAQI);
        const updatedCorrelations = detectCorrelations(updatedAnomalies, nextEvents, state.zoneWeatherAQI);
        const updatedClusters = detectGrievanceClusters(nextEvents);

        return {
          residentReports: nextReports,
          events: nextEvents,
          pulseMetrics: updatedPulse,
          anomalies: updatedAnomalies,
          correlations: updatedCorrelations,
          clusters: updatedClusters,
        };
      });
    },

    updateReportStatus: (
      reportId: string,
      status: ResidentReportStatus,
      optionsOrNote?: string | {
        note?: string;
        messageEn?: string;
        messageHi?: string;
        team?: string;
        expectedTime?: string;
        staffName?: string;
      }
    ) => {
      const opts = typeof optionsOrNote === 'string' ? { note: optionsOrNote } : (optionsOrNote || {});
      const now = Date.now();

      // Determine default messages per requirement
      let defMsgEn = '';
      let defMsgHi = '';
      if (status === 'considered' || status === 'acknowledged') {
        defMsgEn = 'We have received your complaint and it is under review.';
        defMsgHi = 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।';
      } else if (status === 'team_sent') {
        const teamName = opts.team || 'Field Response';
        const expTime = opts.expectedTime || 'Today';
        defMsgEn = `A ${teamName} team has been sent to solve the problem. Expected time: ${expTime}.`;
        defMsgHi = `समस्या के समाधान के लिए ${teamName} टीम भेज दी गई है। अपेक्षित समय: ${expTime}।`;
      } else if (status === 'in_progress') {
        defMsgEn = 'Work has started on your complaint.';
        defMsgHi = 'आपकी शिकायत पर कार्य प्रारंभ हो चुका है।';
      } else if (status === 'resolved') {
        const note = opts.note ? ` ${opts.note}` : '';
        defMsgEn = `Your complaint has been resolved.${note}`;
        defMsgHi = `आपकी शिकायत का निवारण कर दिया गया है।${note}`;
      } else if (status === 'need_info') {
        defMsgEn = opts.note || 'Please provide more specific details or a landmark to help resolve this issue.';
        defMsgHi = opts.note || 'कृपया इस समस्या के समाधान हेतु अधिक विवरण या निकटतम लैंडमार्क साझा करें।';
      } else if (status === 'rejected') {
        defMsgEn = `Complaint marked as duplicate or invalid: ${opts.note || 'Duplicate / non-actionable entry'}`;
        defMsgHi = `शिकायत डुप्लिकेट या अमान्य चिह्नित की गई: ${opts.note || 'डुप्लिकेट अथवा अमान्य प्रविष्टि'}`;
      } else {
        defMsgEn = `Status updated to ${status}.`;
        defMsgHi = `स्थिति बदलकर ${status} कर दी गई है।`;
      }

      const finalMsgEn = opts.messageEn || defMsgEn;
      const finalMsgHi = opts.messageHi || defMsgHi;

      set((state) => {
        let updatedReportTitle = '';
        const updated = state.residentReports.map((r) => {
          if (r.id !== reportId) return r;
          updatedReportTitle = r.title;
          const currentTimeline = r.timeline ? [...r.timeline] : [];
          const newEntry: ReportTimelineEntry = {
            id: `tl-${now}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            status,
            messageEn: finalMsgEn,
            messageHi: finalMsgHi,
            team: opts.team || r.assignedTeam,
            expectedTime: opts.expectedTime || r.expectedTime,
            staffName: opts.staffName || 'STARKTECH',
          };

          return {
            ...r,
            status,
            ...(opts.note ? { resolutionNote: opts.note } : {}),
            ...(opts.team ? { assignedTeam: opts.team } : {}),
            ...(opts.expectedTime ? { expectedTime: opts.expectedTime } : {}),
            ...(status === 'resolved' ? { resolvedAt: now } : {}),
            ...(status === 'considered' || status === 'acknowledged' ? { acknowledgedAt: now } : {}),
            ...(status === 'team_sent' ? { teamSentAt: now } : {}),
            ...(status === 'in_progress' ? { inProgressAt: now } : {}),
            timeline: [...currentTimeline, newEntry],
          };
        });

        // Add resident notification toast only when in resident mode
        if (state.role !== 'staff') {
          const statusDisplayNames: Record<string, string> = {
            considered: 'Under Review',
            acknowledged: 'Considered',
            team_sent: 'Team Sent',
            in_progress: 'Work in Progress',
            resolved: 'Resolved',
            need_info: 'Need More Info',
            rejected: 'Rejected',
          };
          const statusLabel = statusDisplayNames[status] || status;

          const newToast: ToastNotification = {
            id: `toast-${now}-${Math.random().toString(36).slice(2, 7)}`,
            title: `Update on complaint ${reportId}`,
            message: `${statusLabel}: ${finalMsgEn}`,
            type: status === 'resolved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
            timestamp: now,
          };

          return {
            residentReports: updated,
            toasts: [newToast, ...state.toasts].slice(0, 2),
          };
        }

        return {
          residentReports: updated,
        };
      });
    },

    addReportReply: (
      reportId: string,
      reply: {
        messageEn: string;
        messageHi?: string;
        status?: ResidentReportStatus;
        team?: string;
        expectedTime?: string;
        staffName?: string;
      }
    ) => {
      const now = Date.now();
      set((state) => {
        const updated = state.residentReports.map((r) => {
          if (r.id !== reportId) return r;
          const newStatus = reply.status || r.status;
          const currentTimeline = r.timeline ? [...r.timeline] : [];
          const newEntry: ReportTimelineEntry = {
            id: `tl-${now}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            status: newStatus,
            messageEn: reply.messageEn,
            messageHi: reply.messageHi || reply.messageEn,
            team: reply.team || r.assignedTeam,
            expectedTime: reply.expectedTime || r.expectedTime,
            staffName: reply.staffName || 'STARKTECH',
          };

          return {
            ...r,
            status: newStatus,
            ...(reply.team ? { assignedTeam: reply.team } : {}),
            ...(reply.expectedTime ? { expectedTime: reply.expectedTime } : {}),
            timeline: [...currentTimeline, newEntry],
          };
        });

        if (state.role !== 'staff') {
          const newToast: ToastNotification = {
            id: `toast-${now}-${Math.random().toString(36).slice(2, 7)}`,
            title: `Reply on complaint ${reportId}`,
            message: `STARKTECH: "${reply.messageEn}"`,
            type: 'info',
            timestamp: now,
          };

          return {
            residentReports: updated,
            toasts: [newToast, ...state.toasts].slice(0, 2),
          };
        }

        return {
          residentReports: updated,
        };
      });
    },

    bulkUpdateReports: (
      reportIds: string[],
      status: ResidentReportStatus,
      options?: {
        note?: string;
        messageEn?: string;
        messageHi?: string;
        team?: string;
        expectedTime?: string;
        staffName?: string;
      }
    ) => {
      const now = Date.now();
      const opts = options || {};

      let defMsgEn = '';
      let defMsgHi = '';
      if (status === 'considered' || status === 'acknowledged') {
        defMsgEn = 'We have received your complaint and it is under review.';
        defMsgHi = 'हमें आपकी शिकायत प्राप्त हो गई है और यह समीक्षाधीन है।';
      } else if (status === 'team_sent') {
        const teamName = opts.team || 'Field Response';
        const expTime = opts.expectedTime || 'Today';
        defMsgEn = `A ${teamName} team has been sent to solve the problem. Expected time: ${expTime}.`;
        defMsgHi = `समस्या के समाधान के लिए ${teamName} टीम भेज दी गई है। अपेक्षित समय: ${expTime}।`;
      } else if (status === 'in_progress') {
        defMsgEn = 'Work has started on your complaint.';
        defMsgHi = 'आपकी शिकायत पर कार्य प्रारंभ हो चुका है।';
      } else if (status === 'resolved') {
        const note = opts.note ? ` ${opts.note}` : '';
        defMsgEn = `Your complaint has been resolved.${note}`;
        defMsgHi = `आपकी शिकायत का निवारण कर दिया गया है।${note}`;
      } else {
        defMsgEn = `Status updated to ${status}.`;
        defMsgHi = `स्थिति बदलकर ${status} कर दी गई है।`;
      }

      const finalMsgEn = opts.messageEn || defMsgEn;
      const finalMsgHi = opts.messageHi || defMsgHi;

      set((state) => {
        const updated = state.residentReports.map((r) => {
          if (!reportIds.includes(r.id)) return r;
          const currentTimeline = r.timeline ? [...r.timeline] : [];
          const newEntry: ReportTimelineEntry = {
            id: `tl-${now}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            status,
            messageEn: finalMsgEn,
            messageHi: finalMsgHi,
            team: opts.team || r.assignedTeam,
            expectedTime: opts.expectedTime || r.expectedTime,
            staffName: opts.staffName || 'STARKTECH',
          };

          return {
            ...r,
            status,
            ...(opts.note ? { resolutionNote: opts.note } : {}),
            ...(opts.team ? { assignedTeam: opts.team } : {}),
            ...(opts.expectedTime ? { expectedTime: opts.expectedTime } : {}),
            ...(status === 'resolved' ? { resolvedAt: now } : {}),
            ...(status === 'considered' || status === 'acknowledged' ? { acknowledgedAt: now } : {}),
            ...(status === 'team_sent' ? { teamSentAt: now } : {}),
            ...(status === 'in_progress' ? { inProgressAt: now } : {}),
            timeline: [...currentTimeline, newEntry],
          };
        });

        if (state.role !== 'staff') {
          const newToast: ToastNotification = {
            id: `toast-${now}-${Math.random().toString(36).slice(2, 7)}`,
            title: `Bulk Action Applied`,
            message: `${reportIds.length} reports updated to ${status.replace('_', ' ').toUpperCase()}.`,
            type: 'success',
            timestamp: now,
          };

          return {
            residentReports: updated,
            toasts: [newToast, ...state.toasts].slice(0, 2),
          };
        }

        return {
          residentReports: updated,
        };
      });
    },

    setStaffThresholds: (thresholds: Partial<StaffThresholds>) => {
      set((state) => ({
        staffThresholds: {
          ...state.staffThresholds,
          ...thresholds,
        },
      }));
    },

    addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
      const now = Date.now();
      const newMsg = toast.message.trim();

      set((state) => {
        // Check if identical toast message exists within 2 seconds
        const existingIdx = state.toasts.findIndex(
          (t) => t.message.trim() === newMsg && now - t.timestamp < 2000
        );

        let updatedToasts: ToastNotification[];

        if (existingIdx !== -1) {
          // Replace existing toast with fresh timestamp and id
          updatedToasts = state.toasts.map((t, idx) =>
            idx === existingIdx
              ? {
                  ...toast,
                  id: `toast-${now}-${Math.random().toString(36).slice(2, 7)}`,
                  timestamp: now,
                }
              : t
          );
        } else {
          // Prepend new toast
          const newToastItem: ToastNotification = {
            ...toast,
            id: `toast-${now}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: now,
          };
          updatedToasts = [newToastItem, ...state.toasts];
        }

        // Cap at maximum 2 toasts on screen at once
        if (updatedToasts.length > 2) {
          updatedToasts = updatedToasts.slice(0, 2);
        }

        return { toasts: updatedToasts };
      });
    },

    removeToast: (id: string) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    setCitySummary: (citySummary: AISummary) => set({ citySummary }),
    setZoneSummary: (zoneId: string, summary: AISummary) =>
      set((state) => ({
        zoneSummaries: {
          ...state.zoneSummaries,
          [zoneId]: summary,
        },
      })),
    setIsGeneratingCitySummary: (isGeneratingCitySummary: boolean) =>
      set({ isGeneratingCitySummary }),
    setIsGeneratingZoneSummary: (zoneId: string, val: boolean) =>
      set((state) => ({
        isGeneratingZoneSummary: {
          ...state.isGeneratingZoneSummary,
          [zoneId]: val,
        },
      })),

    addAgentFlags: (newFlags: AgentFlag[]) => {
      if (newFlags.length === 0) return;
      const severityRank: Record<string, number> = { info: 1, warning: 2, critical: 3 };

      set((state) => {
        let updatedFlags = [...state.agentFlags];

        newFlags.forEach((nFlag) => {
          const zoneKey = nFlag.zoneIds[0] || 'all';
          const flagDedupeKey = `${nFlag.flagType}_${zoneKey}`;

          // Check if previously dismissed
          if (state.dismissedFlagKeys.includes(flagDedupeKey)) {
            return;
          }

          // Check if open flag exists for same type and zone
          const existingIdx = updatedFlags.findIndex(
            (f) =>
              f.status === 'open' &&
              f.flagType === nFlag.flagType &&
              (f.zoneIds[0] || 'all') === zoneKey
          );

          if (existingIdx !== -1) {
            const existing = updatedFlags[existingIdx];
            const existingRank = severityRank[existing.severity] || 1;
            const newRank = severityRank[nFlag.severity] || 1;

            // Only upgrade if severity increased
            if (newRank > existingRank) {
              updatedFlags[existingIdx] = nFlag;
            }
          } else {
            // New open flag
            updatedFlags = [nFlag, ...updatedFlags];
          }
        });

        return { agentFlags: updatedFlags.slice(0, 100) };
      });
    },

    dismissAgentFlag: (flagId: string) => {
      set((state) => {
        const flag = state.agentFlags.find((f) => f.id === flagId);
        const newDismissedKeys = [...state.dismissedFlagKeys];
        if (flag) {
          const zoneKey = flag.zoneIds[0] || 'all';
          const key = `${flag.flagType}_${zoneKey}`;
          if (!newDismissedKeys.includes(key)) {
            newDismissedKeys.push(key);
          }
        }

        return {
          agentFlags: state.agentFlags.map((f) =>
            f.id === flagId ? { ...f, status: 'dismissed', dismissedAt: Date.now() } : f
          ),
          dismissedFlagKeys: newDismissedKeys,
        };
      });
    },

    dismissAgentFlagWithReason: (flagId: string, reason: string) => {
      set((state) => {
        const flag = state.agentFlags.find((f) => f.id === flagId);
        const newDismissedKeys = [...state.dismissedFlagKeys];
        if (flag) {
          const zoneKey = flag.zoneIds[0] || 'all';
          const key = `${flag.flagType}_${zoneKey}`;
          if (!newDismissedKeys.includes(key)) {
            newDismissedKeys.push(key);
          }
        }

        return {
          agentFlags: state.agentFlags.map((f) =>
            f.id === flagId
              ? { ...f, status: 'dismissed', dismissedAt: Date.now(), dismissReason: reason }
              : f
          ),
          dismissedFlagKeys: newDismissedKeys,
        };
      });
    },

    acknowledgeAgentFlag: (flagId: string) => {
      set((state) => ({
        agentFlags: state.agentFlags.map((f) =>
          f.id === flagId
            ? { ...f, status: 'acknowledged', acknowledgedAt: Date.now() }
            : f
        ),
      }));
    },

    escalateAgentFlag: (flagId: string) => {
      set((state) => ({
        agentFlags: state.agentFlags.map((f) =>
          f.id === flagId
            ? { ...f, status: 'escalated', severity: 'critical', escalatedAt: Date.now() }
            : f
        ),
      }));
    },

    setHighlightedEventIds: (highlightedEventIds: string[]) =>
      set({ highlightedEventIds }),

    setIsAgentRunning: (isAgentRunning: boolean) => set({ isAgentRunning }),

    setIsAgentThinking: (isAgentThinking: boolean) => set({ isAgentThinking }),

    addAgentCycleLog: (log: AgentCycleLog) =>
      set((state) => ({
        agentCycleLogs: [log, ...state.agentCycleLogs].slice(0, 100),
      })),
  };
});
