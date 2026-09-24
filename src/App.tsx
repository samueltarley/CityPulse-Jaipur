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

const AppContent: React.FC = () => {
  const { activeTab, role, disabledFeedIds, feedStatuses, toasts, removeToast } = useAppStore();

  useEffect(() => {
    // Start live Open-Meteo polling and simulated ingestion feeds
    const feedManager = FeedManager.getInstance();
    feedManager.start();

    // Start AI Summary lifecycle coordinator (Spec 6.1)
    summaryCoordinator.start();

    // Start Nabz Agent Autonomous Civic Monitoring Loop (Spec 6.2)
    nabzAgent.start();

    return () => {
      feedManager.stop();
      summaryCoordinator.stop();
      nabzAgent.stop();
    };
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
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
