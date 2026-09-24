import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BlockPrintDivider } from '../theme/BlockPrintDivider';
import { JAIPUR_ZONES } from '../../config/city';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <footer className="mt-16 w-full border-t border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/70 pb-20 md:pb-8 pt-8 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <BlockPrintDivider className="mb-6 opacity-40" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--jaipur-text-secondary)]">
          <div className="flex items-center gap-2 text-center md:text-left">
            <span className="font-display font-bold text-[var(--jaipur-terracotta)] text-sm">
              {t('appName')}
            </span>
            <span>•</span>
            <span>{t('footerNotice')}</span>
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

        <div className="mt-4 text-center text-[10px] text-[var(--jaipur-text-muted)]">
          Autonomous Civic Intelligence Platform for Heritage Conservation & Municipal Agility • Pink City Smart Grid Architecture
        </div>
      </div>
    </footer>
  );
};
