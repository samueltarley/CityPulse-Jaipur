import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { AlertTriangle, Plus } from 'lucide-react';

export const FloatingReportButton: React.FC = () => {
  const { language } = useLanguage();
  const { activeTab, setActiveTab, role } = useAppStore();

  // If already on the report page, or logged in/viewing as city staff, hide button
  if (activeTab === 'report' || role === 'staff' || activeTab === 'staff') {
    return null;
  }

  return (
    <aside
      aria-label={language === 'hi' ? 'त्वरित नागरिक शिकायत रिपोर्टिंग' : 'Quick civic issue report'}
      className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 z-40"
    >
      <button
        type="button"
        onClick={() => {
          setActiveTab('report');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="group flex items-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-full bg-gradient-to-r from-[#D9707E] via-[#C93E68] to-[#C2185B] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#C2185B]/30 hover:shadow-2xl hover:shadow-[#C2185B]/45 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white/40 ring-4 ring-[#D9707E]/20"
        title={language === 'hi' ? 'समस्या रिपोर्ट करें' : 'Report an Issue'}
      >
        <span className="relative flex items-center justify-center h-6 w-6 rounded-full bg-white/20">
          <AlertTriangle className="h-3.5 w-3.5 text-[#F2A93B]" />
        </span>
        <span>{language === 'hi' ? 'समस्या रिपोर्ट करें' : 'Report an Issue'}</span>
        <Plus className="h-4 w-4 opacity-80 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </aside>
  );
};
