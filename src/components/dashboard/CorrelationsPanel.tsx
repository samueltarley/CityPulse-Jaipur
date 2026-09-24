import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES } from '../../config/city';
import { Link2, ShieldCheck, AlertCircle, ArrowRight, Zap, Info } from 'lucide-react';

export const CorrelationsPanel: React.FC = () => {
  const { language } = useLanguage();
  const { correlations, setSelectedZoneId } = useAppStore();

  const getConfidenceBadge = (confidence: 'low' | 'medium' | 'high', score: number) => {
    switch (confidence) {
      case 'high':
        return {
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          label: language === 'hi' ? 'उच्च विश्वसनीयता' : 'High Confidence',
          percentage: `${Math.round(score * 100)}%`,
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          label: language === 'hi' ? 'मध्यम विश्वसनीयता' : 'Medium Confidence',
          percentage: `${Math.round(score * 100)}%`,
        };
      case 'low':
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
          label: language === 'hi' ? 'प्राथमिक संकेत' : 'Preliminary',
          percentage: `${Math.round(score * 100)}%`,
        };
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--jaipur-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--jaipur-peacock)]/15 text-[var(--jaipur-peacock)]">
            <Link2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[var(--jaipur-text)] uppercase tracking-wider flex items-center gap-2">
              <span>{language === 'hi' ? 'संभावित संबंध (क्रॉस-सिस्टम लिंक्स)' : 'Possible Civic Links'}</span>
              <span className="text-[10px] normal-case px-2 py-0.5 rounded-full bg-[var(--jaipur-peacock)]/10 text-[var(--jaipur-peacock)] font-mono font-bold">
                {correlations.length} Active
              </span>
            </h3>
            <p className="text-xs text-[var(--jaipur-text-secondary)]">
              {language === 'hi'
                ? 'बहु-स्रोत विसंगतियों का संयुक्त सह-संबंध विश्लेषण (कारण नहीं, मात्र संभावित संबंध)'
                : 'Correlated multi-source anomalies (always framed as possible link, never direct causation)'}
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[var(--jaipur-text-muted)] flex items-center gap-1 self-start sm:self-auto bg-[var(--jaipur-surface-warm)] px-2.5 py-1 rounded-md border border-[var(--jaipur-border)]">
          <Info className="h-3 w-3 text-[var(--jaipur-terracotta)]" />
          <span>Rolling 30-min window</span>
        </div>
      </div>

      {/* Correlation Cards */}
      {correlations.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-[var(--jaipur-surface-warm)]/50 border border-[var(--jaipur-border)] text-xs text-[var(--jaipur-text-secondary)] space-y-1">
          <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto opacity-80" />
          <p className="font-semibold text-sm text-[var(--jaipur-text)]">
            {language === 'hi' ? 'कोई असामान्य बहु-प्रणालीय संबंध नहीं' : 'No Anomalous Cross-System Links Detected'}
          </p>
          <p>
            {language === 'hi'
              ? 'वर्तमान में विभिन्न नागरिक प्रणालियों (मौसम, मेट्रो, विद्युत, शिकायतें) में स्वतंत्र प्रवाह है।'
              : 'All civic domains (weather, transit, power, grievances) are operating independently within normal baselines.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {correlations.map((corr) => {
            const badge = getConfidenceBadge(corr.confidence, corr.confidenceScore);
            const zoneNames =
              corr.zoneIds
                ?.map((zid) => {
                  const z = JAIPUR_ZONES.find((j) => j.id === zid);
                  return language === 'hi' ? z?.nameHi.split(' ')[0] : z?.nameEn.split(' ')[0];
                })
                .filter(Boolean)
                .join(' & ') || 'Citywide';

            return (
              <div
                key={corr.id}
                className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/60 hover:border-[var(--jaipur-peacock)]/40 p-3.5 space-y-2.5 transition-all"
              >
                {/* Top: Plausible pair tag & confidence badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--jaipur-peacock)] bg-[var(--jaipur-peacock)]/10 px-2 py-0.5 rounded">
                    {corr.plausiblePair || 'Cross-Domain Anomaly'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                  >
                    <span>{badge.label}</span>
                    <span>•</span>
                    <span className="font-mono">{badge.percentage}</span>
                  </span>
                </div>

                {/* Title */}
                <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] leading-snug">
                  {language === 'hi' ? corr.titleHi : corr.titleEn}
                </h4>

                {/* Explanation */}
                <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed bg-[var(--jaipur-surface)]/80 p-2.5 rounded-lg border border-[var(--jaipur-border)]/60">
                  {language === 'hi' ? corr.explanationHi : corr.explanationEn}
                </p>

                {/* Recommended Action */}
                {corr.recommendedActionEn && (
                  <div className="text-[11px] text-[var(--jaipur-text)] flex items-start gap-1.5 pt-1">
                    <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-amber-700 dark:text-amber-400">
                        {language === 'hi' ? 'प्रस्तावित कदम: ' : 'Recommended Action: '}
                      </strong>
                      {language === 'hi' ? corr.recommendedActionHi : corr.recommendedActionEn}
                    </span>
                  </div>
                )}

                {/* Affected Zones and inspect button */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--jaipur-border)]/40 text-[11px]">
                  <span className="text-[var(--jaipur-text-muted)]">
                    Zones: <strong className="text-[var(--jaipur-text)]">{zoneNames}</strong>
                  </span>

                  {corr.zoneIds?.[0] && (
                    <button
                      type="button"
                      onClick={() => setSelectedZoneId(corr.zoneIds?.[0] || null)}
                      className="text-[var(--jaipur-terracotta)] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
