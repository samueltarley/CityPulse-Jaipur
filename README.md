# CityPulse Jaipur – Jaipur ki Nabz

> Real-time civic health monitoring, multi-domain telemetry fusion, and autonomous AI-driven intelligence for the Pink City of Jaipur.

---

## 📌 Problem & Purpose

**CityPulse Jaipur** addresses **AmiHacks Track B: Live Civic Health Dashboard**. Modern cities generate vast amounts of disparate civic data across isolated municipal silos—weather, air quality, traffic congestion, public transit delays, power grid SCADA, citizen grievance portals, and local news. Without a unified real-time intelligence layer, municipal authorities struggle with delayed crisis responses while citizens lack accessible, transparent insights into their neighborhood's live health.

CityPulse Jaipur bridges this gap by ingesting multi-modal telemetry across all **9 Jaipur Municipal Zones**, fusing domain signals into a real-time **City Vital Rhythm (0–100 Pulse Score)**, detecting cross-domain anomalies, and providing autonomous AI advisories in both English and Hindi.

---

## ✨ Key Features

- **Live City Vital Rhythm (ECG Pulse Score)**: Real-time 0–100 score weighted across Water (20%), AQI (20%), Traffic (20%), Complaints (25%), and Power (15%) with active ECG oscilloscope animation.
- **Multi-Domain Telemetry Data Fusion**: Synchronizes live Open-Meteo weather & AQI, Google Routes traffic corridors, Jaipur Metro Pink Line feeds, JMC citizen grievance queues, grid SCADA power logs, and local news advisories.
- **Cross-Domain Anomaly & "Possible Link" Detection**: Z-score anomaly engine that identifies cross-domain correlations (e.g., *heavy rain + drainage congestion → traffic bottleneck*) marked strictly as "possible links" rather than definitive causes.
- **Nabz AI Agent & Grounded AI Summaries**: Autonomous server-side AI agent powered by Google Gemini API (`@google/genai`) providing bilingual 2–3 sentence resident advisories, Maps Grounding, and Search Grounding.
- **Bilingual Interface (English & Hindi)**: Instant toggle between English and conversational Hindi (*शुद्ध और सहज बोलचाल की हिंदी*).
- **Resident Citizen Reporting**: Interactive geo-tagged grievance filing with photo attachments, location picking, and status tracking.
- **Municipal Command Console (City Staff Mode)**: Authenticated administrative dashboard with SHA-256 security verification, sensor overrides, dispatch management, and raw telemetry inspection.
- **Time-Travel Replay & Crisis Scenarios**: Interactive 24-hour replay scrubber and 1-click disaster scenario simulations (e.g., *Monsoon Flash Flood Crisis*).

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas API (ECG Oscilloscope)
- **State Management**: Zustand
- **Backend Server**: Node.js, Express (running as Vite dev middleware / production server)
- **AI & Intelligence**: `@google/genai` TypeScript SDK (Gemini API with Maps & Search Grounding)
- **Mapping & Location**: Google Maps Platform (`@vis.gl/react-google-maps`), Google Routes API (`computeRoutes`), Google Places API (Autocomplete & Nearby Emergency Search), Google Geocoding API
- **Live Environmental Data**: Open-Meteo Weather & Air Quality API

---

## 🏗 Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                   Multi-Modal Feeds                    │
 │  (Open-Meteo AQI/Weather • Google Routes • JMC Feeds)   │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │              Normalization & Telemetry Engine          │
 │   (Timestamp Alignment • Z-Score Anomaly • Weighting)   │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Nabz AI Intelligence Agent                │
 │    (Gemini Server Proxy • Grounding • 2-3 Sentences)    │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Interactive Citizen Dashboard             │
 │   (Pulse Rhythm • 2D Map • Zone Jharokhas • Replay)     │
 └─────────────────────────────────────────────────────────┘
```

---

## 📡 Data Sources

| Data Feed | Source Type | Description |
|---|---|---|
| **Weather & Air Quality (AQI)** | **Live API** | Real-time temperature, rainfall, wind, PM2.5, PM10, and AQI from Open-Meteo across 9 zone coordinates. |
| **Traffic Corridors** | **Live API / Fallback** | Real-time travel duration and congestion ratios for 8 major Jaipur corridors via Google Routes API. |
| **Emergency Directory** | **Live API / Fallback** | Hospitals, police stations, fire stations, and pharmacies via Google Places API (New) Nearby Search. |
| **Metro & Transit** | **Simulated Live Stream** | Jaipur Metro Pink Line frequency, delay telemetry, and station footfall. |
| **Power Grid SCADA** | **Simulated Live Stream** | 33/11kV Substation load levels, voltage stability, and feeder trip events. |
| **Citizen Complaints** | **Simulated + User Generated** | Geo-located sanitation, water supply, and street lighting grievances submitted by residents. |

---

## 🚀 Local Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Step-by-Step Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/citypulse-jaipur.git
   cd citypulse-jaipur
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your API credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   STAFF_USERNAME=STARKTECH
   STAFF_PASSWORD_HASH=92477265629e58ce89522ced3cbc330ec3130aab5ec79f5d7ae9fd5e57d962b7
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 🔒 Privacy & Responsible Design

- **Privacy First**: No Personally Identifiable Information (PII) is stored or processed. All citizen reports utilize anonymous session identifiers.
- **Non-Causal Language**: Multi-domain correlations are explicitly labeled as *"possible links"* or *"co-occurring events"* rather than definitive causes.
- **Graceful Degradation**: If external APIs experience rate limits or downtime, the application seamlessly falls back to deterministic local rule engines and cached baseline data.
- **SHA-256 Authentication**: City staff authentication uses client-side SHA-256 hash verification without transmitting or storing plain-text passwords.

---

## 👥 Team

Developed by **STARKTECH** for AmiHacks.
