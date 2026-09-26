import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  MapPin,
  Database,
  CheckCircle2,
  X,
  ShieldAlert,
  Server,
  FileCheck,
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--jaipur-surface)] border-2 border-[var(--jaipur-border)] shadow-2xl p-6 sm:p-8 space-y-6 text-[var(--jaipur-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--jaipur-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white uppercase tracking-wider mb-1">
                <span>CERTIFIED CIVIC PRIVACY & SECURITY CHARTER</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                {language === 'hi'
                  ? 'सिटीपल्स जयपुर: गोपनीयता व सुरक्षा केंद्र'
                  : 'CityPulse Jaipur Privacy & Security Center'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[var(--jaipur-border)] hover:bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Zero PII Requirement */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <EyeOff className="h-4 w-4" />
              <span>{language === 'hi' ? 'पहचान गोपनीयता' : 'Zero PII Required'}</span>
            </div>
            <h4 className="font-display text-sm font-bold">
              {language === 'hi' ? 'फोन नंबर या आधार कार्ड अनिवार्य नहीं' : 'No Phone or Identity Mandate'}
            </h4>
            <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
              {language === 'hi'
                ? 'शिकायत दर्ज करने या टेलीमेट्री देखने के लिए किसी भी नागरिक को अपना फोन नंबर, नाम या आधार विवरण देने की आवश्यकता नहीं है।'
                : 'Residents can access telemetry and report infrastructure failures with zero account registration, protecting whistleblower confidentiality.'}
            </p>
          </div>

          {/* 2. Automated PII Redaction */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              <span>{language === 'hi' ? 'स्वचालित डेटा मास्किंग' : 'Auto-Redaction Engine'}</span>
            </div>
            <h4 className="font-display text-sm font-bold">
              {language === 'hi' ? 'व्यक्तिगत विवरण का स्वतः लोप' : 'Real-time Phone & Email Redaction'}
            </h4>
            <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
              {language === 'hi'
                ? 'यदि विवरण में भूलवश कोई मोबाइल नंबर या ईमेल लिखा जाता है, तो हमारा AI सैनिटाइज़र उसे डेटाबेस में जाने से पहले स्वतः मास्क कर देता है।'
                : 'Our client-side and cloud ingest pipeline instantly sanitizes phone numbers, Aadhaar sequences, and email addresses prior to database storage.'}
            </p>
          </div>

          {/* 3. Geolocation Fuzzing */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <MapPin className="h-4 w-4" />
              <span>{language === 'hi' ? 'सड़क-स्तर भू-स्थान' : 'Street-Level Geofuzzing'}</span>
            </div>
            <h4 className="font-display text-sm font-bold">
              {language === 'hi' ? 'घरों के अंदर की लोकेशन सुरक्षित' : 'Public Roadway Alignment'}
            </h4>
            <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
              {language === 'hi'
                ? 'जीपीएस निर्देशांकों को सड़क व चौराहे के स्तर पर सीमित रखा जाता है, ताकि किसी के निजी घर का सटीक आंतरिक स्थान सार्वजनिक न हो।'
                : 'Raw coordinates are automatically fuzzed to 4 decimal places (~11 meters), aligning with municipal roadways while safeguarding personal domestic premises.'}
            </p>
          </div>

          {/* 4. Encrypted Google Cloud Storage */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Server className="h-4 w-4" />
              <span>{language === 'hi' ? 'क्लाउड एन्क्रिप्शन' : 'Encrypted Telemetry'}</span>
            </div>
            <h4 className="font-display text-sm font-bold">
              {language === 'hi' ? 'TLS 1.3 व फ़ायरस्टोर सुरक्षा' : 'TLS 1.3 & Firestore Rules'}
            </h4>
            <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
              {language === 'hi'
                ? 'सभी डेटा संचरण HTTPS/TLS 1.3 द्वारा सुरक्षित हैं। डेटाबेस स्तर पर सख्त सुरक्षा नियम (Rules) लागू हैं।'
                : 'Telemetry and reports are encrypted in transit over HTTPS and encrypted at rest on Google Cloud Firestore with validated security rules.'}
            </p>
          </div>
        </div>

        {/* 5. Anti-Abuse & Anti-Spam Protection */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{language === 'hi' ? 'विज्ञापन व ट्रैकर मुक्त गारंटी' : 'Zero Commercial Ad Tracking Guarantee'}</span>
          </div>
          <p className="text-[var(--jaipur-text-secondary)] leading-relaxed">
            {language === 'hi'
              ? 'सिटीपल्स जयपुर में कोई वाणिज्यिक विज्ञापन, फेसबुक पिक्सल, या तीसरे पक्ष का डेटा ट्रैकर नहीं है। यह विशुद्ध नागरिक सेवा मंच है।'
              : 'CityPulse Jaipur does not sell resident telemetry, employ third-party ad retargeting pixels, or engage in commercial user profiling.'}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--jaipur-border)]">
          <span className="text-[11px] font-mono text-[var(--jaipur-text-muted)]">
            DB: ai-studio-remixcitypulseja-4fbd89ec-7ebe-4037-9ec6-381e614dd2d2
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--jaipur-terracotta)] text-white text-xs font-bold hover:bg-[#A61045] transition-colors cursor-pointer shadow-xs"
          >
            {language === 'hi' ? 'स्वीकार करें व बंद करें' : 'Acknowledge & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
