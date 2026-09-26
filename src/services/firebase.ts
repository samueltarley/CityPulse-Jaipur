/**
 * Firebase Firestore Integration for CityPulse Jaipur.
 * Handles persistent storage of:
 * 1. Historical Pulse Snapshots (trend analysis over time)
 * 2. Civic Events & Telemetry Archive (historical incidents log)
 * 3. Citizen Grievance Reports (persistent community submissions & status tracking)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  Firestore,
  writeBatch,
} from 'firebase/firestore';
import type { PulseMetrics, CivicEvent, ResidentReport, PulseHistoryPoint } from '../types';
import firebaseConfigRaw from '../../firebase-applet-config.json';
import { redactPII, fuzzLocationCoordinates } from '../utils/privacySanitizer';

// Initialize Firebase App safely
const firebaseConfig = {
  apiKey: firebaseConfigRaw.apiKey,
  authDomain: firebaseConfigRaw.authDomain,
  projectId: firebaseConfigRaw.projectId,
  storageBucket: firebaseConfigRaw.storageBucket,
  messagingSenderId: firebaseConfigRaw.messagingSenderId,
  appId: firebaseConfigRaw.appId,
};

let db: Firestore | null = null;
let isInitialized = false;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Use specified firestoreDatabaseId if configured, or default
  const dbId = (firebaseConfigRaw as { firestoreDatabaseId?: string }).firestoreDatabaseId;
  db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  isInitialized = true;
  console.log('[Firebase] Connected to Firestore database:', dbId || '(default)');
} catch (err) {
  console.warn('[Firebase] Firestore initialization failed or offline fallback:', err);
}

export function isFirestoreAvailable(): boolean {
  return isInitialized && db !== null;
}

// -------------------------------------------------------------
// 1. PULSE SCORE HISTORY ARCHIVING & RETRIEVAL
// -------------------------------------------------------------

export interface StoredPulseSnapshot {
  id: string;
  timestamp: number;
  pulseScore: number;
  band: string;
  status: string;
  categoryScores: Record<string, number>;
  zoneScores: Record<string, number>;
  recordedAt: string;
  activeIncidentsCount: number;
}

/**
 * Periodically archives a pulse snapshot to Firestore
 */
export async function archivePulseSnapshotToFirestore(pulse: PulseMetrics): Promise<boolean> {
  if (!db) return false;
  try {
    const docId = `pulse-${pulse.lastCalculatedAt || Date.now()}`;
    const pulseDoc = doc(db, 'pulse_history', docId);

    const snapshotData: StoredPulseSnapshot = {
      id: docId,
      timestamp: pulse.lastCalculatedAt || Date.now(),
      pulseScore: pulse.cityScore,
      band: pulse.band,
      status: pulse.status,
      categoryScores: pulse.categoryScores,
      zoneScores: pulse.zoneScores,
      recordedAt: new Date(pulse.lastCalculatedAt || Date.now()).toISOString(),
      activeIncidentsCount: pulse.activeIncidentsCount,
    };

    await setDoc(pulseDoc, snapshotData, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to archive pulse snapshot:', err);
    return false;
  }
}

/**
 * Fetches historical pulse snapshots from Firestore
 */
export async function fetchHistoricalPulseSnapshots(limitCount = 24): Promise<StoredPulseSnapshot[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'pulse_history'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const results: StoredPulseSnapshot[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push(docSnap.data() as StoredPulseSnapshot);
    });
    // Return chronological order (oldest first for charting)
    return results.reverse();
  } catch (err) {
    console.error('[Firebase] Error fetching historical pulse snapshots:', err);
    return [];
  }
}

// -------------------------------------------------------------
// 2. CIVIC EVENTS ARCHIVE (Old Events Storage)
// -------------------------------------------------------------

/**
 * Archives important civic events to the persistent archive collection
 */
export async function archiveCivicEventsToFirestore(events: CivicEvent[]): Promise<number> {
  if (!db || events.length === 0) return 0;
  try {
    const batch = writeBatch(db);
    let count = 0;

    // Archive top 25 newest notable events in each sync cycle
    const notableEvents = events.slice(0, 25);

    for (const evt of notableEvents) {
      const docRef = doc(db, 'civic_events_archive', evt.id);
      batch.set(
        docRef,
        {
          eventId: evt.id,
          zoneId: evt.zoneId,
          category: evt.category,
          severity: evt.severity,
          titleEn: evt.titleEn,
          titleHi: evt.titleHi,
          descriptionEn: evt.descriptionEn,
          descriptionHi: evt.descriptionHi,
          locationName: evt.locationName || 'Jaipur',
          coordinates: evt.coordinates || { lat: 26.9124, lng: 75.7873 },
          timestamp: evt.timestamp,
          source: evt.source,
          archivedAt: Date.now(),
        },
        { merge: true }
      );
      count++;
    }

    await batch.commit();
    return count;
  } catch (err) {
    console.error('[Firebase] Failed to archive civic events:', err);
    return 0;
  }
}

/**
 * Fetches past archived civic events (filtered optionally by zone or category)
 */
export async function fetchArchivedEventsFromFirestore(
  zoneId?: string,
  limitCount = 50
): Promise<CivicEvent[]> {
  if (!db) return [];
  try {
    let q;
    if (zoneId) {
      q = query(
        collection(db, 'civic_events_archive'),
        where('zoneId', '==', zoneId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'civic_events_archive'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const results: CivicEvent[] = [];

    querySnapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: data.eventId || d.id,
        timestamp: data.timestamp,
        timestampIST: new Date(data.timestamp).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' IST',
        zoneId: data.zoneId,
        category: data.category,
        severity: data.severity || 'medium',
        titleEn: data.titleEn,
        titleHi: data.titleHi,
        descriptionEn: data.descriptionEn,
        descriptionHi: data.descriptionHi,
        locationName: data.locationName,
        coordinates: data.coordinates,
        source: data.source,
        status: 'active',
      });
    });

    return results;
  } catch (err) {
    console.error('[Firebase] Error fetching archived events:', err);
    return [];
  }
}

// -------------------------------------------------------------
// 3. CITIZEN REPORTS & GRIEVANCES PERSISTENCE
// -------------------------------------------------------------

/**
 * Saves a new citizen grievance report to Firestore
 */
export async function saveCitizenReportToFirestore(report: ResidentReport): Promise<boolean> {
  if (!db) return false;
  try {
    const reportRef = doc(db, 'citizen_reports', report.id);

    // Apply strict privacy sanitization and PII masking
    const sanitizedTitle = redactPII(report.title).cleanText;
    const sanitizedDesc = redactPII(report.description).cleanText;
    const sanitizedLandmark = redactPII(report.landmark || '').cleanText;
    const fuzzedCoords = report.coordinates
      ? fuzzLocationCoordinates(report.coordinates.lat, report.coordinates.lng)
      : { lat: 26.9124, lng: 75.7873 };

    await setDoc(reportRef, {
      ...report,
      title: sanitizedTitle,
      description: sanitizedDesc,
      landmark: sanitizedLandmark,
      coordinates: fuzzedCoords,
      privacyProtected: true,
      updatedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.error('[Firebase] Error saving citizen report to Firestore:', err);
    return false;
  }
}

/**
 * Updates status, upvotes, or timeline of a citizen report in Firestore
 */
export async function updateCitizenReportInFirestore(
  reportId: string,
  updates: Partial<ResidentReport>
): Promise<boolean> {
  if (!db) return false;
  try {
    const reportRef = doc(db, 'citizen_reports', reportId);
    await setDoc(
      reportRef,
      {
        ...updates,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('[Firebase] Error updating citizen report in Firestore:', err);
    return false;
  }
}

/**
 * Loads all stored citizen reports from Firestore
 */
export async function fetchCitizenReportsFromFirestore(): Promise<ResidentReport[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'citizen_reports'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const querySnapshot = await getDocs(q);
    const reports: ResidentReport[] = [];
    querySnapshot.forEach((d) => {
      reports.push(d.data() as ResidentReport);
    });
    return reports;
  } catch (err) {
    console.error('[Firebase] Error fetching citizen reports from Firestore:', err);
    return [];
  }
}

/**
 * Subscribes to live updates on citizen reports across all devices
 */
export function subscribeToCitizenReports(
  onReportsUpdate: (reports: ResidentReport[]) => void
): () => void {
  if (!db) {
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'citizen_reports'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reports: ResidentReport[] = [];
        snapshot.forEach((d) => {
          reports.push(d.data() as ResidentReport);
        });
        if (reports.length > 0) {
          onReportsUpdate(reports);
        }
      },
      (error) => {
        console.warn('[Firebase] Realtime citizen reports snapshot error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Failed to setup onSnapshot for citizen reports:', err);
    return () => {};
  }
}
