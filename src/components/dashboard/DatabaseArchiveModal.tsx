import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import {
  fetchHistoricalPulseSnapshots,
  fetchArchivedEventsFromFirestore,
  fetchCitizenReportsFromFirestore,
  isFirestoreAvailable,
  StoredPulseSnapshot,
} from '../../services/firebase';
import { CivicEvent, ResidentReport } from '../../types';
import { JAIPUR_ZONES } from '../../config/city';
import {
  Database,
  X,
  History,
  Activity,
  Layers,
  FileText,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const DatabaseArchiveModal: React.FC = () => {
  const { language } = useLanguage();
  const {
    isDatabaseArchiveOpen,
    setIsDatabaseArchiveOpen,
    archiveCurrentPulse,
    archiveEventsToDatabase,
    addToast,
    pulseMetrics,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'pulse' | 'events' | 'grievances'>('pulse');
  const [pulseSnapshots, setPulseSnapshots] = useState<StoredPulseSnapshot[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<CivicEvent[]>([]);
  const [storedReports, setStoredReports] = useState<ResidentReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [snapshots, events, reports] = await Promise.all([
        fetchHistoricalPulseSnapshots(30),
        fetchArchivedEventsFromFirestore(undefined, 50),
        fetchCitizenReportsFromFirestore(),
      ]);
      setPulseSnapshots(snapshots);
      setArchivedEvents(events);
      setStoredReports(reports);
    } catch (err) {
      console.error('Error loading database archives:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDatabaseArchiveOpen) {
      loadData();
    }
  }, [isDatabaseArchiveOpen]);

  if (!isDatabaseArchiveOpen) return null;

  const handleManualArchivePulse = async () => {
    setIsSaving(true);
    try {
      const success = await archiveCurrentPulse();
      if (success) {
        addToast({
          title: language === 'hi' ? 'डेटाबेस में सहेजा गया' : 'Pulse Snapshot Archived',
          message:
            language === 'hi'
              ? 'वर्तमान सिटी पल्स स्कोर (नब्ज़) फायरस्टोर डेटाबेस में सफलतापूर्वक सुरक्षित कर लिया गया है।'
              : 'Current city vital score and metrics have been archived to Firestore.',
          type: 'success',
        });
        await loadData();
      } else {
        addToast({
          title: language === 'hi' ? 'त्रुटि' : 'Archive Failed',
          message:
            language === 'hi'
              ? 'डेटाबेस में सुरक्षित करने में असमर्थ। कृपया कनेक्शन जांचें।'
              : 'Failed to archive snapshot to database.',
          type: 'warning',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualArchiveEvents = async () => {
    setIsSaving(true);
    try {
      const count = await archiveEventsToDatabase();
      addToast({
        title: language === 'hi' ? 'टेलीमेट्री संग्रहीत' : 'Telemetry Archived',
        message:
          language === 'hi'
            ? `${count} नागरिक घटनाएं व टेलीमेट्री रिकॉर्ड्स फायरस्टोर में सुरक्षित किए गए।`
            : `Successfully archived ${count} civic events to persistent database.`,
        type: 'success',
      });
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEvents =
    selectedZoneFilter === 'all'
      ? archivedEvents
      : archivedEvents.filter((e) => e.zoneId === selectedZoneFilter);

  const getBandBadge = (band: string) => {
    switch (band?.toLowerCase()) {
      case 'optimal':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300';
      case 'steady':
        return 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300';
      case 'strained':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300';
      case 'distressed':
      case 'critical':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] shadow-2xl overflow-hidden text-[var(--jaipur-text)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--jaipur-border)] bg-gradient-to-r from-[var(--jaipur-surface-warm)] via-[var(--jaipur-surface)] to-[var(--jaipur-surface-warm)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--jaipur-terracotta)] text-white shadow-md">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[var(--jaipur-text)]">
                  {language === 'hi'
                    ? 'फायरस्टोर डेटाबेस ऐतिहासिक अभिलेखागार'
                    : 'Firestore Persistent Database Archive'}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  {isFirestoreAvailable() ? 'Connected' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-[var(--jaipur-text-muted)] mt-0.5">
                {language === 'hi'
                  ? 'ऐतिहासिक नब्ज़ स्कोर (Pulse), पुरानी नागरिक घटनाएं और स्थायी शिकायत रिकॉर्ड्स।'
                  : 'Permanently store and query past pulse trends, old telemetry events, and citizen grievance history.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDatabaseArchiveOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--jaipur-border)] text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] hover:bg-[var(--jaipur-surface-warm)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-6 bg-[var(--jaipur-surface-warm)]/40 border-b border-[var(--jaipur-border)]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('pulse')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'pulse'
                  ? 'bg-[var(--jaipur-terracotta)] text-white shadow-xs'
                  : 'text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'नब्ज़ इतिहास' : 'Pulse Snapshots'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {pulseSnapshots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'events'
                  ? 'bg-[var(--jaipur-terracotta)] text-white shadow-xs'
                  : 'text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'पुरानी घटनाएं' : 'Archived Events'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {archivedEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('grievances')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'grievances'
                  ? 'bg-[var(--jaipur-terracotta)] text-white shadow-xs'
                  : 'text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'शिकायत डेटाबेस' : 'Citizen Grievances'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {storedReports.length}
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualArchivePulse}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Save current pulse metrics to Firestore database"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'वर्तमान नब्ज़ सहेजें' : 'Save Live Pulse'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualArchiveEvents}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--jaipur-terracotta)] hover:bg-[#A61045] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Archive recent civic events to database"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'घटनाएं सहेजें' : 'Archive Events'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 rounded-xl border border-[var(--jaipur-border)] text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] hover:bg-[var(--jaipur-surface-warm)] transition-colors cursor-pointer"
              title="Refresh from Firestore"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading && pulseSnapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <RefreshCw className="h-8 w-8 text-[var(--jaipur-terracotta)] animate-spin" />
              <p className="text-sm font-medium text-[var(--jaipur-text-muted)]">
                {language === 'hi'
                  ? 'फायरस्टोर डेटाबेस से रिकॉर्ड्स प्राप्त किए जा रहे हैं...'
                  : 'Retrieving historical records from Firestore database...'}
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: PULSE SNAPSHOTS */}
              {activeTab === 'pulse' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[var(--jaipur-text-muted)]">
                    <span>
                      {language === 'hi'
                        ? 'समय के साथ सहेजे गए पल्स रिकॉर्ड्स (नवीनतम पहले):'
                        : 'Stored City Vital Rhythm records over time (newest first):'}
                    </span>
                    <span className="font-mono">
                      {pulseSnapshots.length} {language === 'hi' ? 'स्नैपशॉट' : 'snapshots recorded'}
                    </span>
                  </div>

                  {pulseSnapshots.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--jaipur-border)] p-8 text-center space-y-3 bg-[var(--jaipur-surface-warm)]/30">
                      <Database className="h-10 w-10 text-[var(--jaipur-text-muted)] mx-auto opacity-50" />
                      <p className="text-sm text-[var(--jaipur-text-muted)]">
                        {language === 'hi'
                          ? 'डेटाबेस में अभी कोई पुराना पल्स स्नैपशॉट दर्ज नहीं है।'
                          : 'No historical pulse snapshots stored in Firestore yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleManualArchivePulse}
                        className="px-4 py-2 rounded-xl bg-[var(--jaipur-terracotta)] text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        {language === 'hi' ? 'पहला स्नैपशॉट अभी सहेजें' : 'Save First Snapshot Now'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pulseSnapshots.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-4 shadow-xs hover:border-[var(--jaipur-terracotta)] transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-2xl text-[var(--jaipur-terracotta)]">
                                {item.pulseScore}
                              </span>
                              <span className="text-xs text-[var(--jaipur-text-muted)] font-mono">/ 100</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getBandBadge(
                                  item.band
                                )}`}
                              >
                                {item.band}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-[var(--jaipur-text-muted)] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.timestamp).toLocaleTimeString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </div>

                          <div className="text-[11px] text-[var(--jaipur-text-muted)] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(item.timestamp).toLocaleDateString('en-IN')}</span>
                            <span className="mx-1">•</span>
                            <span>{item.activeIncidentsCount || 0} active incidents</span>
                          </div>

                          {/* Subscores breakdown */}
                          {item.categoryScores && (
                            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[var(--jaipur-border)] text-center font-mono text-[10px]">
                              <div className="p-1 rounded bg-[var(--jaipur-surface-warm)]">
                                <div className="text-[var(--jaipur-text-muted)]">Water</div>
                                <div className="font-bold text-[var(--jaipur-text)]">
                                  {item.categoryScores.water || 85}
                                </div>
                              </div>
                              <div className="p-1 rounded bg-[var(--jaipur-surface-warm)]">
                                <div className="text-[var(--jaipur-text-muted)]">AQI</div>
                                <div className="font-bold text-[var(--jaipur-text)]">
                                  {item.categoryScores.air_quality || 74}
                                </div>
                              </div>
                              <div className="p-1 rounded bg-[var(--jaipur-surface-warm)]">
                                <div className="text-[var(--jaipur-text-muted)]">Traffic</div>
                                <div className="font-bold text-[var(--jaipur-text)]">
                                  {item.categoryScores.traffic || 78}
                                </div>
                              </div>
                              <div className="p-1 rounded bg-[var(--jaipur-surface-warm)]">
                                <div className="text-[var(--jaipur-text-muted)]">Power</div>
                                <div className="font-bold text-[var(--jaipur-text)]">
                                  {item.categoryScores.power || 90}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ARCHIVED CIVIC EVENTS */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-[var(--jaipur-text-muted)]">
                      {language === 'hi'
                        ? 'डेटाबेस में संग्रहीत पुरानी नागरिक घटनाएं (जलभराव, जाम, बिजली कटौती):'
                        : 'Old incidents and telemetry events stored in Firestore:'}
                    </span>

                    {/* Zone Filter */}
                    <select
                      value={selectedZoneFilter}
                      onChange={(e) => setSelectedZoneFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] text-xs font-medium cursor-pointer"
                    >
                      <option value="all">
                        {language === 'hi' ? 'सभी 9 जोन' : 'All 9 Jaipur Zones'}
                      </option>
                      {JAIPUR_ZONES.map((z) => (
                        <option key={z.id} value={z.id}>
                          {language === 'hi' ? z.nameHi : z.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--jaipur-border)] p-8 text-center space-y-3 bg-[var(--jaipur-surface-warm)]/30">
                      <Layers className="h-10 w-10 text-[var(--jaipur-text-muted)] mx-auto opacity-50" />
                      <p className="text-sm text-[var(--jaipur-text-muted)]">
                        {language === 'hi'
                          ? 'इस श्रेणी अथवा जोन में कोई पुरानी घटना संग्रहीत नहीं है।'
                          : 'No archived events found for this filter in Firestore.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleManualArchiveEvents}
                        className="px-4 py-2 rounded-xl bg-[var(--jaipur-terracotta)] text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        {language === 'hi' ? 'लाइव घटनाएं अभी सहेजें' : 'Archive Live Events Now'}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--jaipur-border)] rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] overflow-hidden shadow-xs">
                      {filteredEvents.map((evt) => {
                        const zone = JAIPUR_ZONES.find((z) => z.id === evt.zoneId);
                        return (
                          <div key={evt.id} className="p-3.5 space-y-1.5 hover:bg-[var(--jaipur-surface-warm)]/40 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-[10px] font-mono uppercase font-bold text-[var(--jaipur-terracotta)]">
                                  {evt.category}
                                </span>
                                <h4 className="text-xs font-bold text-[var(--jaipur-text)]">
                                  {language === 'hi' ? evt.titleHi || evt.titleEn : evt.titleEn}
                                </h4>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)] shrink-0">
                                {new Date(evt.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </div>

                            <p className="text-xs text-[var(--jaipur-text-muted)]">
                              {language === 'hi' ? evt.descriptionHi || evt.descriptionEn : evt.descriptionEn}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {evt.locationName || zone?.nameEn || 'Jaipur'}
                              </span>
                              <span>Source: {evt.source}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CITIZEN GRIEVANCES */}
              {activeTab === 'grievances' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[var(--jaipur-text-muted)]">
                    <span>
                      {language === 'hi'
                        ? 'फायरस्टोर में स्थायी रूप से संग्रहीत नागरिक शिकायतें:'
                        : 'Permanent citizen reports saved in Firestore:'}
                    </span>
                    <span className="font-mono">
                      {storedReports.length} {language === 'hi' ? 'शिकायतें' : 'complaints stored'}
                    </span>
                  </div>

                  {storedReports.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--jaipur-border)] p-8 text-center space-y-3 bg-[var(--jaipur-surface-warm)]/30">
                      <FileText className="h-10 w-10 text-[var(--jaipur-text-muted)] mx-auto opacity-50" />
                      <p className="text-sm text-[var(--jaipur-text-muted)]">
                        {language === 'hi'
                          ? 'फायरस्टोर में अभी कोई नागरिक शिकायत दर्ज नहीं हुई है।'
                          : 'No citizen reports stored in Firestore yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--jaipur-border)] rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] overflow-hidden shadow-xs">
                      {storedReports.map((rep) => {
                        const zone = JAIPUR_ZONES.find((z) => z.id === rep.zoneId);
                        return (
                          <div key={rep.id} className="p-3.5 space-y-1.5 hover:bg-[var(--jaipur-surface-warm)]/40 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)]">
                                  {rep.id}
                                </span>
                                <h4 className="text-xs font-bold text-[var(--jaipur-text)]">
                                  {rep.title}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                {rep.status.replace('_', ' ')}
                              </span>
                            </div>

                            <p className="text-xs text-[var(--jaipur-text-muted)]">
                              {rep.description}
                            </p>

                            <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--jaipur-text-muted)]">
                              <span>Zone: {zone?.nameEn || rep.zoneId}</span>
                              <span>Landmark: {rep.landmark || 'Jaipur'}</span>
                              <span>Upvotes: {rep.upvotes || 0}</span>
                              <span>
                                {new Date(rep.timestamp).toLocaleDateString('en-IN')}{' '}
                                {new Date(rep.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 sm:px-6 bg-[var(--jaipur-surface-warm)] border-t border-[var(--jaipur-border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--jaipur-text-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {language === 'hi'
                ? 'डेटाबेस स्वचालित सिंक: हर 3 मिनट में नया पल्स स्नैपशॉट व टेलीमेट्री स्वतः आर्काइव होती है।'
                : 'Auto-sync active: A new pulse snapshot & telemetry batch is archived every 3 minutes.'}
            </span>
          </div>
          <span className="font-mono text-[10px]">
            DB: wired-geography-55p7n
          </span>
        </div>
      </div>
    </div>
  );
};
