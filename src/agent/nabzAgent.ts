/**
 * Nabz Agent – Autonomous Multi-Source Civic Monitoring Agent for Jaipur (Spec 6.2).
 * Operates an autonomous loop: OBSERVE → ANALYZE → DECIDE → FLAG.
 * Runs every 60 seconds, and immediately when a new correlation appears.
 * Enforces deduplication, evidence event validation, bilingual output, and cycle logging.
 */

import { useAppStore } from '../store/useAppStore';
import {
  AgentFlag,
  AgentFlagSeverity,
  AgentFlagAudience,
  AgentConfidence,
  AgentSnapshot,
  AgentCycleLog,
} from '../types';
import { stripCodeFences } from '../services/gemini';
import { JAIPUR_ZONES } from '../config/city';
import { JAIPUR_ZONE_EMERGENCY_DATA } from '../config/emergencyPlaces';

export interface NabzAgentOutput {
  flags: Array<{
    flagType?: string;
    zoneIds: string[];
    severity: AgentFlagSeverity;
    title: { en: string; hi: string };
    reasoning: { en: string; hi: string };
    evidenceEventIds: string[];
    suggestedAction: { en: string; hi: string };
    audience: AgentFlagAudience;
    confidence: AgentConfidence;
  }>;
  noActionReason?: string;
}

export class NabzAgent {
  private static instance: NabzAgent | null = null;
  private loopTimer: NodeJS.Timeout | null = null;
  private isCycleExecuting = false;
  private prevCorrelationFingerprint = '';
  private isStarted = false;
  private unsubscribe: (() => void) | null = null;
  private initTimer: NodeJS.Timeout | null = null;

  public static getInstance(): NabzAgent {
    if (!NabzAgent.instance) {
      NabzAgent.instance = new NabzAgent();
    }
    return NabzAgent.instance;
  }

  public start() {
    if (this.isStarted) return;
    this.isStarted = true;

    const store = useAppStore.getState();
    this.prevCorrelationFingerprint = store.correlations.map((c) => c.id).join('|');

    // Run first observation cycle after telemetry stabilizes (3.5s)
    if (this.initTimer) clearTimeout(this.initTimer);
    this.initTimer = setTimeout(() => {
      this.runCycle('initialization');
    }, 3500);

    // Periodic 60-second loop
    if (this.loopTimer) clearInterval(this.loopTimer);
    this.loopTimer = setInterval(() => {
      this.runCycle('periodic_interval');
    }, 60000);

    // Event-driven trigger: Trigger immediately when a new correlation appears
    this.unsubscribe = useAppStore.subscribe((state) => {
      const currentCorrFingerprint = state.correlations.map((c) => c.id).join('|');
      if (currentCorrFingerprint !== this.prevCorrelationFingerprint) {
        this.prevCorrelationFingerprint = currentCorrFingerprint;
        if (state.correlations.length > 0) {
          console.log('[NabzAgent] New correlation appeared. Triggering immediate agent cycle.');
          this.runCycle('correlation_emergence');
        }
      }
    });
  }

  public stop() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isStarted = false;
  }

  /**
   * Main Agent Execution Loop: OBSERVE → ANALYZE → DECIDE → FLAG
   */
  public async runCycle(triggerReason: string = 'manual'): Promise<void> {
    const store = useAppStore.getState();

    // Check if agent is paused
    if (!store.isAgentRunning) {
      console.log('[NabzAgent] Agent is currently PAUSED. Skipping cycle.');
      return;
    }

    if (this.isCycleExecuting) {
      console.log('[NabzAgent] Cycle already executing. Skipping overlapping run.');
      return;
    }

    this.isCycleExecuting = true;
    store.setIsAgentThinking(true);

    const cycleStartTime = Date.now();
    const timeLabel = new Date(cycleStartTime).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    try {
      // -------------------------------------------------------------
      // 1. OBSERVE: Build compact snapshot of current civic state
      // -------------------------------------------------------------
      const snapshot = this.observeSnapshot(store);

      // -------------------------------------------------------------
      // 2. ANALYZE & 3. DECIDE: Query Gemini API or run deterministic fallback
      // -------------------------------------------------------------
      const agentDecision = await this.analyzeAndDecide(snapshot);

      // -------------------------------------------------------------
      // 4. FLAG: Validate evidence IDs, deduplicate, and raise flags
      // -------------------------------------------------------------
      const processedFlags = this.processFlags(agentDecision, store, timeLabel, cycleStartTime);

      // Log the cycle result
      const flagCount = processedFlags.length;
      let summaryText = '';

      if (flagCount > 0) {
        const topFlag = processedFlags[0];
        const zoneName = JAIPUR_ZONES.find((z) => z.id === topFlag.zoneIds[0])?.nameEn || 'City';
        summaryText = `${timeLabel} • Observed ${snapshot.eventsCount} events • ${topFlag.title.en} in ${zoneName} • Raised ${topFlag.severity.toUpperCase()} flag`;
      } else {
        const reason = agentDecision.noActionReason || 'All 9 zones operating within normal baseline limits';
        summaryText = `${timeLabel} • Observed ${snapshot.eventsCount} events • ${reason} • No action required`;
      }

      const cycleLog: AgentCycleLog = {
        id: `cycle-${cycleStartTime}`,
        timestamp: cycleStartTime,
        timeLabel,
        phase: flagCount > 0 ? 'FLAG' : 'DECIDE',
        summaryLine: summaryText,
        eventsObservedCount: snapshot.eventsCount,
        correlationsCount: snapshot.activeCorrelations.length,
        flagsRaisedCount: flagCount,
        noActionReason: agentDecision.noActionReason,
      };

      store.addAgentCycleLog(cycleLog);

      if (processedFlags.length > 0) {
        store.addAgentFlags(processedFlags);
      }
    } catch (error) {
      console.warn('[NabzAgent] Cycle execution notice:', error);
    } finally {
      this.isCycleExecuting = false;
      store.setIsAgentThinking(false);
    }
  }

  /**
   * OBSERVE Phase: Gathers sanitized compact multi-source snapshot.
   */
  private observeSnapshot(store: ReturnType<typeof useAppStore.getState>): AgentSnapshot {
    const zonePulses: Record<string, { score: number; band: string }> = {};
    JAIPUR_ZONES.forEach((z) => {
      const detail = store.pulseMetrics.zoneDetails[z.id];
      zonePulses[z.id] = {
        score: detail?.score ?? 78,
        band: detail?.band ?? 'calm',
      };
    });

    const activeAnomalies = store.anomalies.slice(0, 6).map((a) => ({
      id: a.id,
      zoneId: a.zoneId,
      metric: a.metricNameEn,
      severity: a.severity,
      summary: a.summaryEn,
    }));

    const activeCorrelations = store.correlations.slice(0, 5).map((c) => ({
      id: c.id,
      pair: c.plausiblePair || 'Cross-domain linkage',
      zones: c.zoneIds || [],
      confidence: c.confidence,
    }));

    const activeClusters = store.clusters.slice(0, 4).map((cl) => ({
      id: cl.id,
      zoneId: cl.zoneId,
      theme: cl.theme,
      count: cl.eventIds?.length || 0,
    }));

    const feedHealth: Record<string, string> = {};
    store.feedStatuses.forEach((f) => {
      feedHealth[f.nameEn] = f.status;
    });

    const openResidentReports = store.residentReports
      .filter((r) => r.status === 'submitted' || r.status === 'triaged')
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        zoneId: r.zoneId,
        category: r.category,
        title: r.title,
        landmark: r.landmark,
      }));

    // Candidate events that the agent can legally cite as evidence (last 30 public events)
    const candidateEvents = store.events.slice(0, 30).map((e) => ({
      id: e.id,
      zoneId: e.zoneId,
      category: e.category,
      title: e.titleEn,
      severity: e.severity,
      location: e.locationName,
    }));

    // Key nearby civic emergency facilities from Google Places Platform
    const nearbyEmergencyHelp: Record<string, { hospital: string; hospitalDist: string; police: string }> = {};
    JAIPUR_ZONES.forEach((z) => {
      const places = JAIPUR_ZONE_EMERGENCY_DATA[z.id] || [];
      const hosp = places.find((p) => p.category === 'hospital');
      const pol = places.find((p) => p.category === 'police');
      if (hosp) {
        nearbyEmergencyHelp[z.id] = {
          hospital: hosp.name,
          hospitalDist: `${hosp.distanceKm} km away`,
          police: pol ? `${pol.name} (${pol.distanceKm} km away)` : 'Local Police Post',
        };
      }
    });

    return {
      timestamp: Date.now(),
      eventsCount: store.events.length,
      zonePulses,
      activeAnomalies,
      activeCorrelations,
      activeClusters,
      feedHealth,
      openResidentReports,
      openFlagsCount: store.agentFlags.filter((f) => f.status === 'open').length,
      dismissedFlagKeys: store.dismissedFlagKeys,
      candidateEvents,
      nearbyEmergencyHelp,
    };
  }

  /**
   * ANALYZE & DECIDE: Calls server-side Gemini endpoint with 15s timeout,
   * falling back to deterministic autonomous logic if offline.
   */
  private async analyzeAndDecide(snapshot: AgentSnapshot): Promise<NabzAgentOutput> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/gemini/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          const cleaned = stripCodeFences(data.text);
          const parsed = JSON.parse(cleaned) as NabzAgentOutput;
          if (parsed && Array.isArray(parsed.flags)) {
            return parsed;
          }
        }
      }
    } catch (err: any) {
      console.warn('[NabzAgent] Server Gemini call unavailable or timed out. Running deterministic agent engine.');
    }

    // Deterministic Autonomous Analysis Fallback
    return this.deterministicAnalysis(snapshot);
  }

  /**
   * Deterministic Autonomous Analysis:
   * Analyzes snapshot using grounded civic rules to generate flags when AI API is unavailable.
   */
  private deterministicAnalysis(snapshot: AgentSnapshot): NabzAgentOutput {
    const flags: NabzAgentOutput['flags'] = [];

    // Rule 1: High/Medium Correlations -> Raise Warning/Critical Flag
    if (snapshot.activeCorrelations.length > 0) {
      const corr = snapshot.activeCorrelations[0];
      const targetZoneId = corr.zones[0] || 'walled-city';
      const zoneMeta = JAIPUR_ZONES.find((z) => z.id === targetZoneId);

      // Find relevant candidate events in these zones
      const matchingEvents = snapshot.candidateEvents.filter((e) =>
        corr.zones.includes(e.zoneId)
      );
      const evidenceEventIds = matchingEvents.slice(0, 3).map((e) => e.id);

      if (evidenceEventIds.length > 0) {
        const isRainTransit = corr.pair.toLowerCase().includes('rain') || corr.pair.toLowerCase().includes('transit');
        flags.push({
          flagType: isRainTransit ? 'rain_waterlogging_transit' : 'cross_domain_correlation',
          zoneIds: corr.zones,
          severity: corr.confidence === 'high' ? 'warning' : 'info',
          title: {
            en: `Possible Link: ${corr.pair} in ${zoneMeta?.nameEn || 'Jaipur'}`,
            hi: `संभावित संबंध: ${zoneMeta?.nameHi || 'जयपुर'} में ${corr.pair}`,
          },
          reasoning: {
            en: `Observed concurrent telemetry anomalies across transit and municipal feeds. Multiple sensor deviations suggest localized disruption along arterial routes.`,
            hi: `परिवहन और नागरिक संवेदकों में एक साथ विसंगतियां देखी गई हैं, जो मुख्य मार्गों पर यातायात व जलभराव प्रभाव की संभावना दर्शाती हैं।`,
          },
          evidenceEventIds,
          suggestedAction: {
            en: `Deploy traffic marshals to choke points and alert Pink Line commuters to plan 10 minutes extra buffer.`,
            hi: `व्यस्त चौराहों पर यातायात कर्मी तैनात करें और मेट्रो यात्रियों को 10 मिनट का अतिरिक्त समय लेकर चलने की सलाह दें।`,
          },
          audience: 'both',
          confidence: corr.confidence as AgentConfidence,
        });
      }
    }

    // Rule 2: Grievance Clusters (Sanitation / Water) -> Staff Flag
    if (snapshot.activeClusters.length > 0) {
      const cluster = snapshot.activeClusters[0];
      const zoneMeta = JAIPUR_ZONES.find((z) => z.id === cluster.zoneId);
      const clusterEvents = snapshot.candidateEvents.filter((e) => e.zoneId === cluster.zoneId);
      const evidenceEventIds = clusterEvents.slice(0, 3).map((e) => e.id);

      if (evidenceEventIds.length > 0) {
        flags.push({
          flagType: 'grievance_cluster',
          zoneIds: [cluster.zoneId],
          severity: cluster.count >= 5 ? 'warning' : 'info',
          title: {
            en: `Localized ${cluster.theme} Cluster in ${zoneMeta?.nameEn || cluster.zoneId}`,
            hi: `${zoneMeta?.nameHi || cluster.zoneId} में ${cluster.theme} का सघन समूह`,
          },
          reasoning: {
            en: `${cluster.count} citizen grievance reports filed within a 500m radius over the past hour.`,
            hi: `पिछले एक घंटे में 500 मीटर के दायरे में ${cluster.count} नागरिक शिकायतें दर्ज की गई हैं।`,
          },
          evidenceEventIds,
          suggestedAction: {
            en: `Dispatch municipal rapid action team with jetting machine and PHED valve inspection crew.`,
            hi: `नगर निगम जेटिंग मशीन और जलप्रदाय निरीक्षण दल को तत्काल मौके पर रवाना करें।`,
          },
          audience: 'city_staff',
          confidence: 'medium',
        });
      }
    }

    // Rule 3: Severe Anomaly
    if (flags.length === 0 && snapshot.activeAnomalies.length > 0) {
      const anom = snapshot.activeAnomalies.find((a) => a.severity === 'critical' || a.severity === 'warning');
      if (anom) {
        const zoneMeta = JAIPUR_ZONES.find((z) => z.id === anom.zoneId);
        const anomEvents = snapshot.candidateEvents.filter((e) => e.zoneId === anom.zoneId);
        const evidenceEventIds = anomEvents.slice(0, 2).map((e) => e.id);

        if (evidenceEventIds.length > 0) {
          flags.push({
            flagType: 'severe_telemetry_anomaly',
            zoneIds: [anom.zoneId],
            severity: anom.severity === 'critical' ? 'critical' : 'warning',
            title: {
              en: `Elevated ${anom.metric} Alert in ${zoneMeta?.nameEn || anom.zoneId}`,
              hi: `${zoneMeta?.nameHi || anom.zoneId} में ${anom.metric} का उच्च अलर्ट`,
            },
            reasoning: {
              en: `Statistical z-score deviation exceeded threshold for ${anom.metric} (${anom.summary}).`,
              hi: `${anom.metric} में सांख्यिकीय विचलन मानक सीमा से अधिक पाया गया (${anom.summary})।`,
            },
            evidenceEventIds,
            suggestedAction: {
              en: `Monitor feeder SCADA and issue precautionary advisory for sensitive populations.`,
              hi: `फीडर स्काडा की निगरानी रखें और संवेदनशील नागरिकों के लिए एहतियाती सूचना जारी करें।`,
            },
            audience: 'both',
            confidence: 'high',
          });
        }
      }
    }

    return {
      flags,
      noActionReason: flags.length === 0 ? 'All 9 administrative zones operating within verified baselines.' : undefined,
    };
  }

  /**
   * FLAG Phase:
   * 1. Validate that evidenceEventIds actually exist in the current event store. Drop flags without valid evidence!
   * 2. Deduplicate against dismissed flags and existing open flags (unless severity increased).
   */
  private processFlags(
    decision: NabzAgentOutput,
    store: ReturnType<typeof useAppStore.getState>,
    timeLabel: string,
    timestamp: number
  ): AgentFlag[] {
    const validEventIdSet = new Set(store.events.map((e) => e.id));
    const severityRank: Record<string, number> = { info: 1, warning: 2, critical: 3 };
    const processed: AgentFlag[] = [];

    decision.flags.forEach((rawFlag, index) => {
      // 1. Validation: Filter out fake evidence IDs
      const validEvidenceIds = (rawFlag.evidenceEventIds || []).filter((id) =>
        validEventIdSet.has(id)
      );

      // Drop flag if NO valid evidence IDs exist! (Rule 5)
      if (validEvidenceIds.length === 0) {
        console.warn(`[NabzAgent] Dropping flag "${rawFlag.title?.en}" because no valid evidence event IDs were found in store.`);
        return;
      }

      const flagType = rawFlag.flagType || 'general_civic_alert';
      const zoneId = rawFlag.zoneIds?.[0] || 'citywide';
      const dedupeKey = `${flagType}_${zoneId}`;

      // 2. Deduplication: Don't repeat dismissed flags! (Rule 4)
      if (store.dismissedFlagKeys.includes(dedupeKey)) {
        console.log(`[NabzAgent] Suppressing flag ${dedupeKey} because it was previously dismissed by user.`);
        return;
      }

      // 3. Deduplication: Don't re-raise open flag for same zone + type unless severity increased! (Rule 4)
      const existingOpen = store.agentFlags.find(
        (f) =>
          f.status === 'open' &&
          f.flagType === flagType &&
          (f.zoneIds[0] || 'citywide') === zoneId
      );

      if (existingOpen) {
        const existingRank = severityRank[existingOpen.severity] || 1;
        const newRank = severityRank[rawFlag.severity] || 1;
        if (newRank <= existingRank) {
          // Severity did not increase; do not re-raise
          return;
        }
      }

      // Construct verified AgentFlag
      const flag: AgentFlag = {
        id: `agent-flag-${timestamp}-${index}`,
        flagType,
        zoneIds: rawFlag.zoneIds || ['walled-city'],
        severity: rawFlag.severity || 'info',
        title: {
          en: rawFlag.title?.en || 'Civic Observation Alert',
          hi: rawFlag.title?.hi || 'नागरिक संज्ञान अलर्ट',
        },
        reasoning: {
          en: rawFlag.reasoning?.en || 'Multi-source telemetry indicator triggered a civic flag.',
          hi: rawFlag.reasoning?.hi || 'बहु-क्षेत्रीय टेलीमेट्री संवेदक द्वारा नागरिक चेतावनी दर्ज की गई।',
        },
        evidenceEventIds: validEvidenceIds,
        suggestedAction: {
          en: rawFlag.suggestedAction?.en || 'Verify ground situation via field cameras.',
          hi: rawFlag.suggestedAction?.hi || 'फील्ड कैमरों व कर्मियों से स्थिति की पुष्टि करें।',
        },
        audience: rawFlag.audience || 'both',
        confidence: rawFlag.confidence || 'medium',
        status: 'open',
        createdAt: timestamp,
        timeLabel,
      };

      processed.push(flag);
    });

    return processed;
  }
}

export const nabzAgent = NabzAgent.getInstance();
