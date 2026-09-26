import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { JharokhaCard } from '../components/theme/JharokhaCard';
import { AgentActivityPanel } from '../components/dashboard/AgentActivityPanel';
import { StaffLoginForm } from '../components/auth/StaffLoginForm';
import { AreaComplaintsSection } from '../components/dashboard/AreaComplaintsSection';
import { JAIPUR_ZONES } from '../config/city';
import { ResidentReport, ResidentReportStatus } from '../types';
import { formatDateTimeIST } from '../utils/dateFormat';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Download,
  AlertTriangle,
  Radio,
  Sliders,
  CheckCircle2,
  X,
  Flame,
  Search,
  BellRing,
  FileSpreadsheet,
  Activity,
  Clock,
  MapPin,
  AlertCircle,
  Eye,
  Send,
  Wrench,
  HelpCircle,
  XCircle,
  HardHat,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const MATRIX_CATEGORIES: Array<{
  id: string;
  nameEn: string;
  nameHi: string;
  icon: string;
  matchKeys: string[];
}> = [
  { id: 'waterlogging', nameEn: 'Waterlogging', nameHi: 'जलभराव', icon: '💧', matchKeys: ['waterlogging', 'water'] },
  { id: 'garbage', nameEn: 'Garbage', nameHi: 'कचरा ढेर', icon: '🗑️', matchKeys: ['garbage', 'sanitation', 'waste'] },
  { id: 'pothole', nameEn: 'Pothole', nameHi: 'सड़क गड्ढा', icon: '🕳️', matchKeys: ['pothole', 'road'] },
  { id: 'streetlight', nameEn: 'Streetlight', nameHi: 'स्ट्रीट लाइट', icon: '💡', matchKeys: ['streetlight', 'lighting'] },
  { id: 'stray_cattle', nameEn: 'Stray Cattle', nameHi: 'आवारा पशु', icon: '🐂', matchKeys: ['stray_cattle', 'cattle', 'animal'] },
  { id: 'noise', nameEn: 'Noise', nameHi: 'ध्वनि प्रदूषण', icon: '📢', matchKeys: ['noise', 'crowd'] },
  { id: 'water_supply', nameEn: 'Water Supply', nameHi: 'पेयजल संकट', icon: '🚰', matchKeys: ['water_supply', 'pipeline', 'leakage'] },
  { id: 'sewage', nameEn: 'Sewage', nameHi: 'सीवेज रिसाव', icon: '🚽', matchKeys: ['sewage', 'drainage'] },
  { id: 'traffic', nameEn: 'Traffic', nameHi: 'यातायात', icon: '🚗', matchKeys: ['traffic', 'transit', 'congestion'] },
  { id: 'power', nameEn: 'Power', nameHi: 'बिजली', icon: '⚡', matchKeys: ['power', 'electricity', 'grid'] },
];

function getReportMatrixCategory(report: ResidentReport): string {
  const raw = (report.rawCategory || '').toLowerCase();
  const cat = (report.category || '').toLowerCase();
  const title = (report.title || '').toLowerCase();
  const desc = (report.description || '').toLowerCase();

  for (const mc of MATRIX_CATEGORIES) {
    if (mc.id === raw) return mc.id;
    if (mc.matchKeys.some((k) => raw.includes(k) || cat === k || title.includes(k) || desc.includes(k))) {
      return mc.id;
    }
  }
  return 'waterlogging';
}

function isReportPending(status: ResidentReportStatus): boolean {
  return status !== 'resolved' && status !== 'rejected';
}

function formatPendingDuration(timestamp: number, isResolved: boolean, resolvedAt?: number): { text: string; isOver24h: boolean } {
  const endTime = isResolved && resolvedAt ? resolvedAt : Date.now();
  const diffMs = Math.max(0, endTime - timestamp);
  const isOver24h = diffMs > 24 * 60 * 60 * 1000 && !isResolved;

  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 60) return { text: `${mins}m`, isOver24h };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { text: `${hrs} hrs`, isOver24h };
  const days = Math.floor(hrs / 24);
  return { text: `${days}d ${hrs % 24}h`, isOver24h };
}

const RESPONSE_TEAMS = [
  { id: 'JMC Sanitation', nameEn: 'JMC Sanitation', nameHi: 'जेएमसी स्वच्छता विंग' },
  { id: 'PHED Water', nameEn: 'PHED Water', nameHi: 'पीएचईडी पेयजल सेल' },
  { id: 'JVVNL Power', nameEn: 'JVVNL Power', nameHi: 'जेवीवीएनएल विद्युत विंग' },
  { id: 'PWD Roads', nameEn: 'PWD Roads', nameHi: 'पीडब्ल्यूडी सड़क सेल' },
  { id: 'Traffic Police', nameEn: 'Traffic Police', nameHi: 'जयपुर यातायात पुलिस' },
  { id: 'Animal Control', nameEn: 'Animal Control', nameHi: 'पशु नियंत्रण विंग' },
];

const EXPECTED_TIMES = [
  { id: '1 hr', labelEn: '1 hr', labelHi: '1 घंटा' },
  { id: '4 hrs', labelEn: '4 hrs', labelHi: '4 घंटे' },
  { id: 'Today', labelEn: 'Today', labelHi: 'आज' },
  { id: 'Tomorrow', labelEn: 'Tomorrow', labelHi: 'कल' },
];

const QUICK_REPLY_TEMPLATES = [
  {
    en: 'Field team dispatched to location for on-ground inspection.',
    hi: 'मौके पर निरीक्षण हेतु फील्ड टीम रवाना कर दी गई है।',
  },
  {
    en: 'Inspected on site, materials and parts ordered for repairs.',
    hi: 'स्थल का निरीक्षण पूर्ण, मरम्मत सामग्री का आदेश दिया गया है।',
  },
  {
    en: 'Coordinating with traffic division for smooth flow during work.',
    hi: 'कार्य के दौरान यातायात सुचारू रखने हेतु ट्रैफिक पुलिस से समन्वय जारी है।',
  },
  {
    en: 'Water tanker route assigned to affected neighborhood.',
    hi: 'प्रभावित क्षेत्र में पेयजल टैंकर का मार्ग निर्धारित किया गया है।',
  },
  {
    en: 'Cleanliness drive conducted and waste container cleared.',
    hi: 'स्वच्छता अभियान चलाकर कचरा पात्र पूरी तरह खाली कर दिया गया है।',
  },
];

export const StaffConsolePage: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    role,
    residentReports,
    updateReportStatus,
    addReportReply,
    bulkUpdateReports,
    anomalies,
    agentFlags,
    feedStatuses,
    disabledFeedIds,
    toggleFeedDisabled,
    pulseMetrics,
    events,
    staffThresholds,
    setStaffThresholds,
    addToast,
  } = useAppStore();

  // Active Tab within Staff Console
  const [activeConsoleTab, setActiveConsoleTab] = useState<'queue' | 'agent' | 'feeds' | 'thresholds'>('queue');

  // Matrix and Queue Filters
  const [matrixFilter, setMatrixFilter] = useState<{ zoneId: string | null; categoryId: string | null }>({
    zoneId: null,
    categoryId: null,
  });
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'urgent'>('newest');

  // Bulk Selection State
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<{
    type: 'team_sent' | 'resolved' | null;
  }>({ type: null });
  const [bulkTeam, setBulkTeam] = useState<string>('JMC Sanitation');
  const [bulkExpectedTime, setBulkExpectedTime] = useState<string>('Today');
  const [bulkResolutionNote, setBulkResolutionNote] = useState<string>('');

  // Single Action Active Forms on cards
  const [activeActionForm, setActiveActionForm] = useState<{
    reportId: string;
    type: 'team_sent' | 'resolved' | 'need_info' | 'rejected' | 'custom_reply';
  } | null>(null);

  const [formTeam, setFormTeam] = useState<string>('JMC Sanitation');
  const [formExpectedTime, setFormExpectedTime] = useState<string>('4 hrs');
  const [formText, setFormText] = useState<string>('');
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});

  // Threshold form local state
  const [minPulseScore, setMinPulseScore] = useState<number>(staffThresholds.pulseAlertThreshold);
  const [maxAqiThreshold, setMaxAqiThreshold] = useState<number>(staffThresholds.aqiAlertThreshold);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // --- 1. AREA MATRIX CALCULATIONS ---
  const matrixData = useMemo(() => {
    // grid: [zoneId][categoryId] = count
    const counts: Record<string, Record<string, number>> = {};
    const zoneTotals: Record<string, number> = {};
    const zonePending: Record<string, number> = {};
    const catTotals: Record<string, number> = {};

    JAIPUR_ZONES.forEach((z) => {
      counts[z.id] = {};
      zoneTotals[z.id] = 0;
      zonePending[z.id] = 0;
      MATRIX_CATEGORIES.forEach((c) => {
        counts[z.id][c.id] = 0;
      });
    });

    MATRIX_CATEGORIES.forEach((c) => {
      catTotals[c.id] = 0;
    });

    residentReports.forEach((r) => {
      const zId = r.zoneId;
      const cId = getReportMatrixCategory(r);

      if (counts[zId]) {
        counts[zId][cId] = (counts[zId][cId] || 0) + 1;
        zoneTotals[zId] = (zoneTotals[zId] || 0) + 1;
        if (isReportPending(r.status)) {
          zonePending[zId] = (zonePending[zId] || 0) + 1;
        }
      }
      catTotals[cId] = (catTotals[cId] || 0) + 1;
    });

    return { counts, zoneTotals, zonePending, catTotals };
  }, [residentReports]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = residentReports.length;
    const pending = residentReports.filter((r) => isReportPending(r.status)).length;
    const teamSent = residentReports.filter((r) => r.status === 'team_sent').length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const resolvedToday = residentReports.filter(
      (r) => r.status === 'resolved' && (r.resolvedAt ? r.resolvedAt >= startOfToday.getTime() : true)
    ).length;

    // Most affected area (highest total or pending)
    let maxCount = -1;
    let mostAffectedZoneId = JAIPUR_ZONES[0].id;

    JAIPUR_ZONES.forEach((z) => {
      const count = matrixData.zoneTotals[z.id] || 0;
      if (count > maxCount) {
        maxCount = count;
        mostAffectedZoneId = z.id;
      }
    });

    const mostAffectedZone = JAIPUR_ZONES.find((z) => z.id === mostAffectedZoneId);

    return {
      total,
      pending,
      teamSent,
      resolvedToday,
      mostAffectedNameEn: mostAffectedZone?.nameEn || 'Walled City',
      mostAffectedNameHi: mostAffectedZone?.nameHi || 'चारदीवारी',
      mostAffectedCount: maxCount > 0 ? maxCount : 0,
    };
  }, [residentReports, matrixData]);

  // --- 2. FILTERED & SORTED REPORT LIST ---
  const filteredReports = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    return residentReports
      .filter((r) => {
        // Matrix Cell Filter
        if (matrixFilter.zoneId && r.zoneId !== matrixFilter.zoneId) return false;
        if (matrixFilter.categoryId) {
          const cId = getReportMatrixCategory(r);
          if (cId !== matrixFilter.categoryId) return false;
        }

        // Date Filter
        if (dateFilter === 'today' && now - r.timestamp > oneDayMs) return false;
        if (dateFilter === '7days' && now - r.timestamp > sevenDaysMs) return false;

        // Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'pending') {
            if (!isReportPending(r.status)) return false;
          } else if (r.status !== statusFilter) {
            return false;
          }
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = r.id.toLowerCase().includes(q);
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchDesc = r.description.toLowerCase().includes(q);
          const matchLandmark = r.landmark.toLowerCase().includes(q);
          const zoneObj = JAIPUR_ZONES.find((z) => z.id === r.zoneId);
          const matchZone = zoneObj ? (zoneObj.nameEn.toLowerCase().includes(q) || zoneObj.nameHi.includes(q)) : false;

          if (!matchId && !matchTitle && !matchDesc && !matchLandmark && !matchZone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.timestamp - a.timestamp;
        if (sortBy === 'oldest') return a.timestamp - b.timestamp;
        if (sortBy === 'urgent') {
          // Priority weight: critical (4), high (3), medium (2), low (1)
          const weight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          const sB = weight[b.severity || 'medium'] || 2;
          const sA = weight[a.severity || 'medium'] || 2;
          if (sB !== sA) return sB - sA;
          // If equal severity, older pending tickets are more urgent
          return a.timestamp - b.timestamp;
        }
        return 0;
      });
  }, [residentReports, matrixFilter, dateFilter, statusFilter, searchQuery, sortBy]);

  // Bulk Selection Helpers
  const isAllSelected = filteredReports.length > 0 && selectedReportIds.length === filteredReports.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Quick Action Handlers for Individual Reports
  const handleQuickStatusUpdate = (reportId: string, status: ResidentReportStatus) => {
    updateReportStatus(reportId, status);
  };

  const handleOpenActionForm = (reportId: string, type: 'team_sent' | 'resolved' | 'need_info' | 'rejected' | 'custom_reply') => {
    setActiveActionForm({ reportId, type });
    setFormText('');
    setFormTeam('JMC Sanitation');
    setFormExpectedTime('4 hrs');
  };

  const handleSubmitActionForm = (reportId: string) => {
    if (!activeActionForm) return;

    if (activeActionForm.type === 'team_sent') {
      updateReportStatus(reportId, 'team_sent', {
        team: formTeam,
        expectedTime: formExpectedTime,
      });
    } else if (activeActionForm.type === 'resolved') {
      const note = formText.trim() || 'Work completed and verified on-site.';
      updateReportStatus(reportId, 'resolved', { note });
    } else if (activeActionForm.type === 'need_info') {
      const note = formText.trim() || 'Please provide more specific details or a landmark to help resolve this issue.';
      updateReportStatus(reportId, 'need_info', { note });
    } else if (activeActionForm.type === 'rejected') {
      const note = formText.trim() || 'Duplicate / non-actionable entry.';
      updateReportStatus(reportId, 'rejected', { note });
    } else if (activeActionForm.type === 'custom_reply') {
      if (!formText.trim()) return;
      addReportReply(reportId, {
        messageEn: formText.trim(),
        messageHi: formText.trim(),
        staffName: 'STARKTECH',
      });
    }

    setActiveActionForm(null);
    setFormText('');
  };

  // Bulk Action Execution
  const handleBulkConsidered = () => {
    if (selectedReportIds.length === 0) return;
    bulkUpdateReports(selectedReportIds, 'considered');
    setSelectedReportIds([]);
  };

  const handleBulkInProgress = () => {
    if (selectedReportIds.length === 0) return;
    bulkUpdateReports(selectedReportIds, 'in_progress');
    setSelectedReportIds([]);
  };

  const handleConfirmBulkTeamSent = () => {
    if (selectedReportIds.length === 0) return;
    bulkUpdateReports(selectedReportIds, 'team_sent', {
      team: bulkTeam,
      expectedTime: bulkExpectedTime,
    });
    setBulkActionModal({ type: null });
    setSelectedReportIds([]);
  };

  const handleConfirmBulkResolved = () => {
    if (selectedReportIds.length === 0) return;
    const note = bulkResolutionNote.trim() || 'Addressed and verified in batch resolution.';
    bulkUpdateReports(selectedReportIds, 'resolved', { note });
    setBulkActionModal({ type: null });
    setBulkResolutionNote('');
    setSelectedReportIds([]);
  };

  // Browser notification toggle
  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      addToast({
        title: 'Not Supported',
        message: 'Browser notifications are not supported on this platform.',
        type: 'warning',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      new Notification('Jaipur CityPulse Staff Alert', {
        body: 'Municipal threshold notifications enabled for high-severity anomalies.',
        icon: '/favicon.ico',
      });
      addToast({
        title: 'Notifications Enabled',
        message: 'Browser alert permissions confirmed for critical civic events.',
        type: 'success',
      });
    } else {
      setBrowserNotificationsEnabled(false);
      addToast({
        title: 'Permission Denied',
        message: 'Browser notification permission was declined.',
        type: 'warning',
      });
    }
  };

  // Export Events to CSV
  const handleExportEventsCSV = () => {
    if (events.length === 0) {
      addToast({ title: 'No Events', message: 'No events available to export.', type: 'warning' });
      return;
    }

    const headers = ['Event ID', 'Timestamp (ISO)', 'Source', 'Category', 'Severity', 'Zone ID', 'Zone Name', 'Title (EN)', 'Title (HI)', 'Location', 'Latitude', 'Longitude'];
    const rows = events.map((e) => {
      const zName = JAIPUR_ZONES.find((z) => z.id === e.zoneId)?.nameEn || e.zoneId;
      return [
        `"${e.id}"`,
        `"${new Date(e.timestamp).toISOString()}"`,
        `"${e.source}"`,
        `"${e.category}"`,
        `"${e.severity}"`,
        `"${e.zoneId}"`,
        `"${zName}"`,
        `"${e.titleEn.replace(/"/g, '""')}"`,
        `"${e.titleHi.replace(/"/g, '""')}"`,
        `"${(e.locationName || '').replace(/"/g, '""')}"`,
        e.coordinates?.lat ?? '',
        e.coordinates?.lng ?? '',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jaipur_telemetry_events_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      title: 'Events CSV Exported',
      message: `Exported ${events.length} telemetry records to CSV.`,
      type: 'success',
    });
  };

  // Export Reports to CSV
  const handleExportReportsCSV = () => {
    if (residentReports.length === 0) {
      addToast({ title: 'No Reports', message: 'No resident reports available to export.', type: 'warning' });
      return;
    }

    const headers = ['Ticket ID', 'Timestamp (ISO)', 'Zone ID', 'Zone Name', 'Category', 'Raw Category', 'Title', 'Description', 'Landmark', 'Severity', 'Status', 'Team', 'Expected Time', 'Resolution Note'];
    const rows = residentReports.map((r) => {
      const zName = JAIPUR_ZONES.find((z) => z.id === r.zoneId)?.nameEn || r.zoneId;
      return [
        `"${r.id}"`,
        `"${new Date(r.timestamp).toISOString()}"`,
        `"${r.zoneId}"`,
        `"${zName}"`,
        `"${r.category}"`,
        `"${r.rawCategory || ''}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        `"${r.landmark.replace(/"/g, '""')}"`,
        `"${r.severity || 'medium'}"`,
        `"${r.status}"`,
        `"${r.assignedTeam || ''}"`,
        `"${r.expectedTime || ''}"`,
        `"${(r.resolutionNote || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jaipur_resident_reports_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      title: 'Reports CSV Exported',
      message: `Exported ${residentReports.length} resident grievance tickets to CSV.`,
      type: 'success',
    });
  };

  const getCellColorClass = (count: number) => {
    if (count === 0) return 'text-gray-400 dark:text-gray-500 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/40';
    if (count <= 2) return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800/60 shadow-xs hover:scale-105';
    if (count <= 5) return 'bg-orange-200 text-orange-950 dark:bg-orange-950/80 dark:text-orange-200 font-bold border border-orange-400 dark:border-orange-700 shadow-xs hover:scale-105';
    return 'bg-red-200 text-red-950 dark:bg-red-950/90 dark:text-red-200 font-extrabold border border-red-400 dark:border-red-700 shadow-sm animate-pulse hover:scale-105';
  };

  // If resident, display Staff Login Page
  if (role !== 'staff') {
    return (
      <div className="max-w-xl mx-auto my-8 sm:my-12 px-2">
        <StaffLoginForm />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#280D1F] p-6 sm:p-8 border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold mb-2 border border-red-500/20">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Jaipur Smart City Municipal Operations Center</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F3E48] dark:text-[#FFD1DC] tracking-tight">
              {language === 'hi' ? 'नगर निगम नियंत्रण कंसोल' : 'City Staff Operations Console'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#3E6B75] dark:text-[#E3B0C4] leading-relaxed max-w-3xl">
              {language === 'hi'
                ? 'क्षेत्रवार नागरिक शिकायतों का लाइव अवलोकन, त्वरित टीम प्रेषण, स्वचालित व कस्टम प्रत्युत्तर एवं बल्क कार्रवाइयां।'
                : 'Area-wise complaint matrix, multi-agency response dispatch, real-time resident replies, and autonomous sentinel controls.'}
            </p>
          </div>

          {/* Quick CSV Export Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={handleExportReportsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] hover:border-[#0891B2] text-[#0F3E48] dark:text-[#FFD1DC] shadow-xs cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export Reports CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportEventsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] hover:border-[#0891B2] text-[#0F3E48] dark:text-[#FFD1DC] shadow-xs cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#0891B2]" />
              <span>Export Events CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs within Staff Console */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#CCF1F4] dark:border-[#521E3B] pb-2">
        <button
          type="button"
          onClick={() => setActiveConsoleTab('queue')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeConsoleTab === 'queue'
              ? 'bg-[#0891B2] text-white shadow-xs'
              : 'bg-white dark:bg-[#280D1F] text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48] border border-[#CCF1F4] dark:border-[#521E3B]'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>
            {language === 'hi'
              ? `क्षेत्रवार शिकायतें व प्रतिक्रिया मंच (${residentReports.length})`
              : `Area Reports & Response Console (${residentReports.length})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveConsoleTab('agent')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeConsoleTab === 'agent'
              ? 'bg-[#0891B2] text-white shadow-xs'
              : 'bg-white dark:bg-[#280D1F] text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48] border border-[#CCF1F4] dark:border-[#521E3B]'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>
            {language === 'hi'
              ? `स्वायत्त नब्ज़ एजेंट (${agentFlags.filter((f) => f.status === 'open').length})`
              : `Nabz Autonomous Sentinel (${agentFlags.filter((f) => f.status === 'open').length})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveConsoleTab('feeds')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeConsoleTab === 'feeds'
              ? 'bg-[#0891B2] text-white shadow-xs'
              : 'bg-white dark:bg-[#280D1F] text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48] border border-[#CCF1F4] dark:border-[#521E3B]'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>
            {language === 'hi'
              ? `सेंसर टेलीमेट्री फीड्स (${feedStatuses.length})`
              : `Telemetry Feeds & Outage Sim (${feedStatuses.length})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveConsoleTab('thresholds')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeConsoleTab === 'thresholds'
              ? 'bg-[#0891B2] text-white shadow-xs'
              : 'bg-white dark:bg-[#280D1F] text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48] border border-[#CCF1F4] dark:border-[#521E3B]'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>
            {language === 'hi' ? 'अलर्ट सीमाएं व सेटिंग्स' : 'Threshold Alerts & Push Setup'}
          </span>
        </button>
      </div>

      {/* 3. TAB 1: AREA REPORTS OVERVIEW & RESPONSE SYSTEM */}
      {activeConsoleTab === 'queue' && (
        <div className="space-y-6">
          {/* Complaints by Area section at the top */}
          <AreaComplaintsSection />
          {/* Summary Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Reports */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3E6B75] dark:text-[#E3B0C4]">
                {language === 'hi' ? 'कुल शिकायतें' : 'Total Reports'}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                  {summaryMetrics.total}
                </span>
                <span className="text-xs text-[#3E6B75] dark:text-[#E3B0C4]">
                  9 {language === 'hi' ? 'क्षेत्र' : 'Zones'}
                </span>
              </div>
              <span className="text-[10px] text-[#0891B2] mt-1 font-medium">
                Jaipur Municipal Grid
              </span>
            </div>

            {/* Card 2: Pending */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3E6B75] dark:text-[#E3B0C4]">
                {language === 'hi' ? 'लंबित शिकायतें' : 'Pending Action'}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {summaryMetrics.pending}
                </span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                Awaiting resolution
              </span>
            </div>

            {/* Card 3: Team Sent */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3E6B75] dark:text-[#E3B0C4]">
                {language === 'hi' ? 'टीम रवाना' : 'Team Sent'}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {summaryMetrics.teamSent}
                </span>
                <HardHat className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-[10px] text-purple-700 dark:text-purple-300 mt-1 font-medium">
                Field crews deployed
              </span>
            </div>

            {/* Card 4: Resolved Today */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3E6B75] dark:text-[#E3B0C4]">
                {language === 'hi' ? 'आज निस्तारित' : 'Resolved Today'}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {summaryMetrics.resolvedToday}
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                Verified closed
              </span>
            </div>

            {/* Card 5: Most Affected Area */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3E6B75] dark:text-[#E3B0C4]">
                {language === 'hi' ? 'सर्वाधिक प्रभावित क्षेत्र' : 'Most Affected Area'}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 truncate">
                  {language === 'hi' ? summaryMetrics.mostAffectedNameHi : summaryMetrics.mostAffectedNameEn}
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 font-mono">
                  {summaryMetrics.mostAffectedCount}
                </span>
              </div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                Highest report concentration
              </span>
            </div>
          </div>

          {/* REPORTS BY AREA TABLE */}
          <div className="rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#CCF1F4] dark:border-[#521E3B]">
              <div>
                <h3 className="font-display text-base font-bold text-[#0F3E48] dark:text-[#FFD1DC] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0891B2]" />
                  <span>{language === 'hi' ? 'क्षेत्रवार शिकायतों का मैट्रिक्स (Reports by Area)' : 'Reports by Area Overview Grid'}</span>
                </h3>
                <p className="text-xs text-[#3E6B75] dark:text-[#E3B0C4] mt-0.5">
                  {language === 'hi'
                    ? 'सभी 9 जयपुर क्षेत्रों व 10 श्रेणियों में संख्या। किसी भी सेल पर क्लिक करके फ़िल्टर करें।'
                    : 'Click any cell to filter reports by that exact zone and category. Problem areas are highlighted by intensity.'}
                </p>
              </div>

              {/* Matrix Legend */}
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[#3E6B75] dark:text-[#E3B0C4]">
                <span>Count:</span>
                <span className="px-1.5 py-0.5 rounded text-gray-500 bg-gray-100 dark:bg-gray-800">0</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">1–2</span>
                <span className="px-1.5 py-0.5 rounded bg-orange-200 text-orange-950 dark:bg-orange-950/80 dark:text-orange-200">3–5</span>
                <span className="px-1.5 py-0.5 rounded bg-red-200 text-red-950 dark:bg-red-950/90 dark:text-red-200">6+</span>
              </div>
            </div>

            {/* Matrix Table with Horizontal Scroll on Mobile */}
            <div className="overflow-x-auto rounded-xl border border-[#CCF1F4] dark:border-[#521E3B]">
              <table className="w-full text-xs text-left border-collapse min-w-[840px]">
                <thead>
                  <tr className="bg-[#F0FCFD] dark:bg-[#1C0916] text-[#0F3E48] dark:text-[#FFD1DC] border-b border-[#CCF1F4] dark:border-[#521E3B]">
                    <th className="py-2.5 px-3 font-bold sticky left-0 z-10 bg-[#F0FCFD] dark:bg-[#1C0916] min-w-[140px]">
                      {language === 'hi' ? 'क्षेत्र (Zone)' : 'Jaipur Zone'}
                    </th>
                    {MATRIX_CATEGORIES.map((cat) => (
                      <th
                        key={cat.id}
                        onClick={() =>
                          setMatrixFilter((prev) => ({
                            zoneId: prev.zoneId,
                            categoryId: prev.categoryId === cat.id ? null : cat.id,
                          }))
                        }
                        className={`py-2.5 px-2 text-center font-bold cursor-pointer hover:bg-[#E0F7FA] dark:hover:bg-[#3B152B] transition-colors select-none ${
                          matrixFilter.categoryId === cat.id ? 'bg-[#0891B2] text-white' : ''
                        }`}
                        title={`Filter by ${cat.nameEn}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-base">{cat.icon}</span>
                          <span className="text-[10px] mt-0.5 leading-tight truncate max-w-[65px]">
                            {language === 'hi' ? cat.nameHi : cat.nameEn}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center font-bold bg-[#E0F7FA]/70 dark:bg-[#280D1F] text-[#0F3E48] dark:text-[#FFD1DC]">
                      {language === 'hi' ? 'कुल' : 'Total'}
                    </th>
                    <th className="py-2.5 px-3 text-center font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">
                      {language === 'hi' ? 'लंबित' : 'Pending'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CCF1F4] dark:divide-[#521E3B]">
                  {JAIPUR_ZONES.map((zone) => {
                    const isZoneFiltered = matrixFilter.zoneId === zone.id;
                    const zTotal = matrixData.zoneTotals[zone.id] || 0;
                    const zPending = matrixData.zonePending[zone.id] || 0;

                    return (
                      <tr
                        key={zone.id}
                        className={`hover:bg-[#F9FEFE] dark:hover:bg-[#280D1F]/60 transition-colors ${
                          isZoneFiltered ? 'bg-[#E0F7FA]/40 dark:bg-[#3B152B]/40 font-semibold' : ''
                        }`}
                      >
                        <td
                          onClick={() =>
                            setMatrixFilter((prev) => ({
                              zoneId: prev.zoneId === zone.id ? null : zone.id,
                              categoryId: prev.categoryId,
                            }))
                          }
                          className="py-2 px-3 font-semibold sticky left-0 z-10 bg-white dark:bg-[#280D1F] border-r border-[#CCF1F4] dark:border-[#521E3B] cursor-pointer hover:text-[#0891B2]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#0F3E48] dark:text-[#FFD1DC]">
                              {language === 'hi' ? zone.nameHi : zone.nameEn}
                            </span>
                            <span className="text-[10px] text-[#3E6B75] dark:text-[#E3B0C4] font-mono">
                              ({zone.code})
                            </span>
                          </div>
                        </td>

                        {MATRIX_CATEGORIES.map((cat) => {
                          const count = matrixData.counts[zone.id]?.[cat.id] || 0;
                          const isSelectedCell = matrixFilter.zoneId === zone.id && matrixFilter.categoryId === cat.id;

                          return (
                            <td
                              key={cat.id}
                              onClick={() => {
                                if (isSelectedCell) {
                                  setMatrixFilter({ zoneId: null, categoryId: null });
                                } else {
                                  setMatrixFilter({ zoneId: zone.id, categoryId: cat.id });
                                }
                              }}
                              className="py-2 px-1.5 text-center cursor-pointer select-none"
                            >
                              <div
                                className={`w-8 h-7 mx-auto rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer ${getCellColorClass(
                                  count
                                )} ${isSelectedCell ? 'ring-2 ring-[#0891B2] font-black' : ''}`}
                              >
                                {count}
                              </div>
                            </td>
                          );
                        })}

                        {/* Zone Total */}
                        <td
                          onClick={() =>
                            setMatrixFilter((prev) => ({
                              zoneId: prev.zoneId === zone.id ? null : zone.id,
                              categoryId: null,
                            }))
                          }
                          className="py-2 px-3 text-center font-bold text-[#0F3E48] dark:text-[#FFD1DC] bg-[#F0FCFD]/50 dark:bg-[#1C0916]/50 cursor-pointer hover:bg-[#E0F7FA]"
                        >
                          {zTotal}
                        </td>

                        {/* Zone Pending */}
                        <td
                          onClick={() => {
                            setMatrixFilter((prev) => ({
                              zoneId: prev.zoneId === zone.id ? null : zone.id,
                              categoryId: null,
                            }));
                            setStatusFilter('pending');
                          }}
                          className="py-2 px-3 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100"
                        >
                          {zPending}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Active Matrix Filter Chip */}
            {(matrixFilter.zoneId || matrixFilter.categoryId) && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#E0F7FA] dark:bg-[#3B152B] border border-[#0891B2]/30 text-xs text-[#0F3E48] dark:text-[#FFD1DC]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#0891B2]" />
                  <span>
                    Filtered by:{' '}
                    <strong>
                      {matrixFilter.zoneId
                        ? JAIPUR_ZONES.find((z) => z.id === matrixFilter.zoneId)?.nameEn
                        : 'All Zones'}
                    </strong>{' '}
                    •{' '}
                    <strong>
                      {matrixFilter.categoryId
                        ? MATRIX_CATEGORIES.find((c) => c.id === matrixFilter.categoryId)?.nameEn
                        : 'All Categories'}
                    </strong>{' '}
                    ({filteredReports.length} {language === 'hi' ? 'शिकायतें' : 'reports'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMatrixFilter({ zoneId: null, categoryId: null })}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#280D1F] border border-[#0891B2]/40 text-[11px] font-bold text-[#0891B2] hover:bg-[#0891B2] hover:text-white transition-colors cursor-pointer"
                >
                  Clear Matrix Filter ✕
                </button>
              </div>
            )}
          </div>

          {/* 4. FILTERS & SEARCH BAR */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#3E6B75] dark:text-[#E3B0C4]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'टिकट आईडी, विवरण, लैंडमार्क या क्षेत्र खोजें...'
                      : 'Search ticket ID, description, landmark, zone...'
                  }
                  className="w-full rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-[#F0FCFD]/40 dark:bg-[#1C0916]/40 pl-8 pr-3 py-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2]"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Date Filter */}
                <div className="flex items-center rounded-xl bg-[#F0FCFD] dark:bg-[#1C0916] p-1 border border-[#CCF1F4] dark:border-[#521E3B]">
                  <button
                    type="button"
                    onClick={() => setDateFilter('today')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      dateFilter === 'today'
                        ? 'bg-[#0891B2] text-white shadow-xs'
                        : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
                    }`}
                  >
                    {language === 'hi' ? 'आज' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('7days')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      dateFilter === '7days'
                        ? 'bg-[#0891B2] text-white shadow-xs'
                        : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
                    }`}
                  >
                    {language === 'hi' ? '7 दिन' : 'Last 7 Days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      dateFilter === 'all'
                        ? 'bg-[#0891B2] text-white shadow-xs'
                        : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
                    }`}
                  >
                    {language === 'hi' ? 'सभी' : 'All Time'}
                  </button>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-2.5 py-1.5 font-medium text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Only</option>
                  <option value="submitted">Submitted</option>
                  <option value="considered">Considered</option>
                  <option value="team_sent">Team Sent</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="need_info">Need Info</option>
                  <option value="rejected">Rejected</option>
                </select>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-2.5 py-1.5 font-medium text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2] cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="urgent">Sort: Most Urgent</option>
                </select>
              </div>
            </div>

            {/* Bulk Action Bar when reports selected */}
            {selectedReportIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#0891B2]/10 border border-[#0891B2]/30 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#0891B2]">
                    {selectedReportIds.length} {language === 'hi' ? 'शिकायतें चयनित' : 'reports selected'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedReportIds([])}
                    className="text-[11px] text-[#3E6B75] hover:underline cursor-pointer"
                  >
                    ({language === 'hi' ? 'चयन हटाएं' : 'Clear selection'})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleBulkConsidered}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    👀 Mark Considered
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkActionModal({ type: 'team_sent' })}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    👷 Dispatch Team
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkInProgress}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    🔧 Work in Progress
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkActionModal({ type: 'resolved' })}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ✅ Resolve Selected
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Action Modals */}
          {bulkActionModal.type === 'team_sent' && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-purple-900 dark:text-purple-300">
                  Dispatch Field Team for {selectedReportIds.length} Selected Reports:
                </span>
                <button
                  type="button"
                  onClick={() => setBulkActionModal({ type: null })}
                  className="text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                    Select Response Team:
                  </label>
                  <select
                    value={bulkTeam}
                    onChange={(e) => setBulkTeam(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-[#280D1F] px-3 py-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC]"
                  >
                    {RESPONSE_TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {language === 'hi' ? t.nameHi : t.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                    Expected Resolution Time:
                  </label>
                  <select
                    value={bulkExpectedTime}
                    onChange={(e) => setBulkExpectedTime(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-[#280D1F] px-3 py-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC]"
                  >
                    {EXPECTED_TIMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {language === 'hi' ? t.labelHi : t.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkActionModal({ type: null })}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkTeamSent}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Dispatch Team to All {selectedReportIds.length} Reports
                </button>
              </div>
            </div>
          )}

          {bulkActionModal.type === 'resolved' && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                  Bulk Resolution Note for {selectedReportIds.length} Selected Reports:
                </span>
                <button
                  type="button"
                  onClick={() => setBulkActionModal({ type: null })}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                  Official Action / Resolution Note:
                </label>
                <input
                  type="text"
                  value={bulkResolutionNote}
                  onChange={(e) => setBulkResolutionNote(e.target.value)}
                  placeholder="e.g. Field teams deployed, repairs completed and verified by municipal supervisor."
                  className="w-full rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#280D1F] px-3 py-2 text-xs text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkActionModal({ type: null })}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkResolved}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirm Resolution for {selectedReportIds.length} Reports
                </button>
              </div>
            </div>
          )}

          {/* 5. REPORT LIST */}
          <div className="space-y-3">
            {/* Header / Select All row */}
            <div className="flex items-center justify-between px-2 text-xs text-[#3E6B75] dark:text-[#E3B0C4]">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 font-bold hover:text-[#0891B2] cursor-pointer"
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4 text-[#0891B2]" />
                ) : (
                  <Square className="h-4 w-4 text-[#3E6B75]" />
                )}
                <span>
                  {isAllSelected ? (language === 'hi' ? 'चयन हटाएं' : 'Deselect All') : (language === 'hi' ? 'सभी चुनें' : 'Select All Visible')} ({filteredReports.length})
                </span>
              </button>

              <span className="font-mono">
                Showing {filteredReports.length} of {residentReports.length} tickets
              </span>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#280D1F] border border-dashed border-[#CCF1F4] dark:border-[#521E3B] text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <h4 className="font-display text-sm font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                  {language === 'hi' ? 'कोई मेल खाती शिकायत नहीं मिली' : 'No matching reports in queue'}
                </h4>
                <p className="text-xs text-[#3E6B75] dark:text-[#E3B0C4]">
                  {language === 'hi'
                    ? 'फ़िल्टर बदलें या अन्य कीवर्ड खोजें।'
                    : 'Try resetting filters or searching for another keyword.'}
                </p>
              </div>
            ) : (
              filteredReports.map((report) => {
                const zoneObj = JAIPUR_ZONES.find((z) => z.id === report.zoneId);
                const isSelected = selectedReportIds.includes(report.id);
                const isResolved = report.status === 'resolved';
                const { text: pendingText, isOver24h } = formatPendingDuration(report.timestamp, isResolved, report.resolvedAt);
                const matCat = MATRIX_CATEGORIES.find((c) => c.id === getReportMatrixCategory(report)) || MATRIX_CATEGORIES[0];
                const isFormActive = activeActionForm?.reportId === report.id;
                const isTimelineExpanded = expandedTimelines[report.id];

                return (
                  <div
                    key={report.id}
                    className={`rounded-2xl border p-5 transition-all shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none space-y-3.5 ${
                      isSelected
                        ? 'border-[#0891B2] bg-[#F0FCFD] dark:bg-[#280D1F]'
                        : 'border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] hover:border-[#0891B2]/40'
                    }`}
                  >
                    {/* VERY TOP: REASON FOR REPORT (किस बात के लिए रिपोर्ट है) - ANY LANGUAGE */}
                    <div className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-orange-500/15 border-l-4 border-l-amber-500 border border-amber-500/30 flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider shrink-0 shadow-xs">
                          {language === 'hi' ? 'रिपोर्ट का कारण' : 'REASON FOR REPORT'}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-[#0F3E48] dark:text-[#FFD1DC] truncate" title={report.reason || report.title}>
                          {report.reason || report.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#0891B2] bg-white/70 dark:bg-black/30 px-2 py-0.5 rounded shrink-0">
                        {report.id}
                      </span>
                    </div>

                    {/* Top Row: Checkbox, Ticket ID, Category, Area, Status, Pending Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(report.id)}
                          className="cursor-pointer text-[#0891B2]"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-[#3E6B75]" />
                          )}
                        </button>

                        {/* Ticket ID */}
                        <span className="font-mono text-xs font-bold text-[#0891B2] bg-[#CCF1F4] dark:bg-[#0891B2]/20 px-2.5 py-0.5 rounded-lg border border-[#CCF1F4] dark:border-[#521E3B]">
                          {report.id}
                        </span>

                        {/* Category badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F0FCFD] dark:bg-[#1C0916] text-[#0F3E48] dark:text-[#FFD1DC] border border-[#CCF1F4] dark:border-[#521E3B]">
                          <span>{matCat.icon}</span>
                          <span>{language === 'hi' ? matCat.nameHi : matCat.nameEn}</span>
                        </span>

                        {/* Area */}
                        <span className="text-xs font-bold text-[#0F3E48] dark:text-[#FFD1DC] flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#0891B2]" />
                          <span>{language === 'hi' ? zoneObj?.nameHi : zoneObj?.nameEn || report.zoneId}</span>
                        </span>

                        {/* Privacy Safeguard Badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          <span>{language === 'hi' ? 'गोपनीयता सुरक्षित' : 'Privacy Protected'}</span>
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            report.status === 'resolved'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : report.status === 'in_progress'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : report.status === 'team_sent'
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                              : report.status === 'considered' || report.status === 'acknowledged'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : report.status === 'rejected'
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              : report.status === 'need_info'
                              ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
                          }`}
                        >
                          <span>
                            {report.status === 'resolved'
                              ? 'Resolved'
                              : report.status === 'in_progress'
                              ? 'In Progress'
                              : report.status === 'team_sent'
                              ? 'Team Sent'
                              : report.status === 'considered' || report.status === 'acknowledged'
                              ? 'Considered'
                              : report.status === 'rejected'
                              ? 'Rejected'
                              : report.status === 'need_info'
                              ? 'Need Info'
                              : 'Submitted'}
                          </span>
                        </span>
                      </div>

                      {/* Right: Pending Duration & Timestamp */}
                      <div className="flex items-center gap-2">
                        {/* Pending Duration Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                            isOver24h
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>Pending {pendingText}</span>
                        </span>

                        <span className="text-[11px] text-[#3E6B75] dark:text-[#E3B0C4] font-mono">
                          {formatDateTimeIST(report.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Title, Landmark, Description */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-sm font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                          {report.title}
                        </h4>
                        <span className="text-xs text-[#3E6B75] dark:text-[#E3B0C4]">
                          • {report.landmark}
                        </span>
                      </div>
                      <p className="text-xs text-[#1F4E5A] dark:text-[#E3B0C4] leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    {/* Assigned team chip if deployed */}
                    {(report.assignedTeam || report.expectedTime) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {report.assignedTeam && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold text-[11px]">
                            <HardHat className="h-3.5 w-3.5" />
                            <span>Assigned: {report.assignedTeam}</span>
                          </span>
                        )}
                        {report.expectedTime && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-[11px]">
                            <Clock className="h-3.5 w-3.5" />
                            <span>ETA: {report.expectedTime}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* 3. RESPONSE ACTION BUTTONS */}
                    <div className="pt-2 border-t border-[#CCF1F4] dark:border-[#521E3B] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#3E6B75] dark:text-[#E3B0C4]">
                        {language === 'hi' ? 'नागरिक को त्वरित प्रतिक्रिया:' : 'Response Actions:'}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* 1. Considered / Under Review */}
                        <button
                          type="button"
                          onClick={() => handleQuickStatusUpdate(report.id, 'considered')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Considered</span>
                        </button>

                        {/* 2. Team Sent */}
                        <button
                          type="button"
                          onClick={() => handleOpenActionForm(report.id, 'team_sent')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <HardHat className="h-3.5 w-3.5" />
                          <span>Team Sent</span>
                        </button>

                        {/* 3. Work in Progress */}
                        <button
                          type="button"
                          onClick={() => handleQuickStatusUpdate(report.id, 'in_progress')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          <span>In Progress</span>
                        </button>

                        {/* 4. Resolved */}
                        <button
                          type="button"
                          onClick={() => handleOpenActionForm(report.id, 'resolved')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Resolved</span>
                        </button>

                        {/* 5. Need More Info */}
                        <button
                          type="button"
                          onClick={() => handleOpenActionForm(report.id, 'need_info')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span>Need Info</span>
                        </button>

                        {/* 6. Rejected / Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleOpenActionForm(report.id, 'rejected')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>

                        {/* Custom Reply Trigger */}
                        <button
                          type="button"
                          onClick={() => handleOpenActionForm(report.id, 'custom_reply')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#CCF1F4] dark:bg-[#0891B2]/20 text-[#0891B2] border border-[#CCF1F4] dark:border-[#521E3B] hover:bg-[#0891B2] hover:text-white transition-colors cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Custom Reply</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Action Sub-Form */}
                    {isFormActive && (
                      <div className="p-3.5 rounded-xl bg-[#F0FCFD] dark:bg-[#1C0916] border border-[#CCF1F4] dark:border-[#521E3B] space-y-2.5 animate-in fade-in duration-150">
                        {/* Header of action form */}
                        <div className="flex items-center justify-between text-xs font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                          <span>
                            {activeActionForm.type === 'team_sent' && '👷 Dispatch Response Team & Set Expected Time'}
                            {activeActionForm.type === 'resolved' && '✅ Mark as Resolved (Enter Resolution Summary)'}
                            {activeActionForm.type === 'need_info' && '❓ Ask Resident for Additional Information'}
                            {activeActionForm.type === 'rejected' && '❌ Reject / Flag as Duplicate (Enter Reason)'}
                            {activeActionForm.type === 'custom_reply' && '✉️ Send Custom Reply to Resident'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveActionForm(null)}
                            className="text-gray-500 hover:text-gray-800 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Team Sent Inputs */}
                        {activeActionForm.type === 'team_sent' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-[#3E6B75] dark:text-[#E3B0C4] mb-1">
                                Choose Team:
                              </label>
                              <select
                                value={formTeam}
                                onChange={(e) => setFormTeam(e.target.value)}
                                className="w-full rounded-lg border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-2.5 py-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC]"
                              >
                                {RESPONSE_TEAMS.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {language === 'hi' ? t.nameHi : t.nameEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#3E6B75] dark:text-[#E3B0C4] mb-1">
                                Expected Time:
                              </label>
                              <select
                                value={formExpectedTime}
                                onChange={(e) => setFormExpectedTime(e.target.value)}
                                className="w-full rounded-lg border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-2.5 py-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC]"
                              >
                                {EXPECTED_TIMES.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {language === 'hi' ? t.labelHi : t.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Text note inputs for Resolved / Need Info / Rejected / Custom Reply */}
                        {activeActionForm.type !== 'team_sent' && (
                          <div className="space-y-2">
                            {/* Quick template chips for Custom Reply */}
                            {activeActionForm.type === 'custom_reply' && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-[#3E6B75] dark:text-[#E3B0C4] font-bold">
                                  Quick Templates:
                                </span>
                                {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setFormText(language === 'hi' ? tmpl.hi : tmpl.en)}
                                    className="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-[#0F3E48] dark:text-[#FFD1DC] hover:border-[#0891B2] truncate max-w-[200px] cursor-pointer"
                                  >
                                    {language === 'hi' ? tmpl.hi : tmpl.en}
                                  </button>
                                ))}
                              </div>
                            )}

                            <input
                              type="text"
                              value={formText}
                              onChange={(e) => setFormText(e.target.value)}
                              placeholder={
                                activeActionForm.type === 'resolved'
                                  ? 'e.g. Pumped water & catchpit cleared at crossroads by JMC team'
                                  : activeActionForm.type === 'need_info'
                                  ? 'e.g. Please clarify exact street number or nearest pole identifier'
                                  : activeActionForm.type === 'rejected'
                                  ? 'e.g. Duplicate report already assigned under JPR-2026-00089'
                                  : 'Type message to resident...'
                              }
                              className="w-full rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-3 py-2 text-xs text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2]"
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveActionForm(null)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-black/5 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitActionForm(report.id)}
                            className="px-4 py-1.5 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:bg-[#0e7490] shadow-xs cursor-pointer"
                          >
                            Send & Update
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Timeline Collapsible View */}
                    {report.timeline && report.timeline.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTimelines((prev) => ({
                              ...prev,
                              [report.id]: !prev[report.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0891B2] hover:underline cursor-pointer"
                        >
                          <span>
                            {language === 'hi' ? 'निगम टाइमलाइन व संदेश' : 'Timeline & Replies'} ({report.timeline.length})
                          </span>
                          {isTimelineExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {isTimelineExpanded && (
                          <div className="mt-2 rounded-xl bg-[#F0FCFD]/60 dark:bg-[#1C0916]/60 border border-[#CCF1F4] dark:border-[#521E3B] p-3 space-y-2 animate-in fade-in duration-100">
                            <div className="space-y-2 border-l-2 border-[#0891B2]/40 ml-1 pl-3">
                              {report.timeline.map((entry) => (
                                <div key={entry.id} className="text-xs space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2] border border-[#0891B2]/20">
                                      {entry.staffName || 'STARKTECH'}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#0F3E48] dark:text-[#FFD1DC] capitalize">
                                      {entry.status.replace('_', ' ')}
                                    </span>
                                    {entry.team && (
                                      <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                                        • Team: {entry.team}
                                      </span>
                                    )}
                                    {entry.expectedTime && (
                                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                                        • ETA: {entry.expectedTime}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-[#3E6B75] dark:text-[#E3B0C4] font-mono ml-auto">
                                      {formatDateTimeIST(entry.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#1F4E5A] dark:text-[#E3B0C4] leading-relaxed">
                                    {language === 'hi' ? entry.messageHi || entry.messageEn : entry.messageEn}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: NABZ AUTONOMOUS AGENT PANEL */}
      {activeConsoleTab === 'agent' && (
        <div className="space-y-4">
          <AgentActivityPanel mode="full" />
        </div>
      )}

      {/* 5. TAB 3: TELEMETRY FEEDS & SIMULATE FAILURE */}
      {activeConsoleTab === 'feeds' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] flex items-start gap-3 shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none">
            <Radio className="h-5 w-5 text-[#0891B2] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                Autonomous Telemetry Resilience Testing
              </span>
              <p className="text-[#3E6B75] dark:text-[#E3B0C4] leading-relaxed">
                Toggle "Simulate Outage" to inject real-time API or sensor disconnection. The engine automatically switches to statistical fallback, marks data as partial, and includes the degradation in AI summaries and Nabz agent reasoning.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedStatuses.map((feed) => {
              const isSimulatedOff = disabledFeedIds.includes(feed.feedId);
              const isOffline = feed.status === 'offline' || isSimulatedOff;

              return (
                <div
                  key={feed.feedId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isOffline
                      ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/15'
                      : 'border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isOffline
                              ? 'bg-rose-500 animate-ping'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <h4 className="font-display text-sm font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                          {feed.nameEn}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-[#3E6B75] dark:text-[#E3B0C4] block mt-0.5">
                        ID: {feed.feedId}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isOffline
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {isOffline ? 'OFFLINE' : feed.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Metadata info */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono text-[#3E6B75] dark:text-[#E3B0C4]">
                    <div className="p-2 rounded-xl bg-[#F0FCFD] dark:bg-[#1C0916] border border-[#CCF1F4] dark:border-[#521E3B]">
                      <span className="text-[10px] text-[#3E6B75] dark:text-[#E3B0C4] block">LAST UPDATE</span>
                      <span>{new Date(feed.lastHeartbeat).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F0FCFD] dark:bg-[#1C0916] border border-[#CCF1F4] dark:border-[#521E3B]">
                      <span className="text-[10px] text-[#3E6B75] dark:text-[#E3B0C4] block">RATE (EVENTS/MIN)</span>
                      <span>{isOffline ? 0 : feed.eventsPerMin.toFixed(1)} / min</span>
                    </div>
                  </div>

                  {feed.sourceEndpoint && (
                    <div className="mt-2 text-[10px] font-mono text-[#3E6B75] dark:text-[#E3B0C4] truncate">
                      URI: {feed.sourceEndpoint}
                    </div>
                  )}

                  {/* Outage Toggle Button */}
                  <div className="mt-4 pt-3 border-t border-[#CCF1F4] dark:border-[#521E3B] flex items-center justify-between">
                    <span className="text-xs text-[#3E6B75] dark:text-[#E3B0C4] font-medium">
                      Simulate Feed Failure:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleFeedDisabled(feed.feedId);
                        addToast({
                          title: isSimulatedOff ? 'Feed Restored' : 'Feed Simulation Outage',
                          message: isSimulatedOff
                            ? `${feed.nameEn} re-enabled in telemetry pipeline.`
                            : `${feed.nameEn} disconnected. Partial data active.`,
                          type: isSimulatedOff ? 'success' : 'warning',
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSimulatedOff
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isSimulatedOff ? 'Restore Feed' : 'Simulate Outage'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 4: THRESHOLDS & ALERTS */}
      {activeConsoleTab === 'thresholds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Sliders */}
          <JharokhaCard
            title="Operational Threshold Settings"
            subtitle="Configures citywide alerts when zone baselines breach"
            variant="elevated"
          >
            <div className="space-y-5 text-xs">
              {/* Pulse Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[var(--jaipur-text)]">
                    Minimum Pulse Score Alert
                  </span>
                  <span className="font-mono text-sm font-bold text-[#0891B2]">
                    &lt; {minPulseScore}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  value={minPulseScore}
                  onChange={(e) => setMinPulseScore(Number(e.target.value))}
                  className="w-full accent-[#0891B2] cursor-pointer"
                />
                <p className="text-[11px] text-[var(--jaipur-text-muted)] mt-1">
                  Zones dropping below this value immediately trigger staff escalation and visual red alert.
                </p>
              </div>

              {/* AQI Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[var(--jaipur-text)]">
                    Severe AQI Threshold
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-600">
                    &gt; {maxAqiThreshold} AQI
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="400"
                  step="10"
                  value={maxAqiThreshold}
                  onChange={(e) => setMaxAqiThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[11px] text-[var(--jaipur-text-muted)] mt-1">
                  Triggers environmental advisory and health mitigation protocol when CPCB sensors spike.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--jaipur-border)] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStaffThresholds({
                      pulseAlertThreshold: minPulseScore,
                      aqiAlertThreshold: maxAqiThreshold,
                    });
                    addToast({
                      title: 'Thresholds Updated',
                      message: `Alert baselines saved (Pulse: <${minPulseScore}, AQI: >${maxAqiThreshold}).`,
                      type: 'success',
                    });
                  }}
                  className="px-5 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:bg-[#0e7490] shadow-xs cursor-pointer"
                >
                  Save Alert Thresholds
                </button>
              </div>
            </div>
          </JharokhaCard>

          {/* Browser Notification Controls */}
          <JharokhaCard
            title="Municipal Push Dispatch"
            subtitle="Browser-level system toasts for urgent events"
            variant="default"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--jaipur-text)]">
                    Browser Push Permission:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      browserNotificationsEnabled
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {browserNotificationsEnabled ? 'GRANTED' : 'NOT CONFIGURED'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--jaipur-text-secondary)] leading-relaxed">
                  Allows urgent alerts (e.g. waterlogging blockades or pulse collapse) to notify staff even when tab is backgrounded.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold shadow-xs hover:bg-[#0e7490] cursor-pointer"
                >
                  <BellRing className="h-3.5 w-3.5 inline mr-1.5" />
                  Request Push Permission
                </button>

                <button
                  type="button"
                  onClick={() => {
                    addToast({
                      title: 'Test Operational Toast',
                      message: 'Alert pipeline active: MI Road & Ajmeri Gate monitored.',
                      type: 'info',
                    });
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-xs font-semibold text-[#0F3E48] dark:text-[#FFD1DC] hover:border-[#0891B2] cursor-pointer"
                >
                  Trigger Test Toast
                </button>
              </div>
            </div>
          </JharokhaCard>
        </div>
      )}
    </div>
  );
};
