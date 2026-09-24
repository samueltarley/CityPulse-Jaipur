import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { JharokhaCard } from '../components/theme/JharokhaCard';
import { BlockPrintDivider } from '../components/theme/BlockPrintDivider';
import {
  Cpu,
  ShieldCheck,
  Building,
  HeartHandshake,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  Radio,
  FileCode2,
  AlertTriangle,
  Lock,
  Users,
  CheckCircle2,
  ExternalLink,
  Zap,
} from 'lucide-react';

interface FeedPipelineSample {
  id: string;
  nameEn: string;
  nameHi: string;
  sourceType: string;
  rawPayload: object;
  normalizedEvent: object;
  explanationEn: string;
  explanationHi: string;
}

const PIPELINE_SAMPLES: FeedPipelineSample[] = [
  {
    id: 'open-meteo-weather',
    nameEn: 'Open-Meteo Multi-Zone Weather API',
    nameHi: 'ओपन-मेटियो बहु-क्षेत्रीय मौसम एपीआई',
    sourceType: 'live_api',
    explanationEn: 'Live REST API polled for Jaipur lat/lng coordinates (26.9124°N, 75.7873°E). Extracts rainfall, temperature, and wind gusts, tagging high precipitation as municipal water events.',
    explanationHi: 'जयपुर निर्देशांकों पर वास्तविक समय में पोल्ड लाइव एपीआई। वर्षा, तापमान और हवा के झोंकों का विश्लेषण कर संभावित जलभराव का आंकलन करती है।',
    rawPayload: {
      latitude: 26.9248,
      longitude: 75.8246,
      current: {
        time: '2026-09-24T10:00:00Z',
        temperature_2m: 34.2,
        relative_humidity_2m: 58,
        rain: 14.5,
        weather_code: 63,
        wind_speed_10m: 18.5,
        wind_gusts_10m: 38.2,
      },
    },
    normalizedEvent: {
      id: 'evt-weather-wc-1727172000000',
      timestamp: 1727172000000,
      source: 'weather_station',
      category: 'water',
      severity: 'medium',
      zoneId: 'walled-city',
      title: 'Moderate Rainfall Ingested (14.5 mm/h)',
      description: 'Precipitation 14.5 mm/h with 38.2 km/h wind gusts detected in Walled City.',
      coordinates: { lat: 26.9248, lng: 75.8246 },
      metrics: {
        rainMm: 14.5,
        temperatureC: 34.2,
        windGustsKmh: 38.2,
      },
    },
  },
  {
    id: 'open-meteo-air-quality',
    nameEn: 'Open-Meteo CPCB Air Quality API',
    nameHi: 'ओपन-मेटियो वायु गुणवत्ता एपीआई',
    sourceType: 'live_api',
    explanationEn: 'Ingests atmospheric particulates (PM10, PM2.5, NO2, CO) and maps them to standard Indian AQI bands to measure public health pressure.',
    explanationHi: 'वायुमंडलीय कणों (PM10, PM2.5) को संकलित कर मानक भारतीय एक्यूआई श्रेणियों में परिवर्तित करता है।',
    rawPayload: {
      latitude: 26.8656,
      longitude: 75.7627,
      current: {
        pm10: 172.4,
        pm2_5: 86.1,
        carbon_monoxide: 540.0,
        nitrogen_dioxide: 44.5,
        european_aqi: 74,
      },
    },
    normalizedEvent: {
      id: 'evt-aqi-ms-1727172000000',
      timestamp: 1727172000000,
      source: 'aqi_sensor',
      category: 'air_quality',
      severity: 'medium',
      zoneId: 'mansarovar',
      title: 'Elevated PM10 / PM2.5 in Mansarovar',
      description: 'Calculated AQI 172 (Moderate category). Respiratory advisory active for sensitive groups.',
      coordinates: { lat: 26.8656, lng: 75.7627 },
      metrics: {
        aqi: 172,
        pm25: 86.1,
        pm10: 172.4,
      },
    },
  },
  {
    id: 'jmrc-metro',
    nameEn: 'JMRC Pink Line SCADA & Ridership Feed',
    nameHi: 'जेएमआरसी पिंक लाइन स्काडा व यात्री संख्या',
    sourceType: 'simulated_scada',
    explanationEn: 'Captures automated AFC smart card entry/exit gates, platform crowding ratios, and real-time train schedule variance across all 11 Pink Line stations.',
    explanationHi: 'सभी 11 पिंक लाइन स्टेशनों पर स्वचालित एएफसी गेट्स, प्लेटफॉर्म भीड़ अनुपात और ट्रेन समय-सारणी के विचलन को मॉनिटर करता है।',
    rawPayload: {
      station_id: 'st-10',
      station_name: 'Chhoti Chaupar',
      line: 'pink',
      afc_tap_in_per_min: 88,
      afc_tap_out_per_min: 104,
      platform_crowd_ratio: 0.89,
      train_delay_seconds: 320,
      gate_status: 'CONGESTED',
    },
    normalizedEvent: {
      id: 'evt-metro-st10-1727172000000',
      timestamp: 1727172000000,
      source: 'metro_feed',
      category: 'transit',
      severity: 'high',
      zoneId: 'walled-city',
      title: 'Pink Line Station Congestion at Chhoti Chaupar',
      description: 'AFC rate 192 taps/min, 5.3m train headway delay, platform crowd capacity 89%.',
      coordinates: { lat: 26.9242, lng: 75.8202 },
      metrics: {
        ridership: 192,
        trainDelaySec: 320,
      },
    },
  },
  {
    id: 'google-routes-traffic',
    nameEn: 'Google Routes API (Jaipur Corridors)',
    nameHi: 'गूगल रूट्स एपीआई (जयपुर कॉरिडोर)',
    sourceType: 'live_api',
    explanationEn: 'Polls Google Routes computeRoutes with TRAFFIC_AWARE preference every 10 minutes across 8 key Jaipur arterial corridors (Tonk Road, JLN Marg, Ajmer Road, Sikar Road, Delhi Road, MI Road, Gopalpura Bypass, New Sanganer Road). Normalizes travel time duration / staticDuration into congestion ratios.',
    explanationHi: 'गूगल रूट्स computeRoutes एपीआई के माध्यम से जयपुर के 8 मुख्य मार्गों पर लाइव यात्रा समय व जाम अनुपात (duration / staticDuration) का वास्तविक समय में विश्लेषण करता है।',
    rawPayload: {
      apiEndpoint: 'https://routes.googleapis.com/directions/v2:computeRoutes',
      routingPreference: 'TRAFFIC_AWARE',
      corridorId: 'tonk-road',
      corridorName: 'Tonk Road (Narayan Singh Circle → Sanganer)',
      distanceMeters: 11200,
      durationSeconds: 2280,
      durationText: '38 mins',
      staticDurationSeconds: 1440,
      staticDurationText: '24 mins',
      congestionRatio: 1.58,
      severity: 'medium',
      liveStatus: 'POLLED_REALTIME',
    },
    normalizedEvent: {
      id: 'evt-traffic-tonk-road-1727172000000',
      timestamp: 1727172000000,
      source: 'road_traffic',
      origin: 'live_api',
      category: 'traffic',
      severity: 'medium',
      zoneId: 'malviya-nagar',
      title: 'Tonk Road Corridor: Congestion Ratio 1.58x',
      description: 'Travel time 38 mins (nominal 24 mins). Speed curtailed along 11.2 km corridor.',
      coordinates: { lat: 26.8532, lng: 75.8052 },
      metrics: {
        congestionRatio: 1.58,
        durationMinutes: 38,
        staticDurationMinutes: 24,
        distanceMeters: 11200,
      },
    },
  },
  {
    id: 'jda-traffic',
    nameEn: 'Jaipur ITMS Traffic & Speed Sensors',
    nameHi: 'जयपुर आईटीएमएस यातायात व गति सेंसर',
    sourceType: 'simulated_itms',
    explanationEn: 'Ingests arterial road loop detectors, camera flow speeds, and queue lengths across major corridors like Tonk Road, JLN Marg, and MI Road.',
    explanationHi: 'टोंक रोड, जेएलएन मार्ग और एम.आई. रोड जैसे प्रमुख मार्गों पर वाहन गति व जाम की लंबाई को संकलित करता है।',
    rawPayload: {
      corridor_id: 'corridor-tonk-rd',
      junction: 'Tonk Rd - Gopalpura Flyover',
      avg_speed_kmh: 8.8,
      freeflow_speed_kmh: 45.0,
      congestion_index: 0.88,
      queue_length_meters: 650,
    },
    normalizedEvent: {
      id: 'evt-traffic-tonk-1727172000000',
      timestamp: 1727172000000,
      source: 'traffic_camera',
      category: 'traffic',
      severity: 'high',
      zoneId: 'malviya-nagar',
      title: 'Severe Traffic Choke on Tonk Road Corridor',
      description: 'Average speed dropped to 8.8 km/h (freeflow 45 km/h) with 650m vehicular queue.',
      coordinates: { lat: 26.8532, lng: 75.8052 },
      metrics: {
        avgSpeedKmh: 8.8,
        queueLengthM: 650,
      },
    },
  },
  {
    id: 'phed-water',
    nameEn: 'PHED Water Supply & Pipeline SCADA',
    nameHi: 'पीएचईडी पेयजल आपूर्ति व पाइपलाइन स्काडा',
    sourceType: 'simulated_scada',
    explanationEn: 'Monitors distribution line pressure barometers, reservoir water levels, and booster pump states for sudden pressure drops indicating main bursts.',
    explanationHi: 'वितरण पाइपलाइनों में जल दबाव (बार), जलाशय स्तर और पंप स्थिति की निगरानी करता है ताकि मुख्य पाइपलाइन फटने का तुरंत पता चले।',
    rawPayload: {
      pumping_station_id: 'PS-MANSAROVAR-SEC3',
      distribution_line_bar: 0.45,
      nominal_pressure_bar: 2.8,
      reservoir_level_pct: 32,
      flow_rate_lps: 42,
      pressure_drop_pct: 83.9,
    },
    normalizedEvent: {
      id: 'evt-phed-ms-1727172000000',
      timestamp: 1727172000000,
      source: 'water_scada',
      category: 'water',
      severity: 'critical',
      zoneId: 'mansarovar',
      title: 'Acute Water Pressure Drop in Mansarovar',
      description: 'Distribution line pressure collapsed to 0.45 bar (84% below nominal pressure).',
      coordinates: { lat: 26.8656, lng: 75.7627 },
      metrics: {
        pressureBar: 0.45,
      },
    },
  },
  {
    id: 'jvvnl-power',
    nameEn: 'JVVNL 33kV/11kV Grid & Streetlight SCADA',
    nameHi: 'जेवीवीएनएल 33kV/11kV विद्युत ग्रिड व स्ट्रीट लाइट',
    sourceType: 'simulated_scada',
    explanationEn: 'Tracks high-voltage feeder breaker trips, transformer overloads, and streetlight circuits to detect power blackouts impacting civic life.',
    explanationHi: 'उच्च-क्षमता फीडर ट्रिपिंग, ट्रांसफार्मर ओवरलोड और स्ट्रीट लाइट सर्किट की निगरानी करता है।',
    rawPayload: {
      feeder_id: 'FDR-11KV-AMER-04',
      substation: 'Amer 33/11kV GSS',
      voltage_kv: 0.0,
      current_amps: 0.0,
      breaker_status: 'TRIPPED',
      fault_type: 'EARTH_FAULT_OVERCURRENT',
      connections_offline: 2400,
    },
    normalizedEvent: {
      id: 'evt-jvvnl-amer-1727172000000',
      timestamp: 1727172000000,
      source: 'power_grid',
      category: 'power',
      severity: 'high',
      zoneId: 'amer',
      title: '11kV Feeder Tripped near Amer Fort',
      description: 'Feeder breaker tripped on Earth Fault; 2,400 municipal connections offline.',
      coordinates: { lat: 26.9855, lng: 75.8513 },
      metrics: {
        voltageKv: 0.0,
      },
    },
  },
  {
    id: 'resident-reports',
    nameEn: 'Citizen Grievances & Verified Reports',
    nameHi: 'नागरिक शिकायतें व सत्यापित रिपोर्ट्स',
    sourceType: 'citizen_portal',
    explanationEn: 'Processes citizen-submitted incident reports, applies Gemini AI auto-categorization and severity ranking, and verifies GPS coordinates.',
    explanationHi: 'नागरिकों द्वारा दर्ज की गई समस्याओं का प्रसंस्करण, जेमिनी एआई द्वारा स्वतः-वर्गीकरण और जीपीएस सत्यापन करता है।',
    rawPayload: {
      citizen_ticket: 'JPR-2026-00104',
      gps_lat: 26.9239,
      gps_lng: 75.8267,
      category_reported: 'waterlogging',
      user_notes: 'Knee-deep water accumulating outside Johari Bazar shops',
      upvote_count: 8,
      has_photo: true,
    },
    normalizedEvent: {
      id: 'evt-citizen-00104',
      timestamp: 1727172000000,
      source: 'resident_report',
      category: 'water',
      severity: 'high',
      zoneId: 'walled-city',
      title: 'Waterlogging at Johari Bazar',
      description: 'Knee-deep water accumulating outside shops; 8 citizen upvotes recorded.',
      coordinates: { lat: 26.9239, lng: 75.8267 },
      metrics: {
        upvotes: 8,
      },
    },
  },
];

export const AboutPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('google-routes-traffic');
  const [lastUpdatedTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' IST'
  );

  const selectedPipeline =
    PIPELINE_SAMPLES.find((p) => p.id === selectedPipelineId) || PIPELINE_SAMPLES[0];

  const pillars = [
    {
      titleEn: 'Heritage Preservation & UNESCO Protection',
      titleHi: 'धरोहर संरक्षण व यूनेस्को सुरक्षा',
      descEn: 'Jaipur’s historic Walled City is a UNESCO World Heritage site with sensitive architectural heritage, narrow chowks, and intense commercial and tourist density.',
      descHi: 'जयपुर का परकोटा (चारदीवारी) यूनेस्को विश्व धरोहर क्षेत्र है जहाँ संकीर्ण गलियों, ऐतिहासिक बाज़ारों और भारी पर्यटन दबाव के कारण विशेष निगरानी की आवश्यकता है।',
      icon: Building,
    },
    {
      titleEn: 'Multi-Modal IoT & SCADA Fusion',
      titleHi: 'बहु-आयामी आईओटी व स्काडा एकीकरण',
      descEn: 'Ingests telemetry from PHED water pressure SCADA, JMRC Pink Line AFC gate footfalls, CPCB air monitoring sensors, and Jaipur ITMS traffic cameras into a unified pulse index.',
      descHi: 'पीएचईडी जल दबाव स्काडा, पिंक लाइन मेट्रो एएफसी गेट्स, सीपीसीबी वायु गुणवत्ता और यातायात कैमरों की टेलीमेट्री को एक एकीकृत सिटी पल्स इंडेक्स में बदलता है।',
      icon: Cpu,
    },
    {
      titleEn: 'Citizen-Centric Rapid Dispatch',
      titleHi: 'नागरिक-केंद्रित त्वरित निस्तारण',
      descEn: 'Empowers Jaipur residents across all 9 zones to file geo-verified grievances with automatic routing to JMC Heritage, JMC Greater, JDA, or Traffic Police.',
      descHi: 'सभी 9 ज़ोन के नागरिकों को फोटो व जीपीएस युक्त शिकायत दर्ज करने की सुविधा देता है, जो सीधे संबंधित विभाग को स्वतः अग्रेषित हो जाती हैं।',
      icon: HeartHandshake,
    },
    {
      titleEn: 'Multi-Agent Autonomous Intelligence',
      titleHi: 'स्वायत्त मल्टी-एजेंट बुद्धिमत्ता',
      descEn: 'Employs automated cross-correlation agents to discover cascading urban failures—such as pipeline leaks causing traffic congestion or festival surges overloading metro stations.',
      descHi: 'नागरिक सेवाओं के बीच अंतर-संबंधों की खोज करता है—जैसे पाइपलाइन फटने से सड़क धंसना व जाम लगना, या तीज उत्सव पर मेट्रो स्टेशनों पर अत्यधिक भीड़।',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#280D1F] p-6 sm:p-10 border border-[#E0F2F5] dark:border-[#521E3B] text-center shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#CCF1F4] text-[#0891B2] dark:text-[#38BDF8] text-xs font-bold mb-3 border border-[#CCF1F4] dark:border-[#521E3B]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{language === 'hi' ? 'जयपुर की नब्ज़ – स्मार्ट म्युनिसिपल इंटेलिजेंस' : 'Jaipur ki Nabz – Smart Municipal Intelligence'}</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F3E48] dark:text-[#FFD1DC] tracking-tight">
            {t('aboutTitle')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#3E6B75] dark:text-[#E3B0C4] leading-relaxed">
            {t('aboutSubtitle')}
          </p>
        </div>
      </div>

      {/* 2. SVG ARCHITECTURE DIAGRAM (Spec 8.6) */}
      <JharokhaCard
        title={t('aboutArchTitle')}
        subtitle={t('aboutArchSubtitle')}
        variant="elevated"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--jaipur-text-secondary)]">
            {language === 'hi'
              ? 'प्रणाली का संपूर्ण डेटा प्रवाह: 8 विभिन्न स्रोतों (गूगल रूट्स ट्रैफ़िक सहित) से टेलीमेट्री अंतर्ग्रहण → एडेप्टर द्वारा मानकीकरण → कैनोनिकल इवेंट स्टोर → पल्स व विसंगति इंजन → नब्ज़ एजेंट व जेमिनी विश्लेषण → नागरिक डैशबोर्ड, गूगल मैप्स जीआईएस व स्टाफ कंसोल।'
              : 'End-to-end data processing pipeline: 8 heterogeneous telemetry feeds (including Google Routes API for 8 arterial corridors) → normalization via typed adapters → canonical Event Store → Pulse & Correlation Engine → Nabz Agent & Gemini AI → Google Maps GIS, Resident & Staff views.'}
          </p>

          {/* SVG Diagram Canvas */}
          <div className="w-full overflow-x-auto rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60 p-4">
            <svg
              viewBox="0 0 960 300"
              className="w-full min-w-[800px] h-auto select-none"
              style={{ maxHeight: '340px' }}
            >
              <defs>
                <linearGradient id="gradFeeds" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1d6a78" />
                  <stop offset="100%" stopColor="#12434d" />
                </linearGradient>
                <linearGradient id="gradAdapters" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d49a3d" />
                  <stop offset="100%" stopColor="#b97d2e" />
                </linearGradient>
                <linearGradient id="gradStore" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d97757" />
                  <stop offset="100%" stopColor="#9d3e23" />
                </linearGradient>
                <linearGradient id="gradEngine" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#5b21b6" />
                </linearGradient>
                <linearGradient id="gradAgent" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#db2777" />
                  <stop offset="100%" stopColor="#9d174d" />
                </linearGradient>
                <linearGradient id="gradFrontends" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--jaipur-text-muted)" />
                </marker>
              </defs>

              {/* Connecting Flow Lines */}
              <line x1="140" y1="150" x2="185" y2="150" stroke="var(--jaipur-border-strong)" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />
              <line x1="305" y1="150" x2="350" y2="150" stroke="var(--jaipur-border-strong)" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />
              <line x1="470" y1="150" x2="515" y2="150" stroke="var(--jaipur-border-strong)" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />
              <line x1="635" y1="150" x2="680" y2="150" stroke="var(--jaipur-border-strong)" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />
              <line x1="800" y1="150" x2="845" y2="150" stroke="var(--jaipur-border-strong)" strokeWidth="2.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />

              {/* STAGE 1: Heterogeneous Feeds */}
              <g transform="translate(20, 45)">
                <rect width="120" height="210" rx="14" fill="url(#gradFeeds)" opacity="0.95" />
                <rect x="0" y="0" width="120" height="210" rx="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4" />
                <text x="60" y="28" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="sans-serif">
                  {language === 'hi' ? '1. विविध फीड्स' : '1. Raw Feeds'}
                </text>
                <text x="60" y="43" textAnchor="middle" fill="#a5f3fc" fontSize="9" fontFamily="monospace">
                  (8 Data Streams)
                </text>
                <g transform="translate(10, 56)" fontSize="8.5" fill="#f0fdf4" fontFamily="sans-serif">
                  <text y="0">• Open-Meteo API</text>
                  <text y="17">• CPCB Air AQI</text>
                  <g transform="translate(0, 34)">
                    <text y="0" fill="#fde68a" fontWeight="bold">• Google Routes API</text>
                    <rect x="86" y="-8" width="22" height="9" rx="2.5" fill="#10b981" />
                    <text x="97" y="-1" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold" fontFamily="sans-serif">LIVE</text>
                  </g>
                  <text y="51">• JMRC Pink Line</text>
                  <text y="68">• ITMS Traffic Cam</text>
                  <text y="85">• PHED SCADA</text>
                  <text y="102">• JVVNL Grid Feed</text>
                  <text y="119">• Citizen Reports</text>
                </g>
              </g>

              {/* STAGE 2: Adapters (Normalization) */}
              <g transform="translate(185, 55)">
                <rect width="120" height="190" rx="14" fill="url(#gradAdapters)" opacity="0.95" />
                <rect x="0" y="0" width="120" height="190" rx="14" fill="none" stroke="#fcd34d" strokeWidth="1.5" opacity="0.4" />
                <text x="60" y="30" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="sans-serif">
                  {language === 'hi' ? '2. डेटा एडेप्टर' : '2. Adapters'}
                </text>
                <text x="60" y="46" textAnchor="middle" fill="#fef3c7" fontSize="9" fontFamily="monospace">
                  (Typed Transforms)
                </text>
                <g transform="translate(10, 65)" fontSize="9" fill="#ffffff" fontFamily="sans-serif">
                  <text y="0">• JSON Schema Validation</text>
                  <text y="20">• Zone Geocoding</text>
                  <text y="40">• Severity Normalizer</text>
                  <text y="60">• Unit Conversion</text>
                  <text y="80">• Coordinate Snapping</text>
                  <text y="100" fill="#fde68a" fontWeight="bold">→ CivicEvent Output</text>
                </g>
              </g>

              {/* STAGE 3: Canonical Event Store */}
              <g transform="translate(350, 65)">
                <rect width="120" height="170" rx="14" fill="url(#gradStore)" opacity="0.95" />
                <rect x="0" y="0" width="120" height="170" rx="14" fill="none" stroke="#fda4af" strokeWidth="1.5" opacity="0.4" />
                <text x="60" y="30" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="sans-serif">
                  {language === 'hi' ? '3. इवेंट स्टोर' : '3. Event Store'}
                </text>
                <text x="60" y="46" textAnchor="middle" fill="#ffe4e6" fontSize="9" fontFamily="monospace">
                  (In-Memory Cache)
                </text>
                <g transform="translate(10, 65)" fontSize="9" fill="#ffffff" fontFamily="sans-serif">
                  <text y="0">• Rolling 30-min Window</text>
                  <text y="20">• Deterministic Replay</text>
                  <text y="40">• Indexed by Zone & Cat</text>
                  <text y="60">• Max 500 Canonical Evts</text>
                  <text y="80">• Reactive Subscribers</text>
                </g>
              </g>

              {/* STAGE 4: Intelligence Engine */}
              <g transform="translate(515, 45)">
                <rect width="120" height="210" rx="14" fill="url(#gradEngine)" opacity="0.95" />
                <rect x="0" y="0" width="120" height="210" rx="14" fill="none" stroke="#c4b5fd" strokeWidth="1.5" opacity="0.4" />
                <text x="60" y="30" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="sans-serif">
                  {language === 'hi' ? '4. नब्ज़ इंजन' : '4. Nabz Engine'}
                </text>
                <text x="60" y="46" textAnchor="middle" fill="#ddd6fe" fontSize="9" fontFamily="monospace">
                  (Analytical Core)
                </text>
                <g transform="translate(10, 65)" fontSize="9" fill="#ffffff" fontFamily="sans-serif">
                  <text y="0" fontWeight="bold" fill="#fbcfe8">• Pulse Score (0-100)</text>
                  <text y="20">• Pop-Weighted Bands</text>
                  <text y="40" fontWeight="bold" fill="#fbcfe8">• Anomaly Detection</text>
                  <text y="60">• Cross-Correlations</text>
                  <text y="80">• Grievance DBSCAN</text>
                  <text y="100">• 10s Evaluation Loop</text>
                  <text y="120">• Health Heartbeat ECG</text>
                </g>
              </g>

              {/* STAGE 5: Nabz Agent + Gemini */}
              <g transform="translate(680, 55)">
                <rect width="120" height="190" rx="14" fill="url(#gradAgent)" opacity="0.95" />
                <rect x="0" y="0" width="120" height="190" rx="14" fill="none" stroke="#f472b6" strokeWidth="1.5" opacity="0.4" />
                <text x="60" y="30" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="sans-serif">
                  {language === 'hi' ? '5. स्वायत्त एजेंट' : '5. Nabz Agent'}
                </text>
                <text x="60" y="46" textAnchor="middle" fill="#fce7f3" fontSize="9" fontFamily="monospace">
                  (& Gemini AI)
                </text>
                <g transform="translate(10, 65)" fontSize="9" fill="#ffffff" fontFamily="sans-serif">
                  <text y="0">• Autonomous 60s Cycle</text>
                  <text y="20">• Multi-System Triage</text>
                  <text y="40">• Escalation Flags</text>
                  <text y="60">• Cross-Dept Action Plans</text>
                  <text y="80">• Bilingual Summaries</text>
                  <text y="100">• De-duplication Rule</text>
                </g>
              </g>

              {/* STAGE 6: Civic Views (Resident & Staff) */}
              <g transform="translate(845, 55)">
                <rect width="105" height="190" rx="14" fill="url(#gradFrontends)" opacity="0.95" />
                <rect x="0" y="0" width="105" height="190" rx="14" fill="none" stroke="#6ee7b7" strokeWidth="1.5" opacity="0.4" />
                <text x="52.5" y="30" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="11" fontFamily="sans-serif">
                  {language === 'hi' ? '6. नागरिक व निगम' : '6. Dashboards'}
                </text>
                <text x="52.5" y="46" textAnchor="middle" fill="#a7f3d0" fontSize="8.5" fontFamily="monospace">
                  (Frontend Apps)
                </text>
                <g transform="translate(8, 62)" fontSize="8" fill="#ffffff" fontFamily="sans-serif">
                  <text y="0">• Pulse Dashboard</text>
                  <text y="18" fill="#a7f3d0" fontWeight="bold">• Google Maps Platform</text>
                  <text y="36">• Traffic Layer / Places</text>
                  <text y="54">• Resident Portal</text>
                  <text y="72">• Staff Operations</text>
                  <text y="90">• 7-Day Replay Tool</text>
                  <text y="108">• Grounding Explorer</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </JharokhaCard>

      {/* 3. DATA PIPELINE SECTION: RAW VS NORMALIZED (Spec 8.6) */}
      <JharokhaCard
        title={t('aboutPipelineTitle')}
        subtitle={t('aboutPipelineSubtitle')}
        variant="default"
      >
        <div className="space-y-6">
          {/* Feed Selector Pills */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-[var(--jaipur-border)]">
            {PIPELINE_SAMPLES.map((sample) => {
              const isSelected = selectedPipelineId === sample.id;
              const isLive = sample.sourceType === 'live_api';
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => setSelectedPipelineId(sample.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--jaipur-terracotta)] text-white shadow-sm ring-2 ring-[var(--jaipur-terracotta)]/40'
                      : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] hover:bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)]'
                  }`}
                >
                  <span>{language === 'hi' ? sample.nameHi : sample.nameEn}</span>
                  {isLive && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-mono text-[9px] font-extrabold tracking-wider">
                      LIVE API
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Highlighted Banner for Live Google Routes & Open-Meteo APIs */}
          {selectedPipeline.sourceType === 'live_api' && (
            <div className="p-3.5 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-extrabold text-xs tracking-wider">
                  LIVE API
                </span>
                <span className="font-bold text-xs sm:text-sm text-[var(--jaipur-text)]">
                  {language === 'hi' ? selectedPipeline.nameHi : selectedPipeline.nameEn}
                </span>
              </div>
              <div className="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Last Updated: {lastUpdatedTime}</span>
              </div>
            </div>
          )}

          {/* Explanation Text */}
          <div className="p-3.5 rounded-xl bg-[var(--jaipur-surface-warm)]/80 border border-[var(--jaipur-border)] text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
            <span className="font-bold text-[var(--jaipur-text)]">
              {language === 'hi' ? 'डेटा ट्रांसफॉर्मेशन विवरण: ' : 'Pipeline Transformation: '}
            </span>
            {language === 'hi' ? selectedPipeline.explanationHi : selectedPipeline.explanationEn}
          </div>

          {/* Side-by-Side Code Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Raw Ingested JSON */}
            <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[#F0FCFD] dark:bg-black/50 overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2 border-b border-[var(--jaipur-border)] bg-[#CCF1F4] dark:bg-[var(--jaipur-surface-warm)] flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[#0F3E48] dark:text-[var(--jaipur-text)] flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-rose-500" />
                  <span>{t('aboutPipelineRaw')}</span>
                </span>
                <span className="font-mono text-[10px] text-[#3E6B75] dark:text-[var(--jaipur-text-muted)] uppercase font-semibold">
                  {selectedPipeline.sourceType}
                </span>
              </div>
              <pre className="p-4 font-mono text-[11px] leading-relaxed text-[#1F4E5A] dark:text-[var(--jaipur-text)] overflow-x-auto max-h-[360px]">
                {JSON.stringify(selectedPipeline.rawPayload, null, 2)}
              </pre>
            </div>

            {/* Normalized CivicEvent JSON */}
            <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[#F0FCFD] dark:bg-black/50 overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2 border-b border-[var(--jaipur-border)] bg-[#CCF1F4] dark:bg-[var(--jaipur-surface-warm)] flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{t('aboutPipelineNormalized')}</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                  CANONICAL SCHEMA
                </span>
              </div>
              <pre className="p-4 font-mono text-[11px] leading-relaxed text-[#1F4E5A] dark:text-[var(--jaipur-text)] overflow-x-auto max-h-[360px]">
                {JSON.stringify(selectedPipeline.normalizedEvent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </JharokhaCard>

      {/* 4. CORE PLATFORM PILLARS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <JharokhaCard
              key={idx}
              title={language === 'hi' ? pillar.titleHi : pillar.titleEn}
              variant="default"
              badge={
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--jaipur-terracotta)]/10 text-[var(--jaipur-terracotta)]">
                  0{idx + 1}
                </span>
              }
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] flex items-center justify-center text-[var(--jaipur-terracotta)] shrink-0 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-[var(--jaipur-text-secondary)] leading-relaxed">
                  {language === 'hi' ? pillar.descHi : pillar.descEn}
                </p>
              </div>
            </JharokhaCard>
          );
        })}
      </div>

      <BlockPrintDivider />

      {/* 5. DATA SOURCES & DISCLAIMERS (Spec 8.6) */}
      <JharokhaCard
        title={t('aboutDisclaimersTitle')}
        subtitle={language === 'hi' ? 'पारदर्शिता, डेटा उत्पत्ति एवं एआई उपयोग की सीमाएं' : 'Methodological transparency, data origins, and ethical boundaries'}
        variant="terracotta"
      >
        <div className="space-y-4 text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <ExternalLink className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--jaipur-text)] mb-0.5">
                {language === 'hi' ? '1. गूगल मैप्स प्लेटफॉर्म (रूट्स, प्लेसेस, ऑटो-कम्प्लीट, जियोकोडिंग)' : '1. Google Maps Platform (Routes, Places, Autocomplete, Geocoding)'}
              </h4>
              <p>{t('aboutDisclaimerGoogleMaps')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60">
            <Radio className="h-4 w-4 text-[var(--jaipur-peacock)] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--jaipur-text)] mb-0.5">
                {language === 'hi' ? '2. लाइव ओपन-मेटियो मौसम व वायु गुणवत्ता' : '2. Live Open-Meteo Weather & Air Quality API'}
              </h4>
              <p>{t('aboutDisclaimerWeather')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--jaipur-text)] mb-0.5">
                {language === 'hi' ? '3. एक्यूआई मॉडलिंग अस्वीकरण (Not CPCB Official)' : '3. AQI Modeling Disclaimer (Not Official CPCB)'}
              </h4>
              <p>{t('aboutDisclaimerAqi')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60">
            <Cpu className="h-4 w-4 text-[var(--jaipur-sandstone)] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--jaipur-text)] mb-0.5">
                {language === 'hi' ? '4. सिम्युलेटेड टेलीमेट्री स्ट्रीम्स' : '4. Realistic Simulated Municipal Telemetry Streams'}
              </h4>
              <p>{t('aboutDisclaimerSimulation')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60">
            <Layers className="h-4 w-4 text-[var(--jaipur-terracotta)] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--jaipur-text)] mb-0.5">
                {language === 'hi' ? '5. सह-संबंध बनाम कारण (Possible Links, Not Causes)' : '5. Correlation vs Causation (Possible Links, Not Causes)'}
              </h4>
              <p>{t('aboutDisclaimerCorrelations')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
            <ShieldCheck className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--jaipur-text)] mb-0.5">
                {language === 'hi' ? '6. एआई सिफारिशों का मानवीय सत्यापन आवश्यक' : '6. Mandatory Human-in-the-Loop Verification for AI Flags'}
              </h4>
              <p>{t('aboutDisclaimerAgent')}</p>
            </div>
          </div>
        </div>
      </JharokhaCard>

      {/* 6. PRIVACY STATEMENT (Spec 8.6) */}
      <JharokhaCard
        title={t('aboutPrivacyTitle')}
        subtitle={language === 'hi' ? 'नागरिक अधिकारों व डेटा गोपनीयता का पूर्ण सम्मान' : 'Adherence to privacy-by-design principles and data protection'}
        variant="default"
      >
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-[var(--jaipur-text-secondary)] leading-relaxed">
              {t('aboutPrivacyDesc')}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-[11px] font-mono text-[var(--jaipur-text-secondary)]">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>No Aadhaar or Financial Identifiers</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-[11px] font-mono text-[var(--jaipur-text-secondary)]">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Explicit GPS Authorization Only</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-[11px] font-mono text-[var(--jaipur-text-secondary)]">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Sanitized Public Incident Records</span>
              </span>
            </div>
          </div>
        </div>
      </JharokhaCard>

      {/* 7. CREDITS & TEAM ACKNOWLEDGEMENT */}
      <div className="p-6 rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] text-center space-y-2 shadow-sm">
        <h4 className="font-display font-bold text-base text-[var(--jaipur-text)]">
          {t('aboutCreditsTitle')}
        </h4>
        <p className="text-xs text-[var(--jaipur-text-secondary)] max-w-2xl mx-auto">
          {t('aboutCreditsDesc')}
        </p>
        <p className="text-[11px] font-mono text-[var(--jaipur-text-muted)] pt-1">
          CityPulse Jaipur • Version 1.0 (Hackathon Edition) • Jaipur Smart City Mission
        </p>
      </div>
    </div>
  );
};
