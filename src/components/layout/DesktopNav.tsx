import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { TabId } from '../../types';
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  History,
  Info,
  HeartHandshake,
} from 'lucide-react';

export const DesktopNav: React.FC = () => {
  const { t } = useLanguage();
  const { activeTab, setActiveTab } = useAppStore();

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'dashboard',
      label: t('navDashboard'),
      icon: LayoutDashboard,
    },
    {
      id: 'public_help',
      label: t('navPublicHelp'),
      icon: HeartHandshake,
    },
    {
      id: 'report',
      label: t('navReport'),
      icon: FileText,
    },
    {
      id: 'staff',
      label: t('navStaffConsole'),
      icon: ShieldCheck,
    },
    {
      id: 'replay',
      label: t('navReplay'),
      icon: History,
    },
    {
      id: 'about',
      label: t('navAbout'),
      icon: Info,
    },
  ];

  return (
    <nav aria-label="Main Navigation" className="hidden md:block w-full border-b border-[#E0F2F5] dark:border-[#521E3B] bg-[#CCF1F4] dark:bg-[#280D1F] transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-1.5 py-1.5 overflow-x-auto scrollbar-none max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`group relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:outline-none ${
                  isActive
                    ? 'bg-[#0891B2] text-white shadow-sm font-bold'
                    : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48] dark:hover:text-white hover:bg-[#B2EBF2] dark:hover:bg-[#36142B]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-current opacity-90'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick status pill on right side of navbar */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#1F4E5A] dark:text-[#E3B0C4] bg-[#F0FCFD] dark:bg-[#36142B] px-3 py-1 rounded-full border border-[#CCF1F4] dark:border-[#521E3B] shrink-0 ml-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">{t('systemStatus')}</span>
        </div>
      </div>
    </nav>
  );
};
