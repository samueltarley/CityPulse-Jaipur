import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en, TranslationKey } from './en';
import { hi } from './hi';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('citypulse_lang');
    return saved === 'hi' || saved === 'en' ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('citypulse_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dictionary = language === 'hi' ? hi : en;
    let translation = dictionary[key] || en[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
