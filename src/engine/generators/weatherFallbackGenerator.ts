/**
 * Weather & Air Quality Fallback Generator.
 * Used when Open-Meteo API fails or times out (> 8000ms).
 * Origin tag: "simulated_fallback".
 */

import { JAIPUR_ZONES } from '../../config/city';
import { RawWeatherZoneReading, RawAirQualityZoneReading } from '../adapters/weatherAdapter';
import { SeededRandom, defaultPRNG } from '../random';

export class WeatherFallbackGenerator {
  private prng: SeededRandom;

  constructor(prng: SeededRandom = defaultPRNG) {
    this.prng = prng;
  }

  generateFallbackWeather(): RawWeatherZoneReading[] {
    const nowIso = new Date().toISOString();

    return JAIPUR_ZONES.map((zone, idx) => {
      // Realistic Jaipur September climate: warm daytime (31-36°C), dry/semi-arid
      const baseTemp = 33.5 + (idx % 3) * 0.8;
      const temp = Math.round((baseTemp + this.prng.nextFloat(-1.5, 2.0)) * 10) / 10;
      const humidity = Math.round(38 + this.prng.nextFloat(-5, 12));
      const wind = Math.round(14 + this.prng.nextFloat(-3, 8));
      const gusts = Math.round(wind * 1.5 + this.prng.nextFloat(0, 10));
      const precip = this.prng.chance(0.1) ? Math.round(this.prng.nextFloat(1.0, 8.0) * 10) / 10 : 0;
      const weatherCode = precip > 5 ? 63 : precip > 0 ? 51 : 1;

      return {
        latitude: zone.center.lat,
        longitude: zone.center.lng,
        current: {
          time: nowIso,
          temperature_2m: temp,
          relative_humidity_2m: humidity,
          apparent_temperature: Math.round((temp + 1.8) * 10) / 10,
          precipitation: precip,
          rain: precip,
          weather_code: weatherCode,
          wind_speed_10m: wind,
          wind_gusts_10m: gusts,
        },
      };
    });
  }

  generateFallbackAirQuality(): RawAirQualityZoneReading[] {
    const nowIso = new Date().toISOString();

    return JAIPUR_ZONES.map((zone, idx) => {
      // Walled City and Sanganer have higher particulates due to dense traffic and industry
      const isDense = zone.id === 'walled-city' || zone.id === 'sanganer';
      const pm25Base = isDense ? 68 : 48;
      const pm10Base = isDense ? 145 : 95;

      const pm2_5 = Math.round((pm25Base + this.prng.nextFloat(-10, 25)) * 10) / 10;
      const pm10 = Math.round((pm10Base + this.prng.nextFloat(-15, 35)) * 10) / 10;

      return {
        latitude: zone.center.lat,
        longitude: zone.center.lng,
        current: {
          time: nowIso,
          pm2_5,
          pm10,
        },
      };
    });
  }
}
