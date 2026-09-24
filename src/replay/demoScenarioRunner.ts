/**
 * CityPulse Jaipur – Live Demo Scenario Injection Engine (Spec 8.5)
 *
 * Implements 6 progressive live-injected scenarios (staged over 60–90 seconds):
 * 1. Monsoon flash flood (Walled City + Malviya Nagar)
 * 2. Summer heatwave (Mansarovar + Vaishali Nagar)
 * 3. Dust storm (Jhotwara + Sitapura)
 * 4. Festival rush (Teej/Gangaur in Walled City + Amer)
 * 5. Diwali night smog (Citywide Severe AQI)
 * 6. Industrial pollution spike (Sitapura)
 *
 * Overrides live weather/AQI with [DEMO] tag, recalculates pulse, and triggers
 * immediate Nabz Agent cycle and Gemini summary refresh.
 */

import { JAIPUR_ZONES } from '../config/city';
import { useAppStore } from '../store/useAppStore';
import { nabzAgent } from '../agent/nabzAgent';
import { summaryCoordinator } from '../engine/summaryCoordinator';
import { calculateAllPulseScores } from '../engine/pulseScore';
import { detectAnomalies } from '../engine/anomaly';
import { detectCorrelations } from '../engine/correlation';
import { detectClusters } from '../engine/clustering';
import {
  CivicEvent,
  DemoScenarioDefinition,
  DemoScenarioId,
  ZoneWeatherAQI,
} from '../types';

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    id: 'monsoon_flood',
    titleEn: 'Monsoon Flash Flood Crisis',
    titleHi: 'मानसून अतिवृष्टि व जलभराव आपातकाल',
    category: 'water',
    zones: ['walled_city', 'malviya_nagar'],
    durationSeconds: 60,
    descriptionEn: 'Very heavy rain alert (74mm/h) → Waterlogging burst at Badi Chaupar & Chandpole → Pink Line metro & Tonk Rd delays → 11kV Substation trip.',
    descriptionHi: 'मूसलाधार वर्षा चेतावनी (74मिमी) → बड़ी चौपड़ व चांदपोल पर जलभराव → मेट्रो व टोंक रोड पर गति अवरोध → 11केवी सबस्टेशन ट्रिप।',
    iconName: 'CloudRain',
    weatherOverride: {
      rainMm: 74.5,
      precipitationMm: 74.5,
      temperatureC: 24.2,
      weatherDescEn: '[DEMO] Extreme Monsoon Cloudburst (74mm/h)',
      weatherDescHi: '[डेमो] मूसलाधार अतिवृष्टि (74मिमी/घंटा)',
    },
  },
  {
    id: 'summer_heatwave',
    titleEn: '46.5°C Summer Heatwave',
    titleHi: '46.5°C भीषण ग्रीष्मकालीन लू संकट',
    category: 'power',
    zones: ['mansarovar', 'vaishali_nagar'],
    durationSeconds: 60,
    descriptionEn: 'Extreme 46.5°C ambient heatwave → Multiple transformer overloads → Cascading booster pump drinking water supply failure.',
    descriptionHi: 'भीषण 46.5°C तापमान → विद्युत ग्रिड व ट्रांसफार्मर ओवरलोड → पेयजल आपूर्ति ट्यूबवेल बंद।',
    iconName: 'Sun',
    weatherOverride: {
      temperatureC: 46.5,
      rainMm: 0,
      weatherDescEn: '[DEMO] Severe 46.5°C Loo Heatwave Advisory',
      weatherDescHi: '[डेमो] 46.5°C भीषण लू का प्रकोप',
    },
  },
  {
    id: 'dust_storm',
    titleEn: '65 km/h Western Dust Storm (Andhi)',
    titleHi: '65 किमी/घंटा पश्चिमी धूल भरी आंधी (आंधी)',
    category: 'traffic',
    zones: ['jhotwara', 'sitapura'],
    durationSeconds: 60,
    descriptionEn: 'Gale wind gusts 65 km/h → PM10 spikes to 420 (Very Poor) → Sikar Road bus corridor standstill + Streetlight wiring damage.',
    descriptionHi: '65 किमी/घंटा धूल भरी आंधी → पीएम10 420 (अति गंभीर) → सीकर रोड बस यातायात बाधित व स्ट्रीटलाइट क्षति।',
    iconName: 'Wind',
    weatherOverride: {
      windSpeedKmh: 45,
      windGustsKmh: 65,
      pm10: 425,
      pm25: 180,
      aqi: 390,
      aqiCategory: 'Very Poor',
      weatherDescEn: '[DEMO] Severe Dust Squall & Gale Gusts',
      weatherDescHi: '[डेमो] तीव्र धूल भरी आंधी व तेज हवाएं',
    },
  },
  {
    id: 'festival_procession',
    titleEn: 'Royal Teej / Gangaur Procession Rush',
    titleHi: 'तीज माता की शाही सवारी व भारी भीड़',
    category: 'crowd',
    zones: ['walled_city', 'amer'],
    durationSeconds: 60,
    descriptionEn: 'Royal procession along Tripolia Bazar → Chhoti Chaupar metro gate overcrowding → Ajmeri Gate bus diversions → Garbage & noise spike.',
    descriptionHi: 'शाही लवाजमा व शोभायात्रा → छोटी चौपड़ मेट्रो पर कतारें → अजमेरी गेट पर ट्रैफिक डायवर्जन → कचरा व ध्वनि शिकायतें।',
    iconName: 'Users',
    weatherOverride: {
      temperatureC: 30.5,
      rainMm: 0,
      weatherDescEn: '[DEMO] Festive Autumn Gathering',
      weatherDescHi: '[डेमो] त्यौहारी माहौल',
    },
  },
  {
    id: 'diwali_smog',
    titleEn: 'Diwali Night Severe Smog & AQI Crisis',
    titleHi: 'दीपावली रात्रि धुआं व गंभीर वायु प्रदूषण',
    category: 'air_quality',
    zones: ['walled_city', 'mansarovar', 'vaishali_nagar', 'sanganer', 'malviya_nagar', 'civil_lines', 'c_scheme', 'vidhyadhar_nagar', 'jhotwara'],
    durationSeconds: 60,
    descriptionEn: 'Citywide post-Diwali smoke accumulation → AQI spikes to 445 (Severe) across all 9 zones → Reduced street visibility & respiratory alert.',
    descriptionHi: 'शहरभर में आतिशबाजी का धुआं → 9 क्षेत्रों में एक्यूआई 445 (गंभीर) → विजिबिलिटी में भारी कमी व स्वास्थ्य सलाह।',
    iconName: 'Flame',
    weatherOverride: {
      pm25: 380,
      pm10: 490,
      aqi: 445,
      aqiCategory: 'Severe',
      weatherDescEn: '[DEMO] Hazardous Diwali Toxic Smog (AQI 445)',
      weatherDescHi: '[डेमो] दीपावली के बाद गंभीर जहरीला स्मॉग (AQI 445)',
    },
  },
  {
    id: 'industrial_pollution',
    titleEn: 'Sitapura Industrial Emission Anomaly',
    titleHi: 'सीतापुरा औद्योगिक क्षेत्र प्रदूषण उछाल',
    category: 'air_quality',
    zones: ['sitapura'],
    durationSeconds: 60,
    descriptionEn: 'Sudden VOC & PM2.5 emissions spike at Sitapura RIICO industrial area → Localized AQI jumps to 395 → Ambient air monitoring alert.',
    descriptionHi: 'रीको सीतापुरा क्षेत्र में औद्योगिक उत्सर्जन → एक्यूआई बढ़कर 395 पर → स्थानीय वायु गुणवत्ता जांच टीम सतर्क।',
    iconName: 'AlertTriangle',
    weatherOverride: {
      pm25: 310,
      pm10: 360,
      aqi: 395,
      aqiCategory: 'Very Poor',
      weatherDescEn: '[DEMO] Localized Industrial Chemical Plume',
      weatherDescHi: '[डेमो] सीतापुरा औद्योगिक उत्सर्जन प्रभाव',
    },
  },
];

class DemoScenarioRunner {
  private static instance: DemoScenarioRunner | null = null;
  private activeTimers: NodeJS.Timeout[] = [];
  private activeScenarioId: DemoScenarioId | null = null;
  private originalWeatherSnapshot: Record<string, ZoneWeatherAQI> | null = null;

  public static getInstance(): DemoScenarioRunner {
    if (!DemoScenarioRunner.instance) {
      DemoScenarioRunner.instance = new DemoScenarioRunner();
    }
    return DemoScenarioRunner.instance;
  }

  public getActiveScenarioId(): DemoScenarioId | null {
    return this.activeScenarioId;
  }

  /**
   * Run a demo scenario by injecting staged events and overriding weather readings
   */
  public runScenario(scenarioId: DemoScenarioId) {
    this.resetScenario(); // Clear any existing demo first

    const def = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!def) return;

    this.activeScenarioId = scenarioId;
    const store = useAppStore.getState();

    // Cache original weather for restoration
    if (!this.originalWeatherSnapshot) {
      this.originalWeatherSnapshot = { ...store.zoneWeatherAQI };
    }

    // 1. Override Weather for affected zones
    if (def.weatherOverride) {
      const updatedWeather = { ...store.zoneWeatherAQI };
      def.zones.forEach((zId) => {
        if (updatedWeather[zId]) {
          updatedWeather[zId] = {
            ...updatedWeather[zId],
            ...def.weatherOverride,
            origin: 'simulated',
          };
        }
      });
      useAppStore.setState({ zoneWeatherAQI: updatedWeather });
    }

    // 2. Stage 1: Immediate First Event Injection (T = 0s)
    this.injectStageEvents(scenarioId, 1);

    // 3. Stage 2 (T = 15s)
    const t2 = setTimeout(() => {
      this.injectStageEvents(scenarioId, 2);
    }, 15000);
    this.activeTimers.push(t2);

    // 4. Stage 3 (T = 30s)
    const t3 = setTimeout(() => {
      this.injectStageEvents(scenarioId, 3);
    }, 30000);
    this.activeTimers.push(t3);

    // 5. Stage 4 (T = 45s)
    const t4 = setTimeout(() => {
      this.injectStageEvents(scenarioId, 4);
    }, 45000);
    this.activeTimers.push(t4);

    // Recalculate everything and trigger immediate agent and summary refresh
    this.recalculateAndTrigger(def.titleEn);

    store.addToast({
      title: `[DEMO ACTIVE] ${def.titleEn}`,
      message: `Injecting scripted multi-source telemetric telemetry over 60s.`,
      type: 'warning',
    });
  }

  /**
   * Reset active demo and restore telemetry to baseline
   */
  public resetScenario() {
    this.activeTimers.forEach((t) => clearTimeout(t));
    this.activeTimers = [];

    if (!this.activeScenarioId) return;

    const store = useAppStore.getState();
    const prevScenario = this.activeScenarioId;
    this.activeScenarioId = null;

    // Filter out all demo events
    const cleanEvents = store.events.filter((e) => !e.metadata?.isDemo);

    // Restore original weather
    const cleanWeather = this.originalWeatherSnapshot || store.zoneWeatherAQI;
    this.originalWeatherSnapshot = null;

    // Recompute engine state
    const newPulse = calculateAllPulseScores(
      cleanEvents,
      cleanWeather,
      store.feedStatuses,
      store.disabledFeedIds,
      store.pulseMetrics.pulseHistory
    );
    const newAnomalies = detectAnomalies(cleanEvents, cleanWeather);
    const newCorrelations = detectCorrelations(newAnomalies, cleanEvents, cleanWeather);
    const newClusters = detectClusters(cleanEvents);

    useAppStore.setState({
      events: cleanEvents,
      zoneWeatherAQI: cleanWeather,
      pulseMetrics: newPulse,
      anomalies: newAnomalies,
      correlations: newCorrelations,
      clusters: newClusters,
    });

    // Refresh agent and summary back to baseline
    setTimeout(() => {
      nabzAgent.runCycle('demo_reset');
      summaryCoordinator.refreshCitySummary();
    }, 500);

    store.addToast({
      title: 'Demo Scenario Reset',
      message: `Cleared demo anomalies and restored live baseline telemetry.`,
      type: 'success',
    });
  }

  /**
   * Inject specific staged events for a given scenario
   */
  private injectStageEvents(scenarioId: DemoScenarioId, stage: number) {
    const store = useAppStore.getState();
    const now = Date.now();
    const newEvents: CivicEvent[] = [];

    switch (scenarioId) {
      case 'monsoon_flood': {
        if (stage === 1) {
          // Weather alert
          newEvents.push({
            id: `DEMO-EV-MF-${stage}-1`,
            timestamp: now,
            zoneId: 'walled_city',
            category: 'water',
            severity: 'critical',
            titleEn: '[DEMO] Torrential 74mm Cloudburst & Flash Flood Warning',
            titleHi: '[डेमो] 74मिमी मूसलाधार अतिवृष्टि व आकस्मिक बाढ़ चेतावनी',
            descriptionEn: 'Severe precipitation rate 74mm/h recorded at City Palace meteorological station.',
            descriptionHi: 'सिटी पैलेस मौसम केंद्र पर 74मिमी/घंटा वर्षा दर्ज।',
            locationName: 'City Palace, Walled City',
            coordinates: { lat: 26.9258, lng: 75.8237 },
            source: 'weather_station',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        } else if (stage === 2) {
          // Waterlogging complaints at Badi Chaupar & Chandpole
          newEvents.push({
            id: `DEMO-EV-MF-${stage}-1`,
            timestamp: now,
            zoneId: 'walled_city',
            category: 'water',
            severity: 'critical',
            titleEn: '[DEMO] Severe 2.5ft Waterlogging at Badi Chaupar & Chandpole Gate',
            titleHi: '[डेमो] बड़ी चौपड़ व चांदपोल गेट पर 2.5 फीट जलभराव',
            descriptionEn: 'Grave water accumulation blocking vehicular movement around Hawa Mahal and Tripolia.',
            descriptionHi: 'हवा महल व त्रिपोलिया बाज़ार में भारी जलभराव से यातायात ठप।',
            locationName: 'Badi Chaupar, Walled City',
            coordinates: { lat: 26.9239, lng: 75.8267 },
            source: 'resident_report',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        } else if (stage === 3) {
          // Transit metro & Tonk road bus delay
          newEvents.push({
            id: `DEMO-EV-MF-${stage}-1`,
            timestamp: now,
            zoneId: 'walled_city',
            category: 'transit',
            severity: 'critical',
            titleEn: '[DEMO] Pink Line Metro Speed Restricted & Chhoti Chaupar Gate Flooding',
            titleHi: '[डेमो] पिंक लाइन मेट्रो गति सीमित व छोटी चौपड़ गेट पर जलभराव',
            descriptionEn: 'Concourse drainage overflow causes 15-minute headway delays between Chandpole and Badi Chaupar.',
            descriptionHi: 'कॉनकोर्स जल रिसाव से ट्रेनों के आवागमन में 15 मिनट का विलंब।',
            locationName: 'Chhoti Chaupar Metro Station',
            coordinates: { lat: 26.9248, lng: 75.8194 },
            source: 'metro_feed',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
          newEvents.push({
            id: `DEMO-EV-MF-${stage}-2`,
            timestamp: now,
            zoneId: 'malviya_nagar',
            category: 'traffic',
            severity: 'high',
            titleEn: '[DEMO] Tonk Road Highway Inundation near Gandhi Nagar Flyover',
            titleHi: '[डेमो] टोंक रोड गांधी नगर फ्लाईओवर के नीचे भारी जलजमाव',
            descriptionEn: 'Severe waterlogging halts city bus corridor on Tonk Road.',
            descriptionHi: 'टोंक रोड बस कॉरिडोर पर जलभराव के चलते बसें फंसीं।',
            locationName: 'Tonk Road, Malviya Nagar',
            coordinates: { lat: 26.8789, lng: 75.8089 },
            source: 'traffic_camera',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        } else if (stage === 4) {
          // Feeder outage
          newEvents.push({
            id: `DEMO-EV-MF-${stage}-1`,
            timestamp: now,
            zoneId: 'walled_city',
            category: 'power',
            severity: 'critical',
            titleEn: '[DEMO] 11kV Feeder Outage at Tripolia Bazar Substation',
            titleHi: '[डेमो] त्रिपोलिया बाज़ार 11केवी फीडर में जल प्रवेश से विद्युत आपूर्ति ठप',
            descriptionEn: 'Water ingress into sub-surface transformer box trips 4,500 connections across Johari & Tripolia.',
            descriptionHi: 'ट्रांसफार्मर बॉक्स में पानी भरने से 4,500 उपभोक्ताओं की बिजली गुल।',
            locationName: 'Tripolia Bazar Substation',
            coordinates: { lat: 26.9241, lng: 75.8211 },
            source: 'power_grid',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        }
        break;
      }

      case 'summer_heatwave': {
        if (stage === 1) {
          newEvents.push({
            id: `DEMO-EV-SH-${stage}-1`,
            timestamp: now,
            zoneId: 'mansarovar',
            category: 'power',
            severity: 'critical',
            titleEn: '[DEMO] 46.5°C Ambient Peak Triggers Distribution Grid Thermal Alarm',
            titleHi: '[डेमो] 46.5°C तापमान पर विद्युत वितरण ग्रिड थर्मल अलार्म',
            descriptionEn: 'SCADA monitoring indicates transformer core temperatures exceeding 92°C.',
            descriptionHi: 'मानसरोवर सबस्टेशन ट्रांसफार्मर तापमान 92°C के पार।',
            locationName: 'Varun Path Substation, Mansarovar',
            coordinates: { lat: 26.8528, lng: 75.7689 },
            source: 'power_grid',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        } else if (stage === 2) {
          newEvents.push({
            id: `DEMO-EV-SH-${stage}-1`,
            timestamp: now,
            zoneId: 'mansarovar',
            category: 'power',
            severity: 'critical',
            titleEn: '[DEMO] Multiple 33kV Transformer Outages in Mansarovar & Vaishali Nagar',
            titleHi: '[डेमो] मानसरोवर व वैशाली नगर में 33केवी ट्रांसफार्मर ट्रिप',
            descriptionEn: 'Over 8,200 households affected by heatwave-induced phase breakdown.',
            descriptionHi: 'अत्यधिक एसी लोड व गर्मी से 8,200 घरों में बिजली गुल।',
            locationName: 'Sector 7, Mansarovar',
            coordinates: { lat: 26.855, lng: 75.765 },
            source: 'power_grid',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        } else {
          newEvents.push({
            id: `DEMO-EV-SH-${stage}-1`,
            timestamp: now,
            zoneId: 'vaishali_nagar',
            category: 'water',
            severity: 'critical',
            titleEn: '[DEMO] PHED Booster Pump Shutdown Triggers Drinking Water Crisis',
            titleHi: '[डेमो] पीएचडी बूस्टर पंप बंद होने से पेयजल आपूर्ति ठप',
            descriptionEn: 'Electricity trip at tube wells leaves Amrapali Circle colonies without pipeline water.',
            descriptionHi: 'बिजली जाने से नलकूप बंद, कॉलोनियों में पानी का गंभीर संकट।',
            locationName: 'Amrapali Circle, Vaishali Nagar',
            coordinates: { lat: 26.9077, lng: 75.7412 },
            source: 'resident_report',
            status: 'active',
            metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
          });
        }
        break;
      }

      case 'dust_storm': {
        newEvents.push({
          id: `DEMO-EV-DS-${stage}-1`,
          timestamp: now,
          zoneId: 'jhotwara',
          category: 'air_quality',
          severity: 'critical',
          titleEn: `[DEMO] 65 km/h Gale Dust Squall (PM10: 425) on Sikar Road (Stage ${stage})`,
          titleHi: `[डेमो] सीकर रोड पर 65 किमी/घंटा आंधी व पीएम10 425 (चरण ${stage})`,
          descriptionEn: 'Visibility drops to under 30 meters; streetlight damage reported on Niwaru Road.',
          descriptionHi: 'दृश्यता 30 मीटर से कम, स्ट्रीटलाइट के तार टूटने की सूचना।',
          locationName: 'Niwaru Road, Jhotwara',
          coordinates: { lat: 26.945, lng: 75.755 },
          source: 'weather_station',
          status: 'active',
          metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
        });
        break;
      }

      case 'festival_procession': {
        newEvents.push({
          id: `DEMO-EV-FP-${stage}-1`,
          timestamp: now,
          zoneId: 'walled_city',
          category: 'crowd',
          severity: 'high',
          titleEn: `[DEMO] Teej Royal Procession Surge: Overcrowded Chaupars (Stage ${stage})`,
          titleHi: `[डेमो] तीज माता सवारी: परकोटे में अपार जनसमूह (चरण ${stage})`,
          descriptionEn: 'Tripolia Bazar completely pedestrianized; metro stations operating at 98% density.',
          descriptionHi: 'त्रिपोलिया बाज़ार में भारी भीड़, मेट्रो स्टेशनों पर कतारें।',
          locationName: 'Tripolia Bazar to Chhoti Chaupar',
          coordinates: { lat: 26.9245, lng: 75.822 },
          source: 'smart_city_ai',
          status: 'active',
          metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
        });
        break;
      }

      case 'diwali_smog': {
        newEvents.push({
          id: `DEMO-EV-DM-${stage}-1`,
          timestamp: now,
          zoneId: 'walled_city',
          category: 'air_quality',
          severity: 'critical',
          titleEn: `[DEMO] Diwali Night Toxic Smog Inversion (AQI: 445 Severe) (Stage ${stage})`,
          titleHi: `[डेमो] दीपावली रात्रि भीषण धुआं (एक्यूआई 445 गंभीर) (चरण ${stage})`,
          descriptionEn: 'Hazardous PM2.5 and PM10 blanket city center; public health warning active.',
          descriptionHi: 'हवा में जहरीले कणों की मात्रा अत्यधिक बढ़ी, सांस रोगियों को सतर्कता की सलाह।',
          locationName: 'Jaipur Central District',
          coordinates: { lat: 26.9124, lng: 75.7873 },
          source: 'weather_station',
          status: 'active',
          metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
        });
        break;
      }

      case 'industrial_pollution': {
        newEvents.push({
          id: `DEMO-EV-IP-${stage}-1`,
          timestamp: now,
          zoneId: 'sitapura',
          category: 'air_quality',
          severity: 'critical',
          titleEn: `[DEMO] RIICO Industrial Estate Particulate & Gas Spike (AQI: 395) (Stage ${stage})`,
          titleHi: `[डेमो] रीको सीतापुरा औद्योगिक क्षेत्र में गैस व धुएं का रिसाव (एक्यूआई 395) (चरण ${stage})`,
          descriptionEn: 'Continuous ambient air sensors trigger threshold breach in Sitapura Phase III.',
          descriptionHi: 'सीतापुरा फेज 3 में प्रदूषण सेंसर ने खतरनाक स्तर दर्ज किया।',
          locationName: 'Sitapura Industrial Area Phase III',
          coordinates: { lat: 26.7725, lng: 75.8362 },
          source: 'iot_sensor',
          status: 'active',
          metadata: { isDemo: true, demoScenarioId: scenarioId, stage },
        });
        break;
      }
    }

    if (newEvents.length > 0) {
      const mergedEvents = [...newEvents, ...store.events].slice(0, 3000);
      useAppStore.setState({ events: mergedEvents });
      this.recalculateAndTrigger(`Stage ${stage} Telemetry`);
    }
  }

  /**
   * Recalculate pulse, anomalies, correlations, clusters and trigger Nabz Agent & AI Summary
   */
  private recalculateAndTrigger(label: string) {
    const store = useAppStore.getState();

    const newPulse = calculateAllPulseScores(
      store.events,
      store.zoneWeatherAQI,
      store.feedStatuses,
      store.disabledFeedIds,
      store.pulseMetrics.pulseHistory
    );
    const newAnomalies = detectAnomalies(store.events, store.zoneWeatherAQI);
    const newCorrelations = detectCorrelations(newAnomalies, store.events, store.zoneWeatherAQI);
    const newClusters = detectClusters(store.events);

    useAppStore.setState({
      pulseMetrics: newPulse,
      anomalies: newAnomalies,
      correlations: newCorrelations,
      clusters: newClusters,
    });

    // Immediate Nabz Agent cycle and summary refresh
    setTimeout(() => {
      nabzAgent.runCycle(`demo_${label.toLowerCase().replace(/\s+/g, '_')}`);
      summaryCoordinator.refreshCitySummary();
    }, 400);
  }
}

export const demoScenarioRunner = DemoScenarioRunner.getInstance();
