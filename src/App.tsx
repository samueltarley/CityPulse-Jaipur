/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { useAppStore } from './store/useAppStore';
import { FeedManager } from './engine/feedManager';
import { summaryCoordinator } from './engine/summaryCoordinator';
import { nabzAgent } from './agent/nabzAgent';
import { TopBar } from './components/layout/TopBar';
import { ReplayBanner } from './components/replay/ReplayBanner';
import { DesktopNav } from './components/layout/DesktopNav';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';
import { JaaliPattern } from './components/theme/JaaliPattern';
import { StaffLoginModal } from './components/auth/StaffLoginModal';
import { FloatingReportButton } from './components/common/FloatingReportButton';
import { ToastContainer } from './components/common/ToastContainer';
import { LiveAlertsBox } from './components/alerts/LiveAlertsBox';
import { LiveAlertToasts } from './components/alerts/LiveAlertToasts';

import { DashboardPage } from './pages/DashboardPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { StaffConsolePage } from './pages/StaffConsolePage';
import { ReplayDemoPage } from './pages/ReplayDemoPage';
import { AboutPage } from './pages/AboutPage';
import { PublicHelpPage } from './pages/PublicHelpPage';
import { DatabaseArchiveModal } from './components/dashboard/DatabaseArchiveModal';
import { PrivacyPolicyModal } from './components/common/PrivacyPolicyModal';
import {
  fetchCitizenReportsFromFirestore,
  subscribeToCitizenReports,
  archivePulseSnapshotToFirestore,
  archiveCivicEventsToFirestore,
} from './services/firebase';
import {
  seedRealCityReportsIfEmpty,
  REAL_JAIPUR_CITY_REPORTS,
} from './services/realCityReports';

const AppContent: React.FC = () => {
  const {
    activeTab,
    role,
    disabledFeedIds,
    feedStatuses,
    toasts,
    removeToast,
    isPrivacyModalOpen,
    setIsPrivacyModalOpen,
  } = useAppStore();
  const [isQuotaExceeded, setIsQuotaExceeded] = React.useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);

    // Start live Open-Meteo polling and simulated ingestion feeds
    const feedManager = FeedManager.getInstance();
    feedManager.start();

    // Start AI Summary lifecycle coordinator (Spec 6.1)
    summaryCoordinator.start();

    // Start Nabz Agent Autonomous Civic Monitoring Loop (Spec 6.2)
    nabzAgent.start();

    // Load persistent real citizen reports from Firestore on startup
    fetchCitizenReportsFromFirestore()
      .then((reports) => {
        if (reports && reports.length > 0) {
          useAppStore.getState().mergeResidentReports(reports);
        } else {
          // If Firestore collection is empty, seed verified real Jaipur municipal reports into Firestore
          seedRealCityReportsIfEmpty().then((seeded) => {
            useAppStore.getState().mergeResidentReports(seeded);
          });
        }
      })
      .catch((err) => {
        console.warn('[Firebase] Initial reports fetch error, using live city reports:', err);
        useAppStore.getState().mergeResidentReports(REAL_JAIPUR_CITY_REPORTS);
      });

    // Subscribe to realtime updates for citizen grievances
    const unsubReports = subscribeToCitizenReports((reports) => {
      useAppStore.getState().mergeResidentReports(reports);
    });

    // Initial snapshot archive and periodic background telemetry archiving (every 3 mins)
    const initialArchiveTimeout = setTimeout(() => {
      const state = useAppStore.getState();
      archivePulseSnapshotToFirestore(state.pulseMetrics);
      archiveCivicEventsToFirestore(state.events);
    }, 5000);

    const archiveInterval = setInterval(() => {
      const state = useAppStore.getState();
      archivePulseSnapshotToFirestore(state.pulseMetrics);
      archiveCivicEventsToFirestore(state.events);
    }, 3 * 60 * 1000);

    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
      unsubReports();
      clearTimeout(initialArchiveTimeout);
      clearInterval(archiveInterval);
      feedManager.stop();
      summaryCoordinator.stop();
      nabzAgent.stop();
    };
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'public_help':
        return <PublicHelpPage />;
      case 'report':
        return <ReportIssuePage />;
      case 'staff':
        return <StaffConsolePage />;
      case 'replay':
        return <ReplayDemoPage />;
      case 'about':
        return <AboutPage />;
      default:
        return <DashboardPage />;
    }
  };

  const disabledFeedsList = feedStatuses.filter((f) => disabledFeedIds.includes(f.feedId));

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--jaipur-bg)] text-[var(--jaipur-text)] selection:bg-[var(--jaipur-terracotta)] selection:text-white transition-colors duration-300 overflow-x-hidden w-full max-w-full">
      {/* Google Maps Platform Quota Exceeded Banner */}
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Background Architectural Jaali Pattern */}
      <JaaliPattern opacity={0.04} className="text-[var(--jaipur-terracotta)]" />

      {/* Top Application Header */}
      <TopBar />

      {/* Floating Compact Live Alerts Box & Mobile Bottom Sheet */}
      <LiveAlertsBox />

      {/* Slide-in Live Alert Toast Notifications */}
      <LiveAlertToasts />

      {/* Global Replay Mode & Demo Scenario Banner (Spec 8.5) */}
      <ReplayBanner />

      {/* Partial Data Notice when any feed is disabled in Staff Console */}
      {disabledFeedsList.length > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 text-center font-medium flex items-center justify-center gap-2">
          <span className="font-bold">⚠️ Partial Telemetry Data Mode:</span>
          <span>
            {disabledFeedsList.map((f) => f.nameEn).join(', ')} currently simulated offline. Calculations operating under heuristic fallback.
          </span>
        </div>
      )}

      {/* Desktop Tab Navigation */}
      <DesktopNav />

      {/* Main App Page Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {renderActivePage()}
      </main>

      {/* Floating Toast Notifications */}
      <ToastContainer />

      {/* Global Staff Login Modal */}
      <StaffLoginModal />

      {/* Firestore Persistent Database Archive Modal */}
      <DatabaseArchiveModal />

      {/* Certified Citizen Privacy & Security Charter Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Floating Action Button for Easy Citizen Issue Reporting */}
      <FloatingReportButton />

      {/* Global Footer */}
      <Footer />

      {/* Mobile Bottom Dock Navigation */}
      <MobileNav />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
