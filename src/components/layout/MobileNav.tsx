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

export const MobileNav: React.FC = () => {
  const { language } = useLanguage();
  const { activeTab, setActiveTab } = useAppStore();

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'dashboard',
      label: language === 'hi' ? 'डैशबोर्ड' : 'Pulse',
      icon: LayoutDashboard,
    },
    {
      id: 'public_help',
      label: language === 'hi' ? 'जन-सेवा' : 'Help',
      icon: HeartHandshake,
    },
    {
      id: 'report',
      label: language === 'hi' ? 'रिपोर्ट' : 'Report',
      icon: FileText,
    },
    {
      id: 'staff',
      label: language === 'hi' ? 'कंसोल' : 'Staff',
      icon: ShieldCheck,
    },
    {
      id: 'replay',
      label: language === 'hi' ? 'रीप्ले' : 'Replay',
      icon: History,
    },
    {
      id: 'about',
      label: language === 'hi' ? 'परिचय' : 'About',
      icon: Info,
    },
  ];

  return (
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#E0F2F5] dark:border-[#521E3B] bg-[#CCF1F4]/95 dark:bg-[#280D1F]/95 backdrop-blur-md px-1 py-1.5 transition-colors duration-300 shadow-lg">
      <div className="flex items-center justify-between w-full max-w-lg mx-auto">
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
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer select-none focus-visible:outline-none ${
                isActive
                  ? 'text-[#0891B2] dark:text-[#FFD1DC]'
                  : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
              }`}
            >
              <div
                className={`flex items-center justify-center p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#0891B2] text-white shadow-xs scale-105'
                    : 'text-current opacity-80'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </div>
              <span
                className={`mt-0.5 text-[10px] leading-tight truncate w-full text-center tracking-tight ${
                  isActive ? 'font-bold text-[#0891B2] dark:text-[#FFD1DC]' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
