/**
 * CityPulse Jaipur – Deterministic 7-Day Seeded Historical Replay Dataset Generator
 *
 * Requirements (Spec 8.5):
 * 1. Pre-generate an identical-every-run 7-day dataset for all feeds.
 * 2. Raw formats passed through the same adapters (Transit, Complaints, Power, Weather).
 * 3. Embedded scenarios:
 *    - Day 2: Monsoon flash flood (Walled City + Malviya Nagar)
 *    - Day 4: Summer heatwave (Mansarovar + Vaishali Nagar)
 *    - Day 5: Dust storm (Jhotwara + Sitapura)
 *    - Day 6: Festival rush (Teej/Gangaur in Walled City + Amer)
 * 4. Timeline markers where anomalies and correlations fire for scrubber jumps.
 */

import { JAIPUR_ZONES, JAIPUR_METRO_STATIONS, JAIPUR_BUS_CORRIDORS } from '../config/city';
import { SeededRandom } from '../engine/random';
import { normalizeTransitEvent, RawTransitPayload } from '../engine/adapters/transitAdapter';
import { normalizeComplaintEvent, RawComplaintPayload } from '../engine/adapters/complaintsAdapter';
import { normalizePowerEvent, RawPowerOutagePayload } from '../engine/adapters/powerAdapter';
import {
  CivicEvent,
  ReplayTimelineMarker,
  ZoneWeatherAQI,
  AQICategory,
} from '../types';

export interface SeededReplayDataset {
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  events: CivicEvent[];
  timelineMarkers: ReplayTimelineMarker[];
  dayWeatherSnapshots: Record<number, Record<string, ZoneWeatherAQI>>; // dayIndex -> zoneId -> weather
}

// Fixed base anchor: Monday 00:00:00 IST to Sunday 23:59:59 IST (7 days)
export const REPLAY_START_MS = 1790000000000; // Deterministic epoch
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const REPLAY_END_MS = REPLAY_START_MS + 7 * ONE_DAY_MS;

/**
 * Format date for complaint adapter: "DD/MM/YYYY hh:mm A"
 */
function formatComplaintDate(timestampMs: number): string {
  const d = new Date(timestampMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
}

let cachedDataset: SeededReplayDataset | null = null;

export function get7DayReplayDataset(): SeededReplayDataset {
  if (cachedDataset) {
    return cachedDataset;
  }

  const prng = new SeededRandom(20260924);
  const events: CivicEvent[] = [];
  const timelineMarkers: ReplayTimelineMarker[] = [];
  const dayWeatherSnapshots: Record<number, Record<string, ZoneWeatherAQI>> = {};

  // Build baseline weather for 7 days
  for (let day = 1; day <= 7; day++) {
    const dayStart = REPLAY_START_MS + (day - 1) * ONE_DAY_MS;
    dayWeatherSnapshots[day] = {};

    JAIPUR_ZONES.forEach((zone) => {
      let temp = 33 + prng.nextFloat(-2, 3);
      let rain = 0;
      let aqi = 110 + prng.nextInt(-15, 20);
      let pm10 = 95 + prng.nextInt(-10, 25);
      let pm25 = 45 + prng.nextInt(-8, 15);
      let windSpeed = 12 + prng.nextFloat(-3, 4);
      let windGusts = 18 + prng.nextFloat(-2, 5);
      let weatherDesc = 'Clear sunny sky over Pink City';
      let weatherDescHi = 'जयपुर में साफ सुहावना मौसम';

      // Day 2 Scenario: Monsoon Flash Flood
      if (day === 2) {
        if (zone.id === 'walled_city' || zone.id === 'malviya_nagar' || zone.id === 'sanganer') {
          rain = 68.4;
          temp = 25.5;
          weatherDesc = 'Severe torrential monsoon cloudburst with localized waterlogging';
          weatherDescHi = 'तेज मूसलाधार मानसूनी बारिश व जलभराव';
        } else {
          rain = 22.0;
          temp = 27.0;
          weatherDesc = 'Heavy intermittent rain across district';
          weatherDescHi = 'मध्यम से तेज बारिश';
        }
      }

      // Day 4 Scenario: Summer Heatwave
      if (day === 4) {
        if (zone.id === 'mansarovar' || zone.id === 'vaishali_nagar' || zone.id === 'civil_lines') {
          temp = 46.5;
          rain = 0;
          weatherDesc = 'Extreme severe Loo heatwave wave advisory';
          weatherDescHi = 'भीषण लू व अत्यधिक तापमान चेतावनी';
        } else {
          temp = 44.2;
          weatherDesc = 'Severe hot afternoon temperatures';
          weatherDescHi = 'गर्म हवाएं व तीखी धूप';
        }
      }

      // Day 5 Scenario: Dust Storm (Andhi)
      if (day === 5) {
        if (zone.id === 'jhotwara' || zone.id === 'sitapura' || zone.id === 'vidhyadhar_nagar') {
          aqi = 385;
          pm10 = 430;
          windSpeed = 48;
          windGusts = 65;
          weatherDesc = 'Severe Thar dust storm (Andhi) with gale gusts and near-zero visibility';
          weatherDescHi = 'तीव्र धूल भरी आंधी व दृश्यता में भारी गिरावट';
        } else {
          aqi = 260;
          pm10 = 280;
          windSpeed = 35;
          windGusts = 50;
          weatherDesc = 'Dust haze with strong convective winds';
          weatherDescHi = 'धूल भरा वातावरण व तेज हवाएं';
        }
      }

      // Day 6 Scenario: Festival Procession
      if (day === 6) {
        temp = 31.0;
        weatherDesc = 'Festive autumn weather with mild breeze';
        weatherDescHi = 'उत्सव का सुहावना मौसम';
      }

      let aqiCategory: AQICategory = 'Moderate';
      let aqiCategoryHi = 'मध्यम';
      if (aqi > 400) {
        aqiCategory = 'Severe';
        aqiCategoryHi = 'गंभीर';
      } else if (aqi > 300) {
        aqiCategory = 'Very Poor';
        aqiCategoryHi = 'बहुत खराब';
      } else if (aqi > 200) {
        aqiCategory = 'Poor';
        aqiCategoryHi = 'खराब';
      } else if (aqi > 100) {
        aqiCategory = 'Moderate';
        aqiCategoryHi = 'मध्यम';
      } else {
        aqiCategory = 'Satisfactory';
        aqiCategoryHi = 'संतोषजनक';
      }

      dayWeatherSnapshots[day][zone.id] = {
        zoneId: zone.id,
        zoneNameEn: zone.nameEn,
        zoneNameHi: zone.nameHi,
        temperatureC: Number(temp.toFixed(1)),
        relativeHumidityPct: day === 2 ? 94 : day === 4 ? 22 : 45,
        apparentTemperatureC: Number((temp + (day === 2 ? 3 : 2)).toFixed(1)),
        precipitationMm: rain,
        rainMm: rain,
        weatherCode: day === 2 ? 65 : day === 5 ? 77 : 1,
        weatherDescEn: weatherDesc,
        weatherDescHi: weatherDescHi,
        weatherIcon: day === 2 ? '🌧️' : day === 4 ? '☀️' : day === 5 ? '🌪️' : '🌤️',
        windSpeedKmh: Number(windSpeed.toFixed(1)),
        windGustsKmh: Number(windGusts.toFixed(1)),
        pm25,
        pm10,
        aqi,
        aqiCategory,
        aqiCategoryHi,
        subIndexPM25: pm25 * 1.8,
        subIndexPM10: pm10 * 1.1,
        dominantPollutant: day === 5 ? 'PM10' : 'PM2.5',
        lastUpdated: dayStart + 12 * 3600 * 1000,
        origin: 'simulated',
      };
    });
  }

  // --- Generate Background Events for all 7 days through Adapters ---
  for (let day = 1; day <= 7; day++) {
    const dayStart = REPLAY_START_MS + (day - 1) * ONE_DAY_MS;

    // Routine Transit events (Pink Line + City Buses)
    for (let i = 0; i < 6; i++) {
      const timeOffset = prng.nextInt(3600 * 2, 3600 * 22) * 1000;
      const tsSec = Math.floor((dayStart + timeOffset) / 1000);
      const station = prng.choice(JAIPUR_METRO_STATIONS);

      const rawMetro: RawTransitPayload = {
        system: 'jmrc_pink_line',
        station_code: station.id,
        station_name: station.nameEn,
        line: 'pink',
        crowd_density_pct: prng.nextInt(45, 78),
        train_headway_sec: prng.nextInt(300, 480),
        delay_sec: prng.nextInt(0, 180),
        gate_entries_per_min: prng.nextInt(35, 90),
        timestamp_sec: tsSec,
      };
      events.push(normalizeTransitEvent(rawMetro));
    }

    // Routine Complaints
    for (let i = 0; i < 5; i++) {
      const timeOffset = prng.nextInt(3600 * 4, 3600 * 20) * 1000;
      const eventTs = dayStart + timeOffset;
      const zone = prng.choice(JAIPUR_ZONES);
      const rawComplaint: RawComplaintPayload = {
        complaint_id: `CMP-RPL-D${day}-${i + 100}`,
        source_channel: prng.choice(['sampark_181', 'whatsapp_bot', 'web_portal']),
        reported_at_str: formatComplaintDate(eventTs),
        location_text: `${zone.keyLandmarks[0] || zone.nameEn}, ${zone.nameEn}`,
        raw_description: `Routine civic complaint about street garbage collection in ${zone.nameEn}`,
        category_hint: 'sanitation',
        urgency_flag: false,
      };
      events.push(normalizeComplaintEvent(rawComplaint));
    }
  }

  // ==========================================
  // EMBEDDED SCENARIO 1: DAY 2 MONSOON FLASH FLOOD
  // ==========================================
  const day2Start = REPLAY_START_MS + ONE_DAY_MS;
  const floodTime = day2Start + 14 * 3600 * 1000 + 15 * 60 * 1000; // 2:15 PM IST on Day 2

  // 1. Waterlogging Complaints burst via ComplaintsAdapter
  const floodLocations = [
    { loc: 'Badi Chaupar market entrance', text: 'Grave waterlogging 2.5 feet deep, sewer backflow near Hawa Mahal Badi Chaupar', zone: 'Walled City' },
    { loc: 'Chandpole Gate underpass', text: 'Chandpole gate road completely submerged in flood water, vehicles stalled', zone: 'Walled City' },
    { loc: 'MI Road junction near Panch Batti', text: 'Water drain overflow, heavy water accumulation along MI Road commercial stretch', zone: 'Civil Lines' },
    { loc: 'Tonk Road near Gandhi Nagar', text: 'Tonk Road highway severe waterlogging, storm drain choked', zone: 'Malviya Nagar' },
    { loc: 'Sanganer culvert near Dravyavati river', text: 'Dravyavati overflow waterlogging residential colonies in Sanganer', zone: 'Sanganer' },
  ];

  floodLocations.forEach((fl, idx) => {
    const raw: RawComplaintPayload = {
      complaint_id: `CMP-FLOOD-00${idx + 1}`,
      source_channel: 'sampark_181',
      reported_at_str: formatComplaintDate(floodTime + idx * 3 * 60 * 1000),
      location_text: `${fl.loc}, ${fl.zone}`,
      raw_description: fl.text,
      category_hint: 'water',
      urgency_flag: true,
    };
    const ev = normalizeComplaintEvent(raw);
    ev.severity = 'critical';
    events.push(ev);
  });

  // 2. Metro & Transit Delays via TransitAdapter
  const rawMetroFlood: RawTransitPayload = {
    system: 'jmrc_pink_line',
    station_code: 'badi_chaupar',
    station_name: 'Badi Chaupar',
    line: 'pink',
    crowd_density_pct: 98,
    train_headway_sec: 720,
    delay_sec: 1080, // 18 min delay
    gate_entries_per_min: 140,
    timestamp_sec: Math.floor((floodTime + 10 * 60 * 1000) / 1000),
  };
  const metroEv = normalizeTransitEvent(rawMetroFlood);
  metroEv.severity = 'critical';
  metroEv.titleEn = 'Pink Line Metro Slowdown & Concourse Water Seepage at Badi Chaupar';
  metroEv.titleHi = 'बड़ी चौपड़ पर पिंक लाइन मेट्रो संचालन बाधित व जलभराव';
  events.push(metroEv);

  // 3. Power Grid Outage via PowerAdapter
  const rawPowerFlood: RawPowerOutagePayload = {
    ticket_number: 'JVVNL-FL-7712',
    substation_code: 'SS-WC-01',
    zone_name_text: 'Walled City',
    feeder_line_id: 'FEEDER-TRIPOLIA-11KV',
    transformers_tripped: 4,
    estimated_consumers_affected: 4800,
    event_type: 'OUTAGE_REPORTED',
    iso_timestamp: new Date(floodTime + 18 * 60 * 1000).toISOString(),
    root_cause: 'Water ingress into 11kV distribution pillar box at Tripolia Bazar',
  };
  const powerEv = normalizePowerEvent(rawPowerFlood);
  powerEv.severity = 'critical';
  events.push(powerEv);

  timelineMarkers.push({
    id: 'marker-day2-flood',
    timestamp: floodTime,
    dayNumber: 2,
    timeLabel: 'Day 2 • 02:15 PM',
    type: 'scenario',
    scenarioKey: 'monsoon',
    titleEn: 'Day 2: Monsoon Cloudburst & Triple-Grid Breakdown',
    titleHi: 'दूसरा दिन: मानसून अतिवृष्टि व बहु-प्रणालीय जलभराव',
    descriptionEn: '68mm cloudburst triggers waterlogging at Badi Chaupar, metro delays, and 11kV substation tripping.',
    descriptionHi: 'बड़ी चौपड़ व चांदपोल में 68मिमी वर्षा से जलभराव, मेट्रो विलंब एवं विद्युत फीडर ट्रिपिंग।',
    zoneIds: ['walled_city', 'malviya_nagar', 'sanganer'],
    severity: 'critical',
  });

  // ==========================================
  // EMBEDDED SCENARIO 2: DAY 4 SUMMER HEATWAVE
  // ==========================================
  const day4Start = REPLAY_START_MS + 3 * ONE_DAY_MS;
  const heatwaveTime = day4Start + 15 * 3600 * 1000; // 3:00 PM IST on Day 4

  // Power feeder overload trips
  const rawHeatPower1: RawPowerOutagePayload = {
    ticket_number: 'JVVNL-HW-9901',
    substation_code: 'SS-MN-33',
    zone_name_text: 'Mansarovar',
    feeder_line_id: 'FEEDER-VARUN-PATH-33KV',
    transformers_tripped: 5,
    estimated_consumers_affected: 8200,
    event_type: 'OUTAGE_REPORTED',
    iso_timestamp: new Date(heatwaveTime).toISOString(),
    root_cause: 'Severe 46.5°C ambient temperature causing distribution transformer thermal overload trip',
  };
  const heatPowerEv1 = normalizePowerEvent(rawHeatPower1);
  heatPowerEv1.severity = 'critical';
  events.push(heatPowerEv1);

  // Water supply low pressure complaints
  const heatComplaints = [
    { loc: 'Sector 8, Mansarovar', text: 'No water supply in pipelines since morning due to booster pump power cut', zone: 'Mansarovar' },
    { loc: 'Amrapali Circle, Vaishali Nagar', text: 'Severe drinking water crisis, PHED tube well electricity trip during 46C heat', zone: 'Vaishali Nagar' },
  ];

  heatComplaints.forEach((hc, idx) => {
    const raw: RawComplaintPayload = {
      complaint_id: `CMP-HEAT-00${idx + 1}`,
      source_channel: 'whatsapp_bot',
      reported_at_str: formatComplaintDate(heatwaveTime + (idx + 1) * 7 * 60 * 1000),
      location_text: `${hc.loc}, ${hc.zone}`,
      raw_description: hc.text,
      category_hint: 'water',
      urgency_flag: true,
    };
    const ev = normalizeComplaintEvent(raw);
    ev.severity = 'high';
    events.push(ev);
  });

  timelineMarkers.push({
    id: 'marker-day4-heatwave',
    timestamp: heatwaveTime,
    dayNumber: 4,
    timeLabel: 'Day 4 • 03:00 PM',
    type: 'scenario',
    scenarioKey: 'heatwave',
    titleEn: 'Day 4: 46.5°C Extreme Heatwave & Grid Strain',
    titleHi: 'चौथा दिन: 46.5°C भीषण लू व विद्युत-पेयजल संकट',
    descriptionEn: 'Extreme heat peaks transformer thermal limits in Mansarovar, cascading into booster pump water supply failure.',
    descriptionHi: 'मानसरोवर व वैशाली नगर में भीषण गर्मी से ट्रांसफार्मर ट्रिप व पेयजल आपूर्ति बाधित।',
    zoneIds: ['mansarovar', 'vaishali_nagar'],
    severity: 'critical',
  });

  // ==========================================
  // EMBEDDED SCENARIO 3: DAY 5 DUST STORM (ANDHI)
  // ==========================================
  const day5Start = REPLAY_START_MS + 4 * ONE_DAY_MS;
  const dustStormTime = day5Start + 17 * 3600 * 1000 + 30 * 60 * 1000; // 5:30 PM IST on Day 5

  // Streetlight branch falls & transit disruptions
  const rawDustBus: RawTransitPayload = {
    system: 'jctsl_bus',
    route_code: 'BUS-RT-9A',
    bus_id: 'RJ-14-PC-8910',
    corridor_name: 'Sikar Road Corridor (Jhotwara)',
    current_gps: [26.9538, 75.7621],
    passenger_load_pct: 95,
    speed_kmh: 8,
    congestion_level: 'standstill',
    timestamp_sec: Math.floor(dustStormTime / 1000),
  };
  const dustBusEv = normalizeTransitEvent(rawDustBus);
  dustBusEv.severity = 'critical';
  dustBusEv.titleEn = 'Gale Dust Storm (65 km/h) Halts Bus Corridor on Sikar Road';
  dustBusEv.titleHi = 'सीकर रोड पर 65 किमी/घंटे की धूल भरी आंधी से बस संचालन ठप';
  events.push(dustBusEv);

  const rawDustComplaint: RawComplaintPayload = {
    complaint_id: 'CMP-DUST-001',
    source_channel: 'sampark_181',
    reported_at_str: formatComplaintDate(dustStormTime + 12 * 60 * 1000),
    location_text: 'Niwaru Road, Jhotwara',
    raw_description: 'High wind gusts broke tree branches and damaged streetlights and electrical wiring',
    category_hint: 'power',
    urgency_flag: true,
  };
  const dustCompEv = normalizeComplaintEvent(rawDustComplaint);
  dustCompEv.severity = 'high';
  events.push(dustCompEv);

  timelineMarkers.push({
    id: 'marker-day5-duststorm',
    timestamp: dustStormTime,
    dayNumber: 5,
    timeLabel: 'Day 5 • 05:30 PM',
    type: 'scenario',
    scenarioKey: 'dust_storm',
    titleEn: 'Day 5: 65 km/h Western Dust Storm & Severe PM10 Spike',
    titleHi: 'पांचवां दिन: 65 किमी/घंटा धूल भरी आंधी व पीएम10 में भारी उछाल',
    descriptionEn: 'Severe dust squall engulfs Jhotwara & Sitapura, spiking PM10 to 430 and blinding traffic.',
    descriptionHi: 'झोटवाड़ा और सीतापुरा में तेज धूल भरी आंधी से पीएम10 430 पहुंचा, दृश्यता शून्य।',
    zoneIds: ['jhotwara', 'sitapura'],
    severity: 'high',
  });

  // ==========================================
  // EMBEDDED SCENARIO 4: DAY 6 FESTIVAL RUSH (TEEJ / GANGAUR)
  // ==========================================
  const day6Start = REPLAY_START_MS + 5 * ONE_DAY_MS;
  const festivalTime = day6Start + 18 * 3600 * 1000; // 6:00 PM IST on Day 6

  const rawFestivalMetro: RawTransitPayload = {
    system: 'jmrc_pink_line',
    station_code: 'chhoti_chaupar',
    station_name: 'Chhoti Chaupar',
    line: 'pink',
    crowd_density_pct: 99,
    train_headway_sec: 240,
    delay_sec: 480,
    gate_entries_per_min: 210,
    timestamp_sec: Math.floor(festivalTime / 1000),
  };
  const festMetroEv = normalizeTransitEvent(rawFestivalMetro);
  festMetroEv.severity = 'critical';
  festMetroEv.titleEn = 'Teej Procession Massive Pedestrian Surge at Chhoti Chaupar Metro';
  festMetroEv.titleHi = 'तीज माता की सवारी पर छोटी चौपड़ मेट्रो स्टेशन पर भारी जनसैलाब';
  events.push(festMetroEv);

  const rawFestComplaint: RawComplaintPayload = {
    complaint_id: 'CMP-FEST-001',
    source_channel: 'web_portal',
    reported_at_str: formatComplaintDate(festivalTime + 20 * 60 * 1000),
    location_text: 'Tripolia Bazar to Gangauri Bazar, Walled City',
    raw_description: 'Heavy tourist and devotee crowd, overflowed dustbins and noise from royal brass band',
    category_hint: 'crowd',
    urgency_flag: false,
  };
  const festCompEv = normalizeComplaintEvent(rawFestComplaint);
  festCompEv.severity = 'high';
  events.push(festCompEv);

  timelineMarkers.push({
    id: 'marker-day6-festival',
    timestamp: festivalTime,
    dayNumber: 6,
    timeLabel: 'Day 6 • 06:00 PM',
    type: 'scenario',
    scenarioKey: 'festival',
    titleEn: 'Day 6: Royal Teej Procession & Walled City Crowd Swarm',
    titleHi: 'छठा दिन: तीज माता शोभायात्रा व परकोटा क्षेत्र में भारी भीड़',
    descriptionEn: 'Over 120,000 citizens converge along Tripolia Bazar, surging metro gates and generating noise/sanitation load.',
    descriptionHi: 'त्रिपोलिया बाज़ार में भारी जनसैलाब, मेट्रो स्टेशनों पर कतारें व स्वच्छता विभाग पर अतिरिक्त भार।',
    zoneIds: ['walled_city', 'amer'],
    severity: 'high',
  });

  // Embedded anomaly & correlation markers where critical cross-system links fire
  timelineMarkers.push({
    id: 'marker-corr-day2-rain-metro',
    timestamp: floodTime + 12 * 60 * 1000,
    dayNumber: 2,
    timeLabel: 'Day 2 • 02:27 PM',
    type: 'correlation',
    scenarioKey: 'monsoon',
    titleEn: 'Correlation: Downpour (68mm) ↔ Waterlogging ↔ Metro Delay',
    titleHi: 'सह-संबंध: अतिवृष्टि ↔ जलभराव ↔ मेट्रो विलंब',
    descriptionEn: 'Cross-system correlation: torrential rain at City Palace linked with Badi Chaupar waterlogging and Pink Line headway delay.',
    descriptionHi: 'सिटी पैलेस पर वर्षा, बड़ी चौपड़ पर जलभराव और मेट्रो विलंब के मध्य संभावित सह-संबंध।',
    zoneIds: ['walled_city'],
    severity: 'critical',
  });

  timelineMarkers.push({
    id: 'marker-corr-day4-heat-power',
    timestamp: heatwaveTime + 10 * 60 * 1000,
    dayNumber: 4,
    timeLabel: 'Day 4 • 03:10 PM',
    type: 'correlation',
    scenarioKey: 'heatwave',
    titleEn: 'Correlation: 46.5°C Heatwave ↔ 33kV Outage ↔ Water Grievance',
    titleHi: 'सह-संबंध: भीषण लू ↔ विद्युत ट्रिप ↔ पेयजल समस्या',
    descriptionEn: 'High thermal stress on Mansarovar 33kV feeders correlated with PHED tube well trips and residential drinking water calls.',
    descriptionHi: 'मानसरोवर 33केवी ग्रिड ओवरलोड और वैशाली नगर पेयजल ट्यूबवेल बिजली कटौती में सह-संबंध।',
    zoneIds: ['mansarovar', 'vaishali_nagar'],
    severity: 'critical',
  });

  timelineMarkers.push({
    id: 'marker-anom-day5-dust',
    timestamp: dustStormTime + 8 * 60 * 1000,
    dayNumber: 5,
    timeLabel: 'Day 5 • 05:38 PM',
    type: 'anomaly',
    scenarioKey: 'dust_storm',
    titleEn: 'Anomaly: PM10 Severe Threshold Breach (430 µg/m³)',
    titleHi: 'विसंगति: पीएम10 अति गंभीर सीमा पार (430 µg/m³)',
    descriptionEn: 'CPCB sensor at Jhotwara records PM10 spike to 430 with gale gusts at 65 km/h.',
    descriptionHi: 'झोटवाड़ा सेंसर पर पीएम10 430 दर्ज, 65 किमी/घंटे की आंधी।',
    zoneIds: ['jhotwara', 'sitapura'],
    severity: 'high',
  });

  // Sort events chronologically
  events.sort((a, b) => a.timestamp - b.timestamp);
  timelineMarkers.sort((a, b) => a.timestamp - b.timestamp);

  cachedDataset = {
    startTimestamp: REPLAY_START_MS,
    endTimestamp: REPLAY_END_MS,
    durationMs: 7 * ONE_DAY_MS,
    events,
    timelineMarkers,
    dayWeatherSnapshots,
  };

  return cachedDataset;
}
