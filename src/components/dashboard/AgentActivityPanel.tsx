import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { nabzAgent } from '../../agent/nabzAgent';
import { JAIPUR_ZONES } from '../../config/city';
import { AgentFlag } from '../../types';
import { getNearestHospitalForZone } from '../../config/emergencyPlaces';
import {
  Bot,
  Play,
  Pause,
  RotateCw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Radio,
  Eye,
  Activity,
  Layers,
  ArrowUpRight,
  FileCheck,
  Building2,
} from 'lucide-react';

interface AgentActivityPanelProps {
  mode?: 'full' | 'resident_advisory';
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({ mode = 'full' }) => {
  const { language } = useLanguage();
  const {
    role,
    agentFlags,
    agentCycleLogs,
    isAgentRunning,
    isAgentThinking,
    setIsAgentRunning,
    dismissAgentFlag,
    dismissAgentFlagWithReason,
    acknowledgeAgentFlag,
    escalateAgentFlag,
    setHighlightedEventIds,
    events,
    addToast,
  } = useAppStore();

  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [filterAudience, setFilterAudience] = useState<'all' | 'residents' | 'staff'>('all');
  const [dismissingFlagId, setDismissingFlagId] = useState<string | null>(null);
  const [dismissReasonInput, setDismissReasonInput] = useState('');

  // Filter open flags based on user role and optional filter
  const openFlags = agentFlags.filter((f) => f.status === 'open');

  const visibleFlags = openFlags.filter((f) => {
    if (role === 'resident') {
      return f.audience === 'residents' || f.audience === 'both';
    }
    if (filterAudience === 'residents') {
      return f.audience === 'residents';
    }
    if (filterAudience === 'staff') {
      return f.audience === 'city_staff';
    }
    return true; // staff viewing 'all'
  });

  const handleHighlight = (flag: AgentFlag) => {
    setHighlightedEventIds(flag.evidenceEventIds);
    // Smooth scroll down to map if needed
    const mapElement = document.getElementById('jaipur-city-map-container');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            WARNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            INFO
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    return (
      <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--jaipur-border)] text-[10px] font-mono text-[var(--jaipur-text-secondary)]">
        {confidence.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-[var(--jaipur-surface)] border-2 border-[var(--jaipur-border)] shadow-sm overflow-hidden">
      {/* Top Banner Header */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[var(--jaipur-terracotta)]/10 via-amber-500/5 to-transparent border-b border-[var(--jaipur-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-[var(--jaipur-terracotta)] flex items-center justify-center text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              {isAgentRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-[var(--jaipur-text)]">
                  {mode === 'resident_advisory'
                    ? (language === 'hi' ? 'नब्ज़ एआई नागरिक परामर्श' : 'Nabz AI Citizen Advisories')
                    : (language === 'hi' ? 'नब्ज़ एजेंट – स्वायत्त नागरिक प्रहरी' : 'Nabz Agent – Autonomous Civic Sentinel')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] border border-[var(--jaipur-terracotta)]/30">
                  {mode === 'resident_advisory' ? 'PUBLIC ADVISORY' : 'SPEC 6.2 AI'}
                </span>
              </div>
              <p className="text-xs text-[var(--jaipur-text-secondary)] mt-0.5">
                {mode === 'resident_advisory'
                  ? (language === 'hi'
                      ? 'नागरिकों और सार्वजनिक सुरक्षा के लिए स्वायत्त निगरानी प्रणाली द्वारा जारी वास्तविक अलर्ट'
                      : 'Real-time advisories generated by autonomous monitoring for public awareness.')
                  : (language === 'hi'
                      ? 'सतत स्वायत्त चक्र (निरीक्षण → विश्लेषण → निर्णय → फ्लैग) • प्रति 60 सेकेंड व नए सह-संबंध पर सक्रिय'
                      : 'Autonomous multi-modal monitoring loop (OBSERVE → ANALYZE → DECIDE → FLAG) • Every 60s & on correlations')}
              </p>
            </div>
          </div>

          {/* Right Controls: Pause/Resume, Manual Run (Only for Full/Staff view) */}
          {mode === 'full' && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsAgentRunning(!isAgentRunning)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isAgentRunning
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
                title={isAgentRunning ? 'Pause autonomous agent loop' : 'Resume autonomous agent loop'}
              >
                {isAgentRunning ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>{language === 'hi' ? 'एजेंट चालू है' : 'Agent Active'}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>{language === 'hi' ? 'एजेंट रुका हुआ है' : 'Agent Paused'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => nabzAgent.runCycle('user_manual')}
                disabled={isAgentThinking || !isAgentRunning}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isAgentThinking || !isAgentRunning
                    ? 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-muted)] border-[var(--jaipur-border)] opacity-60 cursor-not-allowed'
                    : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text)] border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)] hover:text-[var(--jaipur-terracotta)] active:scale-95 shadow-xs'
                }`}
                title="Trigger cycle now"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isAgentThinking ? 'animate-spin text-[var(--jaipur-terracotta)]' : ''}`} />
                <span>{isAgentThinking ? (language === 'hi' ? 'प्रक्रियाधीन...' : 'Analyzing...') : (language === 'hi' ? 'तुरंत जांचें' : 'Trigger Cycle')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Thinking Status Bar */}
        {mode === 'full' && isAgentThinking && (
          <div className="mt-3 p-2.5 rounded-xl bg-[var(--jaipur-surface)]/90 border border-[var(--jaipur-terracotta)]/40 flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--jaipur-terracotta)] animate-ping"></div>
              <span className="font-semibold text-[var(--jaipur-terracotta)]">
                {language === 'hi'
                  ? 'नब्ज़ एजेंट सोच रहा है: OBSERVE → ANALYZE → DECIDE → FLAG...'
                  : 'Nabz Agent is analyzing: OBSERVE → ANALYZE → DECIDE → FLAG...'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[var(--jaipur-text-secondary)]">
              Gemini 3.8 Flash • Grounded Reasoning
            </span>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Audience filter tabs for City Staff */}
        {mode === 'full' && role === 'staff' && (
          <div className="flex items-center justify-between gap-2 border-b border-[var(--jaipur-border)] pb-3">
            <div className="flex items-center gap-1 bg-[var(--jaipur-surface-warm)] p-1 rounded-lg border border-[var(--jaipur-border)]">
              <button
                type="button"
                onClick={() => setFilterAudience('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filterAudience === 'all'
                    ? 'bg-[var(--jaipur-surface)] text-[var(--jaipur-terracotta)] shadow-xs font-bold'
                    : 'text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)]'
                }`}
              >
                All Flags ({openFlags.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAudience('staff')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filterAudience === 'staff'
                    ? 'bg-[var(--jaipur-surface)] text-[var(--jaipur-terracotta)] shadow-xs font-bold'
                    : 'text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)]'
                }`}
              >
                Staff Only ({openFlags.filter((f) => f.audience === 'city_staff').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAudience('residents')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filterAudience === 'residents'
                    ? 'bg-[var(--jaipur-surface)] text-[var(--jaipur-terracotta)] shadow-xs font-bold'
                    : 'text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)]'
                }`}
              >
                Resident Advisories ({openFlags.filter((f) => f.audience === 'residents' || f.audience === 'both').length})
              </button>
            </div>

            <span className="text-xs text-[var(--jaipur-text-secondary)] font-mono">
              Role: Municipal Staff View
            </span>
          </div>
        )}

        {/* Active Flag Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-[#0891B2] dark:text-[#FFD1DC] uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#D9707E]" />
              <span>
                {language === 'hi'
                  ? `महत्वपूर्ण नागरिक अलर्ट (${visibleFlags.length})`
                  : `Active City Advisories (${visibleFlags.length})`}
              </span>
            </h4>
            <span className="text-xs font-semibold text-[#155E75] dark:text-[#E3B0C4]">
              {language === 'hi' ? 'सत्यापित जानकारी' : 'Verified Information'}
            </span>
          </div>

          {visibleFlags.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F0FCFD] dark:bg-[#280D1F] border border-dashed border-[#80DEEA] dark:border-[#521E3B] text-center space-y-2 shadow-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                {language === 'hi'
                  ? 'कोई सक्रिय आपातकालीन चेतावनी नहीं है। शहर के सभी इलाके सामान्य रूप से संचालित हो रहे हैं।'
                  : 'All clear! No active disruptions or emergency alerts across Jaipur right now.'}
              </p>
              <p className="text-xs text-[#3E6B75] dark:text-[#E3B0C4] font-medium">
                {language === 'hi'
                  ? 'सिटीपल्स लगातार 9 इलाकों की निगरानी कर रहा है और कोई समस्या आने पर यहाँ तुरंत सूचित करेगा।'
                  : 'CityPulse is continuously monitoring traffic, sanitation, power, and water across all 9 zones.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {visibleFlags.map((flag) => {
                const isExpanded = expandedFlagId === flag.id;
                const isCritical = flag.severity === 'critical';
                const isWarning = flag.severity === 'warning';
                const zoneNames = flag.zoneIds
                  .map((id) => {
                    const z = JAIPUR_ZONES.find((zn) => zn.id === id);
                    return language === 'hi' ? z?.nameHi : z?.nameEn || id;
                  })
                  .join(', ');

                // Evidence event objects
                const evidenceEvents = events.filter((e) => flag.evidenceEventIds.includes(e.id));

                return (
                  <div
                    key={flag.id}
                    className={`rounded-xl border transition-all shadow-xs p-4 sm:p-5 ${
                      isCritical
                        ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/15'
                        : isWarning
                        ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/15'
                        : 'border-sky-500/40 bg-sky-500/5 dark:bg-sky-950/15'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--jaipur-border)]/70">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityBadge(flag.severity)}
                        {getConfidenceBadge(flag.confidence)}
                        <span className="px-2 py-0.5 rounded bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] text-[10px] font-semibold text-[var(--jaipur-text-secondary)]">
                          {flag.audience === 'both'
                            ? (language === 'hi' ? 'नागरिक व निगम' : 'Public & Staff')
                            : flag.audience === 'residents'
                            ? (language === 'hi' ? 'नागरिक' : 'Residents')
                            : (language === 'hi' ? 'नगर निगम' : 'City Staff')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-[var(--jaipur-text-secondary)]">
                        <Clock className="h-3 w-3" />
                        <span>{flag.timeLabel} IST</span>
                        <button
                          type="button"
                          onClick={() => dismissAgentFlag(flag.id)}
                          className="ml-1 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] transition-colors cursor-pointer"
                          title="Dismiss flag"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Zone */}
                    <div className="mt-3">
                      <h5 className="text-base sm:text-lg font-bold text-[var(--jaipur-text)] flex items-start gap-2">
                        <span>{language === 'hi' ? flag.title.hi : flag.title.en}</span>
                      </h5>
                      <div className="flex items-center gap-1 text-xs text-[var(--jaipur-text-secondary)] mt-1">
                        <MapPin className="h-3.5 w-3.5 text-[var(--jaipur-terracotta)]" />
                        <span>
                          {language === 'hi' ? 'प्रभावित क्षेत्र: ' : 'Zones: '}
                          <strong>{zoneNames}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mt-2 text-xs sm:text-sm text-[var(--jaipur-text)] leading-relaxed">
                      <p className="p-2.5 rounded-lg bg-[var(--jaipur-surface)]/70 border border-[var(--jaipur-border)]/50">
                        {language === 'hi' ? flag.reasoning.hi : flag.reasoning.en}
                      </p>
                    </div>

                    {/* Suggested Action Box */}
                    <div className="mt-2.5 p-3 rounded-lg bg-[var(--jaipur-surface-warm)]/80 border border-[var(--jaipur-border)] flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 text-[var(--jaipur-terracotta)] shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-[var(--jaipur-text)] uppercase tracking-wider block text-[10px]">
                          {language === 'hi' ? 'अनुशंसित कार्यवाही (SUGGESTED ACTION)' : 'SUGGESTED ACTION'}
                        </span>
                        <p className="text-[var(--jaipur-text)] mt-0.5 leading-relaxed font-medium">
                          {language === 'hi' ? flag.suggestedAction.hi : flag.suggestedAction.en}
                        </p>
                      </div>
                    </div>

                    {/* Nearest Hospital Card on Flag Card (Phase 10 Places API requirement) */}
                    {(() => {
                      const primaryZoneId = flag.zoneIds[0] || 'walled-city';
                      const nearestHospital = getNearestHospitalForZone(primaryZoneId);
                      if (!nearestHospital) return null;

                      return (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-rose-600 text-white shrink-0">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                                {language === 'hi' ? 'निकटतम आपातकालीन अस्पताल' : 'Nearest Emergency Hospital'}
                              </span>
                              <span className="font-semibold text-[var(--jaipur-text)] text-xs">
                                {language === 'hi' && nearestHospital.nameHi ? nearestHospital.nameHi : nearestHospital.name}
                              </span>
                              <span className="text-[10px] text-[var(--jaipur-text-secondary)] block">
                                {nearestHospital.distanceKm} km away • {language === 'hi' && nearestHospital.openStatusHi ? nearestHospital.openStatusHi : nearestHospital.openStatus}
                              </span>
                            </div>
                          </div>

                          <a
                            href={nearestHospital.directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] shrink-0 transition-colors shadow-xs"
                          >
                            <span>{language === 'hi' ? 'दिशा-निर्देश' : 'Directions'}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      );
                    })()}

                    {/* Prominent Mandatory Safety Label & Staff Action Buttons */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--jaipur-border)]/50">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>
                          {language === 'hi'
                            ? 'एआई-जनरेटेड अलर्ट • कार्रवाई से पहले पुष्टि करें।'
                            : 'AI-generated flag. Verify before acting.'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* City Staff Triage Actions */}
                        {role === 'staff' && mode === 'full' && (
                          <div className="flex items-center gap-1.5 bg-[var(--jaipur-surface)] p-1 rounded-lg border border-[var(--jaipur-border)]">
                            <button
                              type="button"
                              onClick={() => {
                                acknowledgeAgentFlag(flag.id);
                                addToast({
                                  title: 'Flag Acknowledged',
                                  message: `${flag.title.en} marked as acknowledged by municipal staff.`,
                                  type: 'info',
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                              title="Acknowledge flag"
                            >
                              <FileCheck className="h-3 w-3" />
                              <span>{language === 'hi' ? 'स्वीकारें' : 'Acknowledge'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDismissingFlagId(dismissingFlagId === flag.id ? null : flag.id);
                                setDismissReasonInput('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                              title="Dismiss flag with specific reason"
                            >
                              <X className="h-3 w-3" />
                              <span>{language === 'hi' ? 'कारण सहित खारिज करें' : 'Dismiss'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                escalateAgentFlag(flag.id);
                                addToast({
                                  title: 'Flag Escalated',
                                  message: `${flag.title.en} elevated to CRITICAL severity.`,
                                  type: 'critical',
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                              title="Escalate to Critical"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              <span>{language === 'hi' ? 'प्राथमिकता बढ़ाएं' : 'Escalate'}</span>
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleHighlight(flag)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--jaipur-terracotta)] text-white hover:bg-[var(--jaipur-terracotta-dark)] active:scale-95 transition-all cursor-pointer shadow-xs"
                          title="Highlight evidence events on map"
                        >
                          <Eye className="h-3 w-3" />
                          <span>{language === 'hi' ? 'मानचित्र पर देखें' : 'Highlight on Map'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedFlagId(isExpanded ? null : flag.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] text-[var(--jaipur-text)] hover:border-[var(--jaipur-terracotta)] transition-colors cursor-pointer"
                        >
                          <span>{flag.evidenceEventIds.length} Evidence</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Inline Dismiss Reason Prompt */}
                    {dismissingFlagId === flag.id && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                          <span>
                            {language === 'hi'
                              ? 'फ्लैग खारिज करने का कारण दर्ज करें:'
                              : 'Enter reason for dismissing this flag:'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDismissingFlagId(null)}
                            className="p-0.5 rounded text-amber-700 hover:text-amber-900 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={dismissReasonInput}
                            onChange={(e) => setDismissReasonInput(e.target.value)}
                            placeholder="e.g. False alarm / Resolved by field patrol / Event diversion"
                            className="flex-1 rounded-lg border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] px-3 py-1.5 text-xs text-[var(--jaipur-text)] focus:outline-none focus:border-[var(--jaipur-terracotta)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const reason = dismissReasonInput.trim() || 'Dismissed by municipal staff';
                              dismissAgentFlagWithReason(flag.id, reason);
                              setDismissingFlagId(null);
                              addToast({
                                title: 'Flag Dismissed',
                                message: `Flag dismissed: "${reason}"`,
                                type: 'warning',
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer shrink-0"
                          >
                            {language === 'hi' ? 'खारिज करें' : 'Confirm Dismiss'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Collapsible Evidence Events List */}
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] space-y-2 animate-in fade-in duration-150">
                        <div className="text-[11px] font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                          Ground Telemetry Evidence ({evidenceEvents.length} items):
                        </div>
                        {evidenceEvents.length === 0 ? (
                          <div className="text-xs text-[var(--jaipur-text-muted)] italic">
                            Evidence events referenced: {flag.evidenceEventIds.join(', ')}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {evidenceEvents.map((evt) => (
                              <div
                                key={evt.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded bg-[var(--jaipur-surface-warm)] text-xs border border-[var(--jaipur-border)]/40"
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                  <span className="font-mono text-[10px] text-[var(--jaipur-text-muted)]">
                                    [{evt.source.toUpperCase()}]
                                  </span>
                                  <span className="font-medium text-[var(--jaipur-text)]">
                                    {language === 'hi' ? evt.titleHi : evt.titleEn}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-[var(--jaipur-text-secondary)] shrink-0">
                                  {evt.locationName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Activity Live Log per Cycle (Only in Full Console) */}
        {mode === 'full' && (
          <div className="rounded-xl bg-[var(--jaipur-surface-warm)]/60 border border-[var(--jaipur-border)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
                <h5 className="font-display text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                  {language === 'hi' ? 'एजेंट गतिविधि लाइव लॉग (प्रति चक्र)' : 'Agent Activity Live Log (Per Cycle)'}
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs text-[var(--jaipur-terracotta)] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{showLogs ? (language === 'hi' ? 'छुपाएं' : 'Hide') : (language === 'hi' ? 'दिखाएं' : 'Show')}</span>
                {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {showLogs && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {agentCycleLogs.length === 0 ? (
                  <div className="text-xs text-[var(--jaipur-text-muted)] italic py-2">
                    {language === 'hi'
                      ? 'एजेंट का पहला चक्र प्रारंभ हो रहा है...'
                      : 'Awaiting first autonomous agent observation cycle...'}
                  </div>
                ) : (
                  agentCycleLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] text-xs font-mono flex items-start gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                        log.flagsRaisedCount > 0
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-emerald-500'
                      }`} />
                      <div className="flex-1 overflow-hidden text-ellipsis">
                        <span className="text-[var(--jaipur-text)] font-medium">
                          {log.summaryLine}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
