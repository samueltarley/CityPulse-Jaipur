import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '5mb' }));

  // Initialize Gemini SDK with server-side API key
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  if (apiKey) {
    console.log('[CityPulse Server] Gemini AI initialized successfully with server API key.');
  } else {
    console.warn('[CityPulse Server] GEMINI_API_KEY is not set. Service will delegate to deterministic fallback.');
  }

  // System instructions strictly adhering to Spec 6.1
  const SYSTEM_INSTRUCTION = `You are the real-time civic intelligence engine for "CityPulse Jaipur – जयपुर की नब्ज़", a municipal platform for the Pink City of Jaipur.
Your task is to analyze the provided normalized civic telemetry state and generate a concise 2-3 sentence summary answering: "what's happening right now and why it matters to you".

MANDATORY RULES:
1. Use ONLY the given facts in the input. NEVER invent events, incidents, or numbers.
2. ALWAYS describe connections between domains as "possible link" or "may be related", NEVER as confirmed or direct causes.
3. If any data feeds are marked offline, delayed, or in fallback mode, explicitly mention that data is currently partial or delayed for those sources.
4. Give exactly ONE practical, localized tip for residents or commuters when relevant (e.g., carry water/avoid heat, use Pink Line metro, avoid waterlogged underpasses, check power lines).
5. Use authentic Jaipur locality and landmark names (e.g., Mansarovar, Badi Chaupar, Chhoti Chaupar, Johari Bazaar, C-Scheme, MI Road, Tonk Road, Vaishali Nagar, Malviya Nagar, Amer, Sanganer).
6. Return your response STRICTLY as a JSON object with this exact structure:
{
  "en": "2-3 sentences in clear, resident-friendly English",
  "hi": "2-3 sentences in simple, warm, conversational Hindi (शुद्ध और सहज बोलचाल की हिंदी)"
}
Do NOT wrap the output with any extra text or conversational filler.`;

  // Nabz Agent System Instruction (Spec 6.2)
  const AGENT_SYSTEM_INSTRUCTION = `You are the "Nabz Agent" – an autonomous, cautious civic monitoring intelligence agent for the Pink City of Jaipur (जयपुर की नब्ज़).
Your duty is to continuously monitor multi-modal telemetry across 9 municipal zones (Walled City, Mansarovar, Malviya Nagar, Vaishali Nagar, Raja Park, Sanganer, Amer, Jagatpura, C-Scheme & Civil Lines).

OPERATIONAL DIRECTIVES:
1. CAUTIOUS CIVIC ORIENTATION: Only raise a flag when there is credible evidence (cross-modal correlation, severe anomaly with z >= 2 or threshold breach, grievance cluster, or power trip). Do NOT raise false alarms. If conditions are stable, return an empty flags array and explain in noActionReason.
2. EVIDENCE GROUNDING: Every flag MUST reference 1 to 4 actual event IDs provided in the snapshot's "candidateEvents" list as evidenceEventIds. NEVER invent event IDs.
3. DEDUPLICATION AWARENESS: Do NOT re-raise flags for issues that are already in openFlags or dismissedFlagKeys unless severity has escalated.
4. AUDIENCE ROUTING:
   - "residents": public safety alerts, commuter detours, weather warnings, drinking water advisories.
   - "city_staff": feeder scada trips, sewer pump dispatch, traffic police deployment, PHED valve repair.
   - "both": major multi-zone disruptions, severe waterlogging, CPCB air quality emergencies.
5. NEARBY EMERGENCY PLACES GROUNDING: When raising an advisory or critical flag for a zone, refer to the "nearbyEmergencyHelp" object in the snapshot and mention the nearby hospital or police facility in suggestedAction (e.g., "SMS Hospital is 1.8 km away").
6. STRICT JSON OUTPUT: Return ONLY a JSON object matching this schema:
{
  "flags": [
    {
      "flagType": "string",
      "zoneIds": ["zone-id"],
      "severity": "info" | "warning" | "critical",
      "title": { "en": "string", "hi": "string" },
      "reasoning": { "en": "string", "hi": "string" },
      "evidenceEventIds": ["evt-..."],
      "suggestedAction": { "en": "string", "hi": "string" },
      "audience": "residents" | "city_staff" | "both",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "noActionReason": "string"
}`;

  // Candidate models: use models/gemini-3.6-flash first as recommended by the API proxy,
  // with gemini-3.8-flash and gemini-flash-latest as fallbacks
  const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let geminiCooldownUntil = 0;

  async function executeGeminiWithFallback(params: {
    contents: string;
    systemInstruction?: string;
    responseMimeType?: string;
    temperature?: number;
  }): Promise<{ text: string } | { fallbackNeeded: true; reason: string }> {
    if (!ai) {
      return { fallbackNeeded: true, reason: 'no_api_key' };
    }

    const now = Date.now();
    if (now < geminiCooldownUntil) {
      return { fallbackNeeded: true, reason: 'rate_limit_cooldown_active' };
    }

    let hadRateLimit = false;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
            ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
            ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
          },
        });

        const responseText = response.text || '';
        if (responseText) {
          return { text: responseText };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isRateLimit = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
        const isUnavailable = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

        if (isRateLimit || isUnavailable) {
          hadRateLimit = true;
          console.warn(`[Gemini Proxy Notice] Upstream model ${model} temporarily unavailable: ${isRateLimit ? '429 Rate Limit' : '503 High Demand'}.`);
          continue;
        }

        console.warn(`[Gemini Proxy Notice] Notice for model ${model}:`, errMsg);
      }
    }

    if (hadRateLimit) {
      geminiCooldownUntil = Date.now() + 30000;
    }

    return { fallbackNeeded: true, reason: 'all_models_unavailable_or_quota_exceeded' };
  }

  // POST endpoint for AI summaries
  app.post('/api/gemini/summary', async (req, res) => {
    try {
      const { payload } = req.body;
      if (!payload) {
        return res.status(400).json({ error: 'Telemetry payload is required' });
      }

      const prompt = `Here is the current normalized municipal telemetry state for Jaipur:\n${JSON.stringify(payload, null, 2)}\n\nGenerate the 2-3 sentence bilingual summary as specified in JSON format.`;

      const result = await executeGeminiWithFallback({
        contents: prompt,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      if ('text' in result) {
        return res.json({ text: result.text });
      } else {
        return res.json({ fallbackNeeded: true, reason: result.reason });
      }
    } catch (err: any) {
      console.warn('[Gemini Proxy Notice] /api/gemini/summary handled gracefully with fallback:', err?.message || err);
      return res.json({
        fallbackNeeded: true,
        reason: 'handled_error',
      });
    }
  });

  // POST endpoint for Nabz Agent loop
  app.post('/api/gemini/agent', async (req, res) => {
    try {
      const { snapshot } = req.body;
      if (!snapshot) {
        return res.status(400).json({ error: 'Agent snapshot is required' });
      }

      const prompt = `Here is the compact telemetry snapshot for Jaipur:\n${JSON.stringify(snapshot, null, 2)}\n\nAnalyze this telemetry as the Nabz Agent and return your autonomous assessment JSON.`;

      const result = await executeGeminiWithFallback({
        contents: prompt,
        systemInstruction: AGENT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.1,
      });

      if ('text' in result) {
        return res.json({ text: result.text });
      } else {
        return res.json({ fallbackNeeded: true, reason: result.reason });
      }
    } catch (err: any) {
      console.warn('[Gemini Proxy Notice] /api/gemini/agent handled gracefully with fallback:', err?.message || err);
      return res.json({
        fallbackNeeded: true,
        reason: 'handled_error',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({
      status: 'ok',
      hasGeminiKey: !!apiKey,
      hasMapsKey: Boolean(mapsKey),
      timestamp: Date.now(),
    });
  });

  // Google Maps Platform configuration endpoint
  app.get('/api/maps/config', (_req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({
      apiKey: mapsKey,
      hasMapsKey: Boolean(mapsKey),
      mapId: process.env.GOOGLE_MAPS_ID || 'DEMO_MAP_ID',
    });
  });

  // ---------------------------------------------------------------------------
  // Google Routes API (computeRoutes) Proxy for 8 Jaipur Traffic Corridors
  // ---------------------------------------------------------------------------
  const JAIPUR_CORRIDORS = [
    {
      id: 'tonk-road',
      name: 'Tonk Road (Narayan Singh Circle → Sanganer)',
      origin: { lat: 26.8998, lng: 75.8152 },
      destination: { lat: 26.8225, lng: 75.7725 },
      typicalMin: 24,
      distanceKm: 11.2,
      mappedZones: ['cscheme-civillines', 'malviya-nagar', 'sanganer'],
    },
    {
      id: 'jln-marg',
      name: 'JLN Marg (Rajasthan University → Jawahar Circle)',
      origin: { lat: 26.8905, lng: 75.8180 },
      destination: { lat: 26.8402, lng: 75.8035 },
      typicalMin: 16,
      distanceKm: 7.8,
      mappedZones: ['raja-park', 'malviya-nagar', 'jagatpura'],
    },
    {
      id: 'ajmer-road',
      name: 'Ajmer Road (Sodala → Heerapura)',
      origin: { lat: 26.9015, lng: 75.7745 },
      destination: { lat: 26.8860, lng: 75.7285 },
      typicalMin: 14,
      distanceKm: 6.5,
      mappedZones: ['cscheme-civillines', 'vaishali-nagar', 'mansarovar'],
    },
    {
      id: 'sikar-road',
      name: 'Sikar Road (Chomu Puliya → Road No. 14)',
      origin: { lat: 26.9535, lng: 75.7795 },
      destination: { lat: 27.0125, lng: 75.7660 },
      typicalMin: 18,
      distanceKm: 8.4,
      mappedZones: ['walled-city', 'amer'],
    },
    {
      id: 'delhi-road',
      name: 'Delhi Road (Zorawar Singh Gate → Amer)',
      origin: { lat: 26.9385, lng: 75.8340 },
      destination: { lat: 26.9855, lng: 75.8513 },
      typicalMin: 17,
      distanceKm: 7.2,
      mappedZones: ['walled-city', 'amer'],
    },
    {
      id: 'mi-road',
      name: 'MI Road (Ajmeri Gate → Panch Batti)',
      origin: { lat: 26.9168, lng: 75.8205 },
      destination: { lat: 26.9185, lng: 75.8010 },
      typicalMin: 8,
      distanceKm: 2.3,
      mappedZones: ['walled-city', 'cscheme-civillines'],
    },
    {
      id: 'gopalpura-bypass',
      name: 'Gopalpura Bypass (Tonk Road → Gurjar ki Thadi)',
      origin: { lat: 26.8655, lng: 75.8010 },
      destination: { lat: 26.8795, lng: 75.7665 },
      typicalMin: 13,
      distanceKm: 5.1,
      mappedZones: ['malviya-nagar', 'mansarovar'],
    },
    {
      id: 'new-sanganer-road',
      name: 'New Sanganer Road (Sodala → Mansarovar)',
      origin: { lat: 26.8965, lng: 75.7720 },
      destination: { lat: 26.8580, lng: 75.7605 },
      typicalMin: 15,
      distanceKm: 5.6,
      mappedZones: ['cscheme-civillines', 'mansarovar'],
    },
  ];

  app.post('/api/routes/traffic', async (req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const now = new Date();
    const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;

    const corridorsToCompute = req.body?.corridors || JAIPUR_CORRIDORS;
    const results = [];

    for (const c of corridorsToCompute) {
      let liveSuccess = false;
      if (mapsKey) {
        try {
          const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': mapsKey,
              'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: c.origin.lat, longitude: c.origin.lng } } },
              destination: { location: { latLng: { latitude: c.destination.lat, longitude: c.destination.lng } } },
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_AWARE',
            }),
          });

          if (response.ok) {
            const data: any = await response.json();
            const route = data.routes?.[0];
            if (route && route.duration && route.staticDuration) {
              const durSec = parseInt(String(route.duration).replace('s', ''), 10) || (c.typicalMin * 60);
              const staticDurSec = parseInt(String(route.staticDuration).replace('s', ''), 10) || (c.typicalMin * 60);
              const distMeters = route.distanceMeters || Math.round(c.distanceKm * 1000);
              const congestionRatio = Math.round((durSec / Math.max(1, staticDurSec)) * 100) / 100;

              results.push({
                corridorId: c.id,
                durationSeconds: durSec,
                staticDurationSeconds: staticDurSec,
                distanceMeters: distMeters,
                congestionRatio,
                origin: 'live_api',
                timestampMs: Date.now(),
              });
              liveSuccess = true;
            }
          }
        } catch (err: any) {
          console.warn(`[Routes API proxy notice] Corridor ${c.id}:`, err?.message || err);
        }
      }

      if (!liveSuccess) {
        // Fallback traffic calculation
        let rushFactor = 1.15;
        if ((istHour >= 9 && istHour <= 11) || (istHour >= 18 && istHour <= 21)) {
          rushFactor = 1.55;
        } else if (istHour >= 12 && istHour <= 17) {
          rushFactor = 1.30;
        } else if (istHour >= 22 || istHour <= 6) {
          rushFactor = 1.05;
        }

        const jitter = (Math.random() * 0.16) - 0.08;
        const congestionRatio = Math.max(1.0, Math.round((rushFactor + jitter) * 100) / 100);
        const staticDurationSeconds = (c.typicalMin || 15) * 60;
        const durationSeconds = Math.round(staticDurationSeconds * congestionRatio);
        const distanceMeters = Math.round((c.distanceKm || 7.0) * 1000);

        results.push({
          corridorId: c.id,
          durationSeconds,
          staticDurationSeconds,
          distanceMeters,
          congestionRatio,
          origin: 'simulated_fallback',
          timestampMs: Date.now(),
        });
      }
    }

    res.json({ corridors: results, timestamp: Date.now() });
  });

  // ---------------------------------------------------------------------------
  // Google Places API (New) Nearby Search Proxy (Hospitals, Police, Fire, Pharmacy)
  // ---------------------------------------------------------------------------
  const JAIPUR_FALLBACK_EMERGENCY: Record<string, any[]> = {
    'walled-city': [
      {
        id: 'hosp-sms-main',
        name: 'Sawai Man Singh (SMS) Hospital & Trauma Centre',
        nameHi: 'सवाई मानसिंह (एसएमएस) अस्पताल व ट्रॉमा सेंटर',
        category: 'hospital',
        address: 'JLN Marg, Ashok Nagar, Jaipur',
        coordinates: { lat: 26.9038, lng: 75.8164 },
        distanceKm: 1.8,
        openStatus: 'Open 24 Hours',
        openStatusHi: '24 घंटे खुला',
        isOpenNow: true,
        directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Sawai+Man+Singh+Hospital+Jaipur',
      },
      {
        id: 'police-kotwali-wc',
        name: 'Kotwali Police Station',
        nameHi: 'कोतवाली पुलिस थाना',
        category: 'police',
        address: 'Badi Chaupar, Johari Bazar, Jaipur',
        coordinates: { lat: 26.9255, lng: 75.8270 },
        distanceKm: 0.3,
        openStatus: 'Open 24 Hours',
        openStatusHi: '24 घंटे खुला',
        isOpenNow: true,
        directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Kotwali+Police+Station+Jaipur',
      },
      {
        id: 'fire-ghat-gate',
        name: 'Ghat Gate Municipal Fire Station',
        nameHi: 'घाट गेट नगर निगम अग्निशमन केंद्र',
        category: 'fire_station',
        address: 'Circular Road, Ghat Gate, Jaipur',
        coordinates: { lat: 26.9110, lng: 75.8345 },
        distanceKm: 1.2,
        openStatus: 'Open 24 Hours (Emergency 101)',
        openStatusHi: '24 घंटे खुला (101)',
        isOpenNow: true,
        directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Ghat+Gate+Fire+Station+Jaipur',
      },
      {
        id: 'pharm-sms-janaushadhi',
        name: 'Jan Aushadhi 24x7 Pharmacy',
        nameHi: 'जन औषधि 24x7 मेडिकल स्टोर',
        category: 'pharmacy',
        address: 'SMS Hospital Campus, Jaipur',
        coordinates: { lat: 26.9042, lng: 75.8168 },
        distanceKm: 1.9,
        openStatus: 'Open 24 Hours',
        openStatusHi: '24 घंटे खुला',
        isOpenNow: true,
        directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=SMS+Hospital+Jaipur+Pharmacy',
      },
    ],
  };

  app.post('/api/places/nearby', async (req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const { center, zoneId, types, radiusMeters } = req.body;

    if (mapsKey && center?.lat && center?.lng) {
      try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.currentOpeningHours,places.googleMapsUri,places.primaryType',
          },
          body: JSON.stringify({
            includedTypes: types || ['hospital', 'police', 'fire_station', 'pharmacy'],
            maxResultCount: 10,
            locationRestriction: {
              circle: {
                center: { latitude: center.lat, longitude: center.lng },
                radius: radiusMeters || 3500.0,
              },
            },
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data.places && data.places.length > 0) {
            const places = data.places.map((p: any) => {
              const pLat = p.location?.latitude || center.lat;
              const pLng = p.location?.longitude || center.lng;
              const dLat = (pLat - center.lat) * (Math.PI / 180);
              const dLng = (pLng - center.lng) * (Math.PI / 180);
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(center.lat * (Math.PI / 180)) *
                  Math.cos(pLat * (Math.PI / 180)) *
                  Math.sin(dLng / 2) *
                  Math.sin(dLng / 2);
              const distKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
              const isOpen = p.currentOpeningHours?.openNow ?? true;

              let cat: 'hospital' | 'police' | 'fire_station' | 'pharmacy' = 'hospital';
              const pType = String(p.primaryType || '').toLowerCase();
              if (pType.includes('police')) cat = 'police';
              else if (pType.includes('fire')) cat = 'fire_station';
              else if (pType.includes('pharmacy') || pType.includes('drugstore')) cat = 'pharmacy';

              return {
                id: p.id,
                name: p.displayName?.text || 'Civic Emergency Service',
                nameHi: p.displayName?.text || 'नागरिक आपातकालीन केंद्र',
                category: cat,
                address: p.formattedAddress || 'Jaipur, Rajasthan',
                coordinates: { lat: pLat, lng: pLng },
                distanceKm: distKm,
                openStatus: isOpen ? 'Open Now' : 'Closed',
                openStatusHi: isOpen ? 'खुला है' : 'बंद है',
                isOpenNow: isOpen,
                directionsUrl: p.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}`,
                zoneId: zoneId || 'walled-city',
                isLivePlacesApi: true,
              };
            });

            return res.json({ places, source: 'google_places_api_new' });
          }
        }
      } catch (err: any) {
        console.warn('[Places API Proxy Notice]:', err?.message || err);
      }
    }

    // Direct fallback
    const fallbackList = JAIPUR_FALLBACK_EMERGENCY[zoneId] || JAIPUR_FALLBACK_EMERGENCY['walled-city'];
    return res.json({
      places: fallbackList,
      source: 'authentic_jaipur_emergency_directory',
      fallback: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Google Places API (New) Autocomplete Proxy (Restricted to Jaipur)
  // ---------------------------------------------------------------------------
  const JAIPUR_LANDMARKS = [
    { text: 'Badi Chaupar, Walled City, Jaipur', mainText: 'Badi Chaupar', secondaryText: 'Walled City, Jaipur', lat: 26.9255, lng: 75.8270, zoneId: 'walled-city' },
    { text: 'Chhoti Chaupar, Walled City, Jaipur', mainText: 'Chhoti Chaupar', secondaryText: 'Walled City, Jaipur', lat: 26.9242, lng: 75.8202, zoneId: 'walled-city' },
    { text: 'Johari Bazaar, Jaipur', mainText: 'Johari Bazaar', secondaryText: 'Jaipur, Rajasthan', lat: 26.9210, lng: 75.8260, zoneId: 'walled-city' },
    { text: 'Hawa Mahal, Badi Chaupar, Jaipur', mainText: 'Hawa Mahal', secondaryText: 'Badi Chaupar, Jaipur', lat: 26.9239, lng: 75.8267, zoneId: 'walled-city' },
    { text: 'City Palace, Walled City, Jaipur', mainText: 'City Palace', secondaryText: 'Tulsi Marg, Gangori Bazaar, Jaipur', lat: 26.9258, lng: 75.8236, zoneId: 'walled-city' },
    { text: 'Statue Circle, C-Scheme, Jaipur', mainText: 'Statue Circle', secondaryText: 'C-Scheme, Jaipur', lat: 26.9100, lng: 75.8050, zoneId: 'cscheme-civillines' },
    { text: 'Panch Batti, MI Road, Jaipur', mainText: 'Panch Batti', secondaryText: 'MI Road, Jaipur', lat: 26.9185, lng: 75.8010, zoneId: 'cscheme-civillines' },
    { text: 'Sindhi Camp Central Bus Terminal, Jaipur', mainText: 'Sindhi Camp', secondaryText: 'Station Road, Jaipur', lat: 26.9215, lng: 75.7985, zoneId: 'cscheme-civillines' },
    { text: 'Mansarovar VT Road, Jaipur', mainText: 'VT Road Circle', secondaryText: 'Mansarovar, Jaipur', lat: 26.8670, lng: 75.7645, zoneId: 'mansarovar' },
    { text: 'Shipra Path, Mansarovar, Jaipur', mainText: 'Shipra Path', secondaryText: 'Sector 7, Mansarovar, Jaipur', lat: 26.8610, lng: 75.7610, zoneId: 'mansarovar' },
    { text: 'Gaurav Tower (GT), Malviya Nagar, Jaipur', mainText: 'Gaurav Tower (GT)', secondaryText: 'Sector 9, Malviya Nagar, Jaipur', lat: 26.8550, lng: 75.8160, zoneId: 'malviya-nagar' },
    { text: 'World Trade Park (WTP), Malviya Nagar, Jaipur', mainText: 'World Trade Park (WTP)', secondaryText: 'JLN Marg, Malviya Nagar, Jaipur', lat: 26.8530, lng: 75.8055, zoneId: 'malviya-nagar' },
    { text: 'Amrapali Circle, Vaishali Nagar, Jaipur', mainText: 'Amrapali Circle', secondaryText: 'Vaishali Nagar, Jaipur', lat: 26.9080, lng: 75.7430, zoneId: 'vaishali-nagar' },
    { text: 'Amer Fort, Delhi Road, Amer, Jaipur', mainText: 'Amer Fort', secondaryText: 'Amer, Jaipur, Rajasthan', lat: 26.9855, lng: 75.8513, zoneId: 'amer' },
    { text: 'Sanganer Town Bus Stand, Tonk Road, Jaipur', mainText: 'Sanganer Bus Stand', secondaryText: 'Sanganer, Jaipur', lat: 26.8205, lng: 75.7730, zoneId: 'sanganer' },
    { text: 'Jawahar Circle Garden, Malviya Nagar, Jaipur', mainText: 'Jawahar Circle', secondaryText: 'JLN Marg, Malviya Nagar, Jaipur', lat: 26.8402, lng: 75.8035, zoneId: 'jagatpura' },
  ];

  app.post('/api/places/autocomplete', async (req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.json({ suggestions: [] });
    }

    if (mapsKey) {
      try {
        const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
          },
          body: JSON.stringify({
            input,
            locationBias: {
              circle: {
                center: { latitude: 26.9124, longitude: 75.7873 },
                radius: 25000.0,
              },
            },
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data.suggestions && data.suggestions.length > 0) {
            const suggestions = data.suggestions
              .map((s: any) => ({
                placeId: s.placePrediction?.placeId,
                text: s.placePrediction?.text?.text || '',
                mainText: s.placePrediction?.structuredFormat?.mainText?.text || s.placePrediction?.text?.text,
                secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text || 'Jaipur, Rajasthan',
              }))
              .filter((s: any) => Boolean(s.text));

            if (suggestions.length > 0) {
              return res.json({ suggestions, source: 'google_places_autocomplete' });
            }
          }
        }
      } catch (err: any) {
        console.warn('[Places Autocomplete Proxy Notice]:', err?.message || err);
      }
    }

    // Filter local Jaipur landmarks
    const q = input.toLowerCase().trim();
    const suggestions = JAIPUR_LANDMARKS.filter(
      (lm) => lm.text.toLowerCase().includes(q) || lm.mainText.toLowerCase().includes(q)
    ).slice(0, 6);

    return res.json({ suggestions, source: 'jaipur_landmarks_directory', fallback: true });
  });

  // ---------------------------------------------------------------------------
  // Google Geocoding API Proxy for Reverse Geocoding Tapped Map Points
  // ---------------------------------------------------------------------------
  app.get('/api/maps/geocode', async (req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query params required' });
    }

    if (mapsKey) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`
        );
        if (response.ok) {
          const data: any = await response.json();
          if (data.results && data.results.length > 0) {
            const first = data.results[0];
            return res.json({
              formattedAddress: first.formatted_address,
              placeId: first.place_id,
              source: 'google_geocoding_api',
            });
          }
        }
      } catch (err: any) {
        console.warn('[Geocoding API Proxy Notice]:', err?.message || err);
      }
    }

    // Determine nearest landmark from JAIPUR_LANDMARKS
    let closestLandmark = JAIPUR_LANDMARKS[0];
    let minDist = 999999;
    for (const lm of JAIPUR_LANDMARKS) {
      const dist = Math.hypot(lat - lm.lat, lng - lm.lng);
      if (dist < minDist) {
        minDist = dist;
        closestLandmark = lm;
      }
    }

    return res.json({
      formattedAddress: `Near ${closestLandmark.mainText}, ${closestLandmark.secondaryText}`,
      landmark: closestLandmark.mainText,
      zoneId: closestLandmark.zoneId,
      source: 'jaipur_geo_landmarks',
      fallback: true,
    });
  });

  // Localized Jaipur civic fallback when rate-limits or quota delays occur
  function getJaipurCivicFallback(query: string, _type: 'maps' | 'search'): string {
    const q = query.toLowerCase();
    if (q.includes('hawa mahal') || q.includes('badi chaupar') || q.includes('walled city')) {
      return `• Landmark: Hawa Mahal (Palace of Winds), Badi Chaupar, Walled City Heritage Zone (Ward 68-74).
• Transit: Nearest metro station is Badi Chaupar (Jaipur Metro Pink Line Terminus, ~150m walking distance).
• Civic Profile: High tourist and market footfall; heritage pedestrian corridor with automated smart surveillance and fire sensor arrays.
• Commuter Advisory: Narrow streets; e-rickshaws and Pink Line metro recommended to avoid congested bazaar parking.`;
    }
    if (q.includes('sms hospital') || q.includes('sawai man singh')) {
      return `• Landmark: Sawai Man Singh (SMS) Hospital & Medical College, Tonk Road, C-Scheme / Lal Kothi border.
• Transit: Gandhi Nagar Railway Station (~2.2 km) and Narayan Singh Circle bus hub (~1.1 km).
• Civic Profile: Premier state tertiary referral hospital; 24x7 trauma center and emergency helipad.
• Commuter Advisory: Tonk Road corridor experiences peak-hour medical ambulance movement; use dedicated emergency lanes.`;
    }
    if (q.includes('sindhi camp') || q.includes('bus')) {
      return `• Landmark: Sindhi Camp Central Bus Terminal, Station Road.
• Transit: Sindhi Camp Metro Station (Interchange hub on Pink Line directly connected to the bus concourse).
• Civic Profile: Primary intercity Rajasthan Roadways (RSRTC) hub handling over 1,400 daily regional bus movements.
• Commuter Advisory: High traffic on Station Road during festival & evening departures; use metro underground concourse.`;
    }
    if (q.includes('mansarovar')) {
      return `• Landmark: Mansarovar Housing Complex & Metro Terminal, Bhrigu Path / Shipra Path.
• Transit: Mansarovar Elevated Metro Station (Pink Line Western Terminal).
• Civic Profile: Asia's largest planned residential layout under JDA; modern drainage and municipal feeder bus connectivity.
• Commuter Advisory: Adequate multi-level park-and-ride facility available at Mansarovar Metro.`;
    }
    if (q.includes('amer')) {
      return `• Landmark: Amer Fort & Maota Lake Heritage Enclave, Delhi-Jaipur Highway.
• Transit: Low-floor AC bus routes AC-1 and AC-2 from Ajmeri Gate / Jaipur Junction.
• Civic Profile: UNESCO World Heritage site with eco-sensitive hill buffer zone and water retention catchment.
• Commuter Advisory: Heavy weekend visitor queues; prefer early morning entry or authorized shuttle transport.`;
    }
    if (q.includes('lal kothi') || q.includes('nagar nigam')) {
      return `• Landmark: Jaipur Municipal Corporation (Nagar Nigam) Headquarters, Lal Kothi, Tonk Road.
• Transit: SMS Stadium bus stop & Tonk Road BRTS corridor (~300m).
• Civic Profile: Central administrative offices for Nagar Nigam Greater Jaipur and citizen grievance facilitation center.
• Commuter Advisory: Peak administrative hours 10:30 AM – 3:30 PM; dedicated visitor parking inside complex.`;
    }
    return `• Location: "${query}" within Jaipur Municipal Corporation jurisdiction (Nagar Nigam Heritage / Greater).
• Telemetry Status: Continuous civic monitoring active across municipal ward and feeder infrastructure.
• Transport Connectivity: Feeder buses, e-rickshaws, and Jaipur Metro Pink Line corridors serve adjacent arterial roads.
• Practical Tip: Check live zone pulse scores and civic telemetry on the Jaipur CityPulse dashboard before commuting.`;
  }

  // Gemini Maps Grounding endpoint (gemini-3.5-flash with googleMaps tool)
  app.post('/api/gemini/maps-grounding', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      if (ai) {
        // Query with googleMaps grounding tool
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `Provide accurate, up-to-date geographical, landmark, and municipal location information in Jaipur, Rajasthan for: "${query}". Focus on exact locality, municipal ward/zone, civic significance, transport connectivity, and practical commuter advice.`,
            config: {
              tools: [{ googleMaps: {} }],
              temperature: 0.2,
            },
          });

          return res.json({
            text: response.text,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
            model: 'gemini-3.5-flash',
            grounded: true,
          });
        } catch (groundingErr: any) {
          console.warn('[Gemini Maps Grounding Quota/Notice]:', groundingErr?.message || groundingErr);
        }
      }

      // Resilient fallback with authentic Jaipur municipal data
      return res.json({
        text: getJaipurCivicFallback(query, 'maps'),
        groundingMetadata: null,
        model: 'gemini-3.5-flash (Jaipur Knowledge Core)',
        fallback: true,
      });
    } catch (err: any) {
      console.error('[Maps Grounding Error]:', err?.message || err);
      return res.json({
        text: getJaipurCivicFallback(req.body?.query || 'Jaipur', 'maps'),
        groundingMetadata: null,
        fallback: true,
      });
    }
  });

  // Gemini Search Grounding endpoint (gemini-3.5-flash with googleSearch tool)
  app.post('/api/gemini/search-grounding', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `Find real-time up-to-date civic advisories, weather updates, traffic notifications, or municipal announcements in Jaipur, Rajasthan regarding: "${query}". Summarize clearly for citizens and municipal staff.`,
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.2,
            },
          });

          return res.json({
            text: response.text,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
            model: 'gemini-3.5-flash',
            grounded: true,
          });
        } catch (groundingErr: any) {
          console.warn('[Gemini Search Grounding Quota/Notice]:', groundingErr?.message || groundingErr);
        }
      }

      return res.json({
        text: getJaipurCivicFallback(query, 'search'),
        groundingMetadata: null,
        model: 'gemini-3.5-flash (Jaipur Knowledge Core)',
        fallback: true,
      });
    } catch (err: any) {
      console.error('[Search Grounding Error]:', err?.message || err);
      return res.json({
        text: getJaipurCivicFallback(req.body?.query || 'Jaipur', 'search'),
        groundingMetadata: null,
        fallback: true,
      });
    }
  });

  // Static bundle or Vite middleware fallback
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndexHtml);

  if (hasDist) {
    console.log(`[CityPulse Server] Serving production static bundle from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      if (fs.existsSync(distIndexHtml)) {
        return res.sendFile(distIndexHtml);
      }
      return next();
    });
  } else {
    console.log('[CityPulse Server] Dist bundle not found; Mounting Vite development middlewares');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CityPulse Jaipur] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[CityPulse Server Fatal Error]:', error);
});
