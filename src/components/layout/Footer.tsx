import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { BlockPrintDivider } from '../theme/BlockPrintDivider';
import { JAIPUR_ZONES } from '../../config/city';
import { ShieldCheck, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();
  const { setIsPrivacyModalOpen } = useAppStore();

  return (
    <footer className="mt-16 w-full border-t border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/70 pb-20 md:pb-8 pt-8 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <BlockPrintDivider className="mb-6 opacity-40" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--jaipur-text-secondary)]">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-center md:text-left">
            <span className="font-display font-bold text-[var(--jaipur-terracotta)] text-sm">
              {t('appName')}
            </span>
            <span>•</span>
            <span>{t('footerNotice')}</span>

            {/* Privacy & Security Link Button */}
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 transition-all cursor-pointer shadow-xs ml-1"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'hi' ? 'गोपनीयता व सुरक्षा चार्टर' : 'Privacy & Security Charter'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[var(--jaipur-text-muted)]">
            <span className="font-semibold text-[var(--jaipur-text-secondary)]">
              {t('allZones')}:
            </span>
            {JAIPUR_ZONES.slice(0, 5).map((zone) => (
              <span key={zone.id}>
                {language === 'hi' ? zone.nameHi : zone.nameEn}
              </span>
            ))}
            <span>+ 4 more</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[var(--jaipur-text-muted)] border-t border-[var(--jaipur-border)]/50 pt-3">
          <span>
            Autonomous Civic Intelligence Platform for Heritage Conservation & Municipal Agility • Pink City Smart Grid Architecture
          </span>
          <span className="flex items-center gap-1.5 font-mono text-emerald-700 dark:text-emerald-400">
            <Lock className="h-3 w-3" />
            <span>End-to-End TLS 1.3 • PII Auto-Masked • Firestore DB Region Secured</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
