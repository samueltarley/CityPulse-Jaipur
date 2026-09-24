/**
 * Weather & Air Quality Adapter.
 * Normalizes Open-Meteo responses and derives weather alerts.
 */

import { CivicEvent, EventSeverity, EventOrigin, ZoneWeatherAQI } from '../../types';
import { JAIPUR_ZONES, WEATHER_ALERT_THRESHOLDS, WMO_WEATHER_CODES } from '../../config/city';
import { computeIndianAQI } from '../aqiIndia';

export interface RawWeatherZoneReading {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
}

export interface RawAirQualityZoneReading {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    pm2_5: number;
    pm10: number;
  };
}

/**
 * Normalizes Weather API response and creates CivicEvents for anomalies or severe weather.
 */
export function normalizeWeatherResponse(
  rawList: RawWeatherZoneReading[],
  origin: EventOrigin
): { events: CivicEvent[]; weatherState: Record<string, Partial<ZoneWeatherAQI>> } {
  const events: CivicEvent[] = [];
  const weatherState: Record<string, Partial<ZoneWeatherAQI>> = {};
  const now = Date.now();

  rawList.forEach((reading, index) => {
    const zone = JAIPUR_ZONES[index] || JAIPUR_ZONES[0];
    const curr = reading.current;
    if (!curr) return;

    const wmo = WMO_WEATHER_CODES[curr.weather_code] || {
      en: 'Variable conditions',
      hi: 'परिवर्तनशील मौसम',
      isPrecip: false,
      icon: '⛅',
    };

    weatherState[zone.id] = {
      zoneId: zone.id,
      zoneNameEn: zone.nameEn,
      zoneNameHi: zone.nameHi,
      temperatureC: Math.round(curr.temperature_2m * 10) / 10,
      relativeHumidityPct: Math.round(curr.relative_humidity_2m),
      apparentTemperatureC: Math.round(curr.apparent_temperature * 10) / 10,
      precipitationMm: curr.precipitation || 0,
      rainMm: curr.rain || 0,
      weatherCode: curr.weather_code,
      weatherDescEn: wmo.en,
      weatherDescHi: wmo.hi,
      weatherIcon: wmo.icon,
      windSpeedKmh: Math.round(curr.wind_speed_10m),
      windGustsKmh: Math.round(curr.wind_gusts_10m),
      lastUpdated: now,
      origin,
    };

    // Derived Alert 1: Heatwave Thresholds (≥ 40°C alert, ≥ 45°C critical)
    if (curr.temperature_2m >= WEATHER_ALERT_THRESHOLDS.heat.moderateAlertC) {
      const isCritical = curr.temperature_2m >= WEATHER_ALERT_THRESHOLDS.heat.criticalHeatwaveC;
      const severity: EventSeverity = isCritical ? 'critical' : 'high';

      events.push({
        id: `weather-heat-${zone.id}-${now}`,
        timestamp: now,
        zoneId: zone.id,
        category: 'air_quality',
        severity,
        titleEn: `${isCritical ? 'Severe Heatwave Emergency' : 'Extreme Heat Advisory'}: ${curr.temperature_2m}°C in ${zone.nameEn}`,
        titleHi: `${isCritical ? 'भीषण लू (हीटवेव) चेतावनी' : 'अत्यधिक तापमान चेतावनी'}: ${zone.nameHi} में ${curr.temperature_2m}°C`,
        descriptionEn: `Ambient temperature reached ${curr.temperature_2m}°C (feels like ${curr.apparent_temperature}°C) in ${zone.nameEn}. Health advisory for dehydration and high thermal stress.`,
        descriptionHi: `${zone.nameHi} में तापमान ${curr.temperature_2m}°C (महसूस ${curr.apparent_temperature}°C) दर्ज हुआ। दोपहर में अनावश्यक बाहर निकलने से बचें।`,
        locationName: `${zone.nameEn} Central Weather Station`,
        coordinates: zone.center,
        source: 'weather_station',
        status: 'active',
        metadata: {
          origin,
          rawPayload: reading,
          metric: 'temperature_2m',
          value: curr.temperature_2m,
          feelsLike: curr.apparent_temperature,
        },
      });
    }

    // Derived Alert 2: Rain & Waterlogging Threat (≥ 7.5 mm/h alert, ≥ 15 mm/h critical)
    const effectiveRain = Math.max(curr.rain || 0, curr.precipitation || 0);
    if (effectiveRain >= WEATHER_ALERT_THRESHOLDS.rain.moderateRainMmHr) {
      const isCritical = effectiveRain >= WEATHER_ALERT_THRESHOLDS.rain.criticalDownpourMmHr;
      const severity: EventSeverity = isCritical ? 'critical' : 'high';

      events.push({
        id: `weather-rain-${zone.id}-${now}`,
        timestamp: now,
        zoneId: zone.id,
        category: 'water',
        severity,
        titleEn: `${isCritical ? 'Flash Flood & Downpour Alert' : 'Heavy Rainfall Alert'}: ${effectiveRain}mm/h in ${zone.nameEn}`,
        titleHi: `${isCritical ? 'मूसलाधार बारिश व जलभराव चेतावनी' : 'भारी वर्षा सतर्कता'}: ${zone.nameHi} में ${effectiveRain}mm/h`,
        descriptionEn: `Intense precipitation rate of ${effectiveRain} mm/hr recorded in ${zone.nameEn}. Risk of waterlogging at low-lying chowks and underpasses.`,
        descriptionHi: `${zone.nameHi} में ${effectiveRain} मिमी/घंटा की गति से वर्षा दर्ज। निचले इलाकों व अंडरपासों में जलभराव की आशंका।`,
        locationName: `${zone.nameEn} Catchment`,
        coordinates: zone.center,
        source: 'weather_station',
        status: 'active',
        metadata: {
          origin,
          rawPayload: reading,
          metric: 'rain_mm_hr',
          value: effectiveRain,
        },
      });
    }

    // Derived Alert 3: Wind Gusts & Squall / Andhi (≥ 50 km/h alert, ≥ 70 km/h critical)
    if (curr.wind_gusts_10m >= WEATHER_ALERT_THRESHOLDS.windGusts.moderateSquallKmh) {
      const isCritical = curr.wind_gusts_10m >= WEATHER_ALERT_THRESHOLDS.windGusts.criticalStormKmh;
      const severity: EventSeverity = isCritical ? 'critical' : 'high';

      events.push({
        id: `weather-wind-${zone.id}-${now}`,
        timestamp: now,
        zoneId: zone.id,
        category: 'traffic',
        severity,
        titleEn: `${isCritical ? 'Severe Dust Storm / Squall' : 'High Wind Gusts Alert'}: ${curr.wind_gusts_10m} km/h in ${zone.nameEn}`,
        titleHi: `${isCritical ? 'तीव्र धूलभरी आंधी व अंधड़' : 'तेज हवाओं की चेतावनी'}: ${zone.nameHi} में ${curr.wind_gusts_10m} किमी/घंटा`,
        descriptionEn: `Peak wind gusts of ${curr.wind_gusts_10m} km/h recorded in ${zone.nameEn}. Potential risk of fallen branches, hoardings, and temporary power line trips.`,
        descriptionHi: `${zone.nameHi} में ${curr.wind_gusts_10m} किमी/घंटा के झोंके दर्ज। पेड़ की शाखाओं और होर्डिंग्स गिरने की संभावना।`,
        locationName: `${zone.nameEn} Anemometer`,
        coordinates: zone.center,
        source: 'weather_station',
        status: 'active',
        metadata: {
          origin,
          rawPayload: reading,
          metric: 'wind_gusts_10m',
          value: curr.wind_gusts_10m,
        },
      });
    }
  });

  return { events, weatherState };
}

/**
 * Normalizes Air Quality API response and creates CivicEvents for elevated AQI.
 */
export function normalizeAirQualityResponse(
  rawList: RawAirQualityZoneReading[],
  origin: EventOrigin
): { events: CivicEvent[]; aqiState: Record<string, Partial<ZoneWeatherAQI>> } {
  const events: CivicEvent[] = [];
  const aqiState: Record<string, Partial<ZoneWeatherAQI>> = {};
  const now = Date.now();

  rawList.forEach((reading, index) => {
    const zone = JAIPUR_ZONES[index] || JAIPUR_ZONES[0];
    const curr = reading.current;
    if (!curr) return;

    const pm25 = curr.pm2_5 || 25;
    const pm10 = curr.pm10 || 45;
    const cpcb = computeIndianAQI(pm25, pm10);

    aqiState[zone.id] = {
      zoneId: zone.id,
      pm25: Math.round(pm25 * 10) / 10,
      pm10: Math.round(pm10 * 10) / 10,
      aqi: cpcb.aqi,
      aqiCategory: cpcb.category,
      aqiCategoryHi: cpcb.categoryHi,
      subIndexPM25: cpcb.subIndexPM25,
      subIndexPM10: cpcb.subIndexPM10,
      dominantPollutant: cpcb.dominantPollutant,
      lastUpdated: now,
      origin,
    };

    // If AQI is Poor (201+), Very Poor (301+), or Severe (401+), create event
    if (cpcb.aqi > 200) {
      let severity: EventSeverity = 'medium';
      if (cpcb.aqi > 400) severity = 'critical';
      else if (cpcb.aqi > 300) severity = 'high';

      events.push({
        id: `aqi-spike-${zone.id}-${now}`,
        timestamp: now,
        zoneId: zone.id,
        category: 'air_quality',
        severity,
        titleEn: `Air Quality Alert: AQI ${cpcb.aqi} (${cpcb.category}) in ${zone.nameEn}`,
        titleHi: `वायु गुणवत्ता चेतावनी: ${zone.nameHi} में AQI ${cpcb.aqi} (${cpcb.categoryHi})`,
        descriptionEn: `CPCB Ambient AQI reached ${cpcb.aqi} (${cpcb.category}) driven by ${cpcb.dominantPollutant} (${cpcb.dominantPollutant === 'PM2.5' ? pm25 : pm10} µg/m³). High particulate matter alert.`,
        descriptionHi: `${zone.nameHi} में सीपीसीबी वायु गुणवत्ता सूचकांक ${cpcb.aqi} (${cpcb.categoryHi}) दर्ज हुआ। प्रमुख प्रदूषक ${cpcb.dominantPollutant} रहा।`,
        locationName: `${zone.nameEn} CAAQMS Station`,
        coordinates: zone.center,
        source: 'weather_station',
        status: 'active',
        metadata: {
          origin,
          rawPayload: reading,
          aqi: cpcb.aqi,
          category: cpcb.category,
          pm25,
          pm10,
        },
      });
    }
  });

  return { events, aqiState };
}
