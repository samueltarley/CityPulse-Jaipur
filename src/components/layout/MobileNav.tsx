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
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { language } = useLanguage();
  const { activeTab, setActiveTab, role } = useAppStore();

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'dashboard',
      label: language === 'hi' ? 'डैशबोर्ड' : 'Pulse',
      icon: LayoutDashboard,
    },
    {
      id: 'staff',
      label: language === 'hi' ? 'कंसोल' : 'Console',
      icon: ShieldCheck,
    },
    ...(role !== 'staff' && activeTab !== 'staff'
      ? [
          {
            id: 'report' as TabId,
            label: language === 'hi' ? 'रिपोर्ट' : 'Report',
            icon: FileText,
          },
        ]
      : []),
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
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#E0F2F5] dark:border-[#521E3B] bg-[#CCF1F4]/95 dark:bg-[#280D1F]/95 backdrop-blur-md px-4 py-2 transition-colors duration-300 shadow-lg">
      <div className="flex items-center justify-around">
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
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:outline-none ${
                isActive
                  ? 'text-[#0F3E48] dark:text-[#FFD1DC]'
                  : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
              }`}
            >
              <div className={`relative p-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#0891B2] text-white shadow-sm'
                  : 'text-current opacity-85'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="mt-1 truncate max-w-[80px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
