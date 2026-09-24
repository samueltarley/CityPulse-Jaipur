/**
 * Indian CPCB (Central Pollution Control Board) National Air Quality Index (AQI) Calculator.
 * Implements standard Indian breakpoint table for PM2.5 and PM10.
 * Overall AQI is determined by the maximum sub-index (the higher sub-index wins).
 */

import { AQICategory } from '../types';

interface AQIBreakpoint {
  iLow: number;
  iHigh: number;
  cLow: number;
  cHigh: number;
  category: AQICategory;
  categoryHi: string;
}

// CPCB Breakpoints for PM2.5 (24-hour average in µg/m³)
const PM25_BREAKPOINTS: AQIBreakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50, category: 'Good', categoryHi: 'अच्छा' },
  { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100, category: 'Satisfactory', categoryHi: 'संतोषजनक' },
  { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200, category: 'Moderate', categoryHi: 'मध्यम' },
  { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300, category: 'Poor', categoryHi: 'खराब' },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400, category: 'Very Poor', categoryHi: 'बहुत खराब' },
  { cLow: 251, cHigh: 380, iLow: 401, iHigh: 500, category: 'Severe', categoryHi: 'गंभीर' },
];

// CPCB Breakpoints for PM10 (24-hour average in µg/m³)
const PM10_BREAKPOINTS: AQIBreakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50, category: 'Good', categoryHi: 'अच्छा' },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100, category: 'Satisfactory', categoryHi: 'संतोषजनक' },
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200, category: 'Moderate', categoryHi: 'मध्यम' },
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300, category: 'Poor', categoryHi: 'खराब' },
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400, category: 'Very Poor', categoryHi: 'बहुत खराब' },
  { cLow: 431, cHigh: 550, iLow: 401, iHigh: 500, category: 'Severe', categoryHi: 'गंभीर' },
];

function calculateSubIndex(concentration: number, breakpoints: AQIBreakpoint[]): number {
  if (concentration <= 0 || isNaN(concentration)) return 0;

  // If concentration exceeds the top tier, clamp to max or scale linearly
  const maxTier = breakpoints[breakpoints.length - 1];
  if (concentration > maxTier.cHigh) {
    return Math.min(500, Math.round(maxTier.iHigh + ((concentration - maxTier.cHigh) / 50) * 20));
  }

  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      // Linear interpolation: I = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (C - B_lo) + I_lo
      const index = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow;
      return Math.round(index);
    }
  }

  return 0;
}

export function getAQICategory(aqi: number): { category: AQICategory; categoryHi: string; color: string } {
  if (aqi <= 50) {
    return { category: 'Good', categoryHi: 'अच्छा', color: '#16a34a' }; // Green
  } else if (aqi <= 100) {
    return { category: 'Satisfactory', categoryHi: 'संतोषजनक', color: '#65a30d' }; // Light green
  } else if (aqi <= 200) {
    return { category: 'Moderate', categoryHi: 'मध्यम', color: '#d97706' }; // Amber
  } else if (aqi <= 300) {
    return { category: 'Poor', categoryHi: 'खराब', color: '#ea580c' }; // Orange
  } else if (aqi <= 400) {
    return { category: 'Very Poor', categoryHi: 'बहुत खराब', color: '#dc2626' }; // Red
  } else {
    return { category: 'Severe', categoryHi: 'गंभीर', color: '#7f1d1d' }; // Dark Maroon / Purple
  }
}

export interface CPCBCalculationResult {
  aqi: number;
  category: AQICategory;
  categoryHi: string;
  subIndexPM25: number;
  subIndexPM10: number;
  dominantPollutant: 'PM2.5' | 'PM10';
  color: string;
}

export function computeIndianAQI(pm25: number, pm10: number): CPCBCalculationResult {
  const subIndexPM25 = calculateSubIndex(pm25, PM25_BREAKPOINTS);
  const subIndexPM10 = calculateSubIndex(pm10, PM10_BREAKPOINTS);

  // The higher sub-index wins
  const aqi = Math.max(subIndexPM25, subIndexPM10);
  const dominantPollutant: 'PM2.5' | 'PM10' = subIndexPM25 >= subIndexPM10 ? 'PM2.5' : 'PM10';
  const categoryInfo = getAQICategory(aqi);

  return {
    aqi,
    category: categoryInfo.category,
    categoryHi: categoryInfo.categoryHi,
    subIndexPM25,
    subIndexPM10,
    dominantPollutant,
    color: categoryInfo.color,
  };
}
