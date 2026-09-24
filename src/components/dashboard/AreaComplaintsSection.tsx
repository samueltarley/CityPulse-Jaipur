import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES } from '../../config/city';
import { ResidentReport, ResidentReportStatus, CivicEvent } from '../../types';
import { formatDateTimeIST } from '../../utils/dateFormat';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Send,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  MessageSquare,
  User,
  ShieldCheck,
  Tag,
} from 'lucide-react';

interface CategoryConfig {
  id: string;
  nameEn: string;
  nameHi: string;
  icon: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'waterlogging', nameEn: 'Waterlogging', nameHi: 'जलभराव', icon: '💧' },
  { id: 'garbage', nameEn: 'Garbage Dump', nameHi: 'कचरा ढेर', icon: '🗑️' },
  { id: 'pothole', nameEn: 'Pothole / Road Damage', nameHi: 'सड़क गड्ढा', icon: '🕳️' },
  { id: 'streetlight', nameEn: 'Streetlight Out', nameHi: 'स्ट्रीट लाइट बंद', icon: '💡' },
  { id: 'stray_cattle', nameEn: 'Stray Cattle', nameHi: 'आवारा पशु', icon: '🐂' },
  { id: 'noise', nameEn: 'Noise Pollution', nameHi: 'ध्वनि प्रदूषण', icon: '📢' },
  { id: 'water_supply', nameEn: 'Water Supply Disruption', nameHi: 'पेयजल संकट', icon: '🚰' },
  { id: 'sewage', nameEn: 'Sewage Overflow', nameHi: 'सीवेज रिसाव', icon: '🚽' },
  { id: 'traffic', nameEn: 'Traffic Jam', nameHi: 'यातायात जाम', icon: '🚗' },
  { id: 'power', nameEn: 'Power Cut / Outage', nameHi: 'बिजली संकट', icon: '⚡' },
];

export interface OneWordReplyDef {
  key: string;
  status: ResidentReportStatus;
  labelEn: string;
  labelHi: string;
  badgeEn: string;
  badgeHi: string;
  buttonClass: string;
  activeClass: string;
}

export const ONE_WORD_REPLIES: OneWordReplyDef[] = [
  {
    key: 'received',
    status: 'submitted',
    labelEn: 'Received',
    labelHi: 'प्राप्त हुआ',
    badgeEn: 'Received',
    badgeHi: 'प्राप्त हुआ',
    buttonClass: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700',
    activeClass: 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 border-gray-900 font-extrabold ring-2 ring-gray-400 shadow-md',
  },
  {
    key: 'considered',
    status: 'considered',
    labelEn: 'Considered',
    labelHi: 'समीक्षाधीन',
    badgeEn: 'Considered',
    badgeHi: 'समीक्षाधीन',
    buttonClass: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60',
    activeClass: 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white border-blue-700 font-extrabold ring-2 ring-blue-400 shadow-md',
  },
  {
    key: 'dispatched',
    status: 'team_sent',
    labelEn: 'Dispatched',
    labelHi: 'टीम भेजी गई',
    badgeEn: 'Dispatched',
    badgeHi: 'टीम भेजी गई',
    buttonClass: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/60',
    activeClass: 'bg-purple-600 text-white dark:bg-purple-500 dark:text-white border-purple-700 font-extrabold ring-2 ring-purple-400 shadow-md',
  },
  {
    key: 'working',
    status: 'in_progress',
    labelEn: 'Working',
    labelHi: 'कार्य जारी',
    badgeEn: 'Working',
    badgeHi: 'कार्य जारी',
    buttonClass: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/60',
    activeClass: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white border-amber-700 font-extrabold ring-2 ring-amber-400 shadow-md',
  },
  {
    key: 'resolved',
    status: 'resolved',
    labelEn: 'Resolved',
    labelHi: 'समाधान हो गया',
    badgeEn: 'Resolved',
    badgeHi: 'समाधान हो गया',
    buttonClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/60',
    activeClass: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white border-emerald-700 font-extrabold ring-2 ring-emerald-400 shadow-md',
  },
  {
    key: 'duplicate',
    status: 'rejected',
    labelEn: 'Duplicate',
    labelHi: 'डुप्लिकेट',
    badgeEn: 'Duplicate',
    badgeHi: 'डुप्लिकेट',
    buttonClass: 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
    activeClass: 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 border-slate-800 font-extrabold ring-2 ring-slate-500 shadow-md',
  },
  {
    key: 'rejected',
    status: 'rejected',
    labelEn: 'Rejected',
    labelHi: 'अस्वीकृत',
    badgeEn: 'Rejected',
    badgeHi: 'अस्वीकृत',
    buttonClass: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/60',
    activeClass: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white border-rose-700 font-extrabold ring-2 ring-rose-400 shadow-md',
  },
];

export function getAnonymousResidentId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 8999) + 1000;
  return `Resident R-${num}`;
}

export function getCategoryInfo(rawCat?: string, cat?: string, title?: string): CategoryConfig {
  const normRaw = (rawCat || '').toLowerCase();
  const normCat = (cat || '').toLowerCase();
  const normTitle = (title || '').toLowerCase();

  for (const c of CATEGORY_CONFIGS) {
    if (
      normRaw.includes(c.id) ||
      normCat.includes(c.id) ||
      normTitle.includes(c.id) ||
      normTitle.includes(c.nameEn.toLowerCase())
    ) {
      return c;
    }
  }
  return CATEGORY_CONFIGS[0];
}

export function getActiveReplyKey(report: ResidentReport): string {
  if (report.status === 'submitted' || report.status === 'acknowledged' || report.status === 'triaged') return 'received';
  if (report.status === 'considered') return 'considered';
  if (report.status === 'team_sent') return 'dispatched';
  if (report.status === 'in_progress') return 'working';
  if (report.status === 'resolved') return 'resolved';
  if (report.status === 'rejected') {
    if (report.resolutionNote?.toLowerCase().includes('duplicate')) return 'duplicate';
    const lastTl = report.timeline?.[report.timeline.length - 1];
    if (lastTl?.messageEn?.toLowerCase().includes('duplicate') || lastTl?.messageHi?.includes('डुप्लिकेट')) return 'duplicate';
    return 'rejected';
  }
  return 'received';
}

function formatShortTime(timestamp: number, lang: 'en' | 'hi'): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const QUICK_CHIPS = [
  { en: 'Field team dispatched for inspection.', hi: 'निरीक्षण हेतु फील्ड टीम रवाना कर दी गई है।' },
  { en: 'Cleanliness container emptied.', hi: 'कचरा पात्र पूरी तरह खाली करा दिया गया है।' },
  { en: 'Water supply tanker assigned.', hi: 'पेयजल टैंकर सेवा आवंटित कर दी गई है।' },
  { en: 'Repair crew on location.', hi: 'मरम्मत दल मौके पर पहुंच चुका है।' },
];

export const AreaComplaintsSection: React.FC = () => {
  const { language } = useLanguage();
  const {
    residentReports,
    events,
    updateReportStatus,
    addReportReply,
    bulkUpdateReports,
    addToast,
  } = useAppStore();

  // Filters State
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Accordion Expand/Collapse State for 9 zones
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});

  // Single card custom text box state
  const [customReplyTexts, setCustomReplyTexts] = useState<Record<string, string>>({});
  const [showCustomBox, setShowCustomBox] = useState<Record<string, boolean>>({});

  // Build Unified Complaints List (residentReports + simulated citizen complaints from events)
  const unifiedComplaints = useMemo(() => {
    const list: Array<ResidentReport & { isSimulatedComplaint?: boolean }> = [...residentReports];

    // Merge simulated citizen complaint events if not represented
    const existingTicketIds = new Set(residentReports.map((r) => r.id));

    events.forEach((evt) => {
      const isComplaintSource =
        evt.source === 'resident_report' ||
        evt.source === 'smart_city_ai' ||
        evt.category === 'sanitation' ||
        evt.category === 'water' ||
        evt.category === 'power' ||
        evt.category === 'traffic';

      const simulatedTicketId = evt.metadata?.ticketId
        ? (evt.metadata.ticketId as string)
        : `JPR-2026-S${evt.id.replace(/[^0-9]/g, '').slice(-4) || '1024'}`;

      if (isComplaintSource && !existingTicketIds.has(simulatedTicketId)) {
        existingTicketIds.add(simulatedTicketId);
        const mappedCategory = evt.category === 'water' ? 'waterlogging' : evt.category;
        list.push({
          id: simulatedTicketId,
          timestamp: evt.timestamp,
          zoneId: evt.zoneId,
          category: evt.category,
          rawCategory: mappedCategory,
          title: evt.titleEn.replace(/^Citizen Report \([^)]+\):\s*/, ''),
          description: evt.descriptionEn,
          landmark: evt.locationName || 'Jaipur Central',
          upvotes: 1,
          status: evt.status === 'resolved' ? 'resolved' : 'submitted',
          isAnonymous: true,
          assignedDepartment: 'Jaipur Municipal Corporation',
          reportedByMe: false,
          isSimulatedComplaint: true,
        });
      }
    });

    return list;
  }, [residentReports, events]);

  // Filter complaints based on top controls
  const filteredComplaints = useMemo(() => {
    return unifiedComplaints.filter((c) => {
      // Zone Filter
      if (selectedZoneFilter !== 'all' && c.zoneId !== selectedZoneFilter) return false;

      // Category Filter
      if (selectedCategoryFilter !== 'all') {
        const catInfo = getCategoryInfo(c.rawCategory, c.category, c.title);
        if (catInfo.id !== selectedCategoryFilter) return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'pending') {
          if (c.status === 'resolved' || c.status === 'rejected') return false;
        } else if (selectedStatusFilter === 'duplicate') {
          if (c.status !== 'rejected') return false;
          if (!c.resolutionNote?.toLowerCase().includes('duplicate')) return false;
        } else if (selectedStatusFilter === 'received') {
          if (c.status !== 'submitted' && c.status !== 'acknowledged') return false;
        } else if (c.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const residentId = getAnonymousResidentId(c.id).toLowerCase();
        const matchId = c.id.toLowerCase().includes(q);
        const matchResident = residentId.includes(q);
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        const matchLandmark = c.landmark.toLowerCase().includes(q);
        const zoneObj = JAIPUR_ZONES.find((z) => z.id === c.zoneId);
        const matchZone = zoneObj
          ? zoneObj.nameEn.toLowerCase().includes(q) || zoneObj.nameHi.includes(q)
          : false;

        if (!matchId && !matchResident && !matchTitle && !matchDesc && !matchLandmark && !matchZone) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedComplaints, selectedZoneFilter, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Group Complaints by Zone for Accordion
  const zoneGroups = useMemo(() => {
    const groups = JAIPUR_ZONES.map((zone) => {
      const zoneComplaints = filteredComplaints.filter((c) => c.zoneId === zone.id);
      const total = zoneComplaints.length;
      const pending = zoneComplaints.filter((c) => c.status !== 'resolved' && c.status !== 'rejected').length;
      return {
        zone,
        complaints: zoneComplaints,
        total,
        pending,
      };
    });

    // Sort Areas with most pending complaints FIRST
    groups.sort((a, b) => {
      if (b.pending !== a.pending) return b.pending - a.pending;
      return b.total - a.total;
    });

    return groups;
  }, [filteredComplaints]);

  // Auto-expand top zone with most pending complaints initially
  React.useEffect(() => {
    if (zoneGroups.length > 0 && Object.keys(expandedZones).length === 0) {
      setExpandedZones({ [zoneGroups[0].zone.id]: true });
    }
  }, [zoneGroups]);

  const toggleZoneAccordion = (zoneId: string) => {
    setExpandedZones((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  // One-Word Reply Click Handler
  const handleOneWordReplyClick = (report: ResidentReport, replyDef: OneWordReplyDef) => {
    const isDup = replyDef.key === 'duplicate';
    const note = isDup ? 'Duplicate grievance entry' : undefined;

    updateReportStatus(report.id, replyDef.status, {
      messageEn: replyDef.labelEn,
      messageHi: replyDef.labelHi,
      staffName: 'STARKTECH',
      note,
    });

    addToast({
      title: language === 'hi' ? 'उत्तर प्रेषित' : 'Reply Sent',
      message:
        language === 'hi'
          ? `उत्तर भेजा गया: ${replyDef.labelHi}`
          : `Reply sent: ${replyDef.labelEn}`,
      type: 'success',
    });
  };

  // Custom Reply Handler
  const handleSendCustomReply = (reportId: string) => {
    const text = (customReplyTexts[reportId] || '').trim();
    if (!text) return;

    addReportReply(reportId, {
      messageEn: text,
      messageHi: text,
      staffName: 'STARKTECH',
    });

    setCustomReplyTexts((prev) => ({ ...prev, [reportId]: '' }));
    setShowCustomBox((prev) => ({ ...prev, [reportId]: false }));

    addToast({
      title: language === 'hi' ? 'उत्तर प्रेषित' : 'Reply Sent',
      message:
        language === 'hi'
          ? `उत्तर भेजा गया: ${text.slice(0, 30)}`
          : `Reply sent: ${text.slice(0, 30)}`,
      type: 'success',
    });
  };

  // Bulk Selection Helpers
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkAction = (replyDef: OneWordReplyDef) => {
    if (selectedIds.length === 0) return;

    bulkUpdateReports(selectedIds, replyDef.status, {
      messageEn: replyDef.labelEn,
      messageHi: replyDef.labelHi,
      staffName: 'STARKTECH',
      note: replyDef.key === 'duplicate' ? 'Bulk Duplicate Flag' : undefined,
    });

    addToast({
      title: language === 'hi' ? 'बल्क कार्रवाई पूर्ण' : 'Bulk Action Executed',
      message:
        language === 'hi'
          ? `${selectedIds.length} शिकायतों हेतु उत्तर भेजा गया: ${replyDef.labelHi}`
          : `Reply sent: ${replyDef.labelEn} (${selectedIds.length} reports)`,
      type: 'success',
    });

    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP FILTERS BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#3E6B75] dark:text-[#E3B0C4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'टिकट आईडी (JPR-2026), लैंडमार्क, विवरण या नागरिक आईडी खोजें...'
                  : 'Search ticket ID (JPR-2026), landmark, description, resident ID...'
              }
              className="w-full rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-[#F0FCFD]/50 dark:bg-[#1C0916]/50 pl-9 pr-3 py-2 text-xs text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2] shadow-xs"
            />
          </div>

          {/* Filter Dropdowns Group */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Area Filter */}
            <select
              value={selectedZoneFilter}
              onChange={(e) => setSelectedZoneFilter(e.target.value)}
              className="rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-3 py-2 font-bold text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2] cursor-pointer shadow-xs"
            >
              <option value="all">{language === 'hi' ? 'सभी 9 क्षेत्र (All Areas)' : 'All 9 Jaipur Areas'}</option>
              {JAIPUR_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {language === 'hi' ? z.nameHi : z.nameEn} ({z.code})
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-3 py-2 font-bold text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2] cursor-pointer shadow-xs"
            >
              <option value="all">{language === 'hi' ? 'सभी श्रेणियां (All Categories)' : 'All Categories'}</option>
              {CATEGORY_CONFIGS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {language === 'hi' ? c.nameHi : c.nameEn}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-3 py-2 font-bold text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2] cursor-pointer shadow-xs"
            >
              <option value="all">{language === 'hi' ? 'सभी स्थितियां (All Statuses)' : 'All Statuses'}</option>
              <option value="pending">{language === 'hi' ? 'केवल लंबित (Pending Only)' : 'Pending Action Only'}</option>
              <option value="received">{language === 'hi' ? 'प्राप्त हुआ (Received)' : 'Received'}</option>
              <option value="considered">{language === 'hi' ? 'समीक्षाधीन (Considered)' : 'Considered'}</option>
              <option value="team_sent">{language === 'hi' ? 'टीम भेजी गई (Dispatched)' : 'Dispatched'}</option>
              <option value="in_progress">{language === 'hi' ? 'कार्य जारी (Working)' : 'Working'}</option>
              <option value="resolved">{language === 'hi' ? 'समाधान हो गया (Resolved)' : 'Resolved'}</option>
              <option value="duplicate">{language === 'hi' ? 'डुप्लिकेट (Duplicate)' : 'Duplicate'}</option>
              <option value="rejected">{language === 'hi' ? 'अस्वीकृत (Rejected)' : 'Rejected'}</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Banner when items checked */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#0891B2]/10 border border-[#0891B2]/30 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-[#0891B2]" />
              <span className="font-bold text-xs text-[#0891B2]">
                {selectedIds.length} {language === 'hi' ? 'शिकायतें चयनित' : 'complaints selected'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[11px] text-[#3E6B75] dark:text-[#E3B0C4] hover:underline cursor-pointer"
              >
                ({language === 'hi' ? 'चयन हटाएं' : 'Clear selection'})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#0F3E48] dark:text-[#FFD1DC] mr-1">
                {language === 'hi' ? 'बल्क उत्तर चुनें:' : 'Apply Bulk Reply:'}
              </span>
              {ONE_WORD_REPLIES.map((replyDef) => (
                <button
                  key={replyDef.key}
                  type="button"
                  onClick={() => handleBulkAction(replyDef)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${replyDef.buttonClass}`}
                >
                  {language === 'hi' ? replyDef.labelHi : replyDef.labelEn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. AREA-WISE ACCORDION LIST */}
      <div className="space-y-4">
        {zoneGroups.map(({ zone, complaints, total, pending }) => {
          const isExpanded = !!expandedZones[zone.id];

          return (
            <div
              key={zone.id}
              className="rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] shadow-[0_2px_8px_rgba(15,62,72,0.04)] dark:shadow-none overflow-hidden transition-all"
            >
              {/* ACCORDION HEADER */}
              <button
                type="button"
                onClick={() => toggleZoneAccordion(zone.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-[#F0FCFD] dark:hover:bg-[#36142B]/50 transition-colors cursor-pointer text-left select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#CCF1F4] dark:bg-[#521E3B] text-[#0891B2] dark:text-[#FFD1DC] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    {zone.code}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#0F3E48] dark:text-[#FFD1DC] truncate flex items-center gap-2">
                      <span>{language === 'hi' ? zone.nameHi : zone.nameEn}</span>
                      <span className="text-xs font-semibold text-[#3E6B75] dark:text-[#E3B0C4] font-mono">
                        — {total} {language === 'hi' ? 'शिकायतें' : total === 1 ? 'complaint' : 'complaints'}{' '}
                        (<span className={pending > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                          {pending} {language === 'hi' ? 'लंबित' : 'pending'}
                        </span>)
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#3E6B75] dark:text-[#E3B0C4] truncate mt-0.5">
                      {zone.keyLandmarks.slice(0, 3).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {pending > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      {pending} {language === 'hi' ? 'लंबित' : 'Pending'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      ✓ {language === 'hi' ? 'सभी निस्तारित' : 'All Clear'}
                    </span>
                  )}

                  <div className="p-1 rounded-lg bg-[#E0F2F5] dark:bg-[#36142B] text-[#0F3E48] dark:text-[#FFD1DC]">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              {/* ACCORDION CONTENT: COMPLAINTS LIST */}
              {isExpanded && (
                <div className="p-4 sm:p-5 pt-0 border-t border-[#E0F2F5] dark:border-[#521E3B] space-y-4 bg-[#FAFDFD] dark:bg-[#200A1A]/40">
                  {complaints.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#3E6B75] dark:text-[#E3B0C4] space-y-1">
                      <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-sm">
                        {language === 'hi' ? 'इस क्षेत्र में कोई शिकायत नहीं मिली' : 'No matching complaints in this area'}
                      </p>
                      <p className="text-[11px]">
                        {language === 'hi'
                          ? 'वर्तमान फ़िल्टर या खोज मानदंड के अनुसार इस वार्ड में शून्य शिकायतें हैं।'
                          : 'Zero active complaints matching your filter criteria in this ward.'}
                      </p>
                    </div>
                  ) : (
                    complaints.map((report) => {
                      const activeKey = getActiveReplyKey(report);
                      const catInfo = getCategoryInfo(report.rawCategory, report.category, report.title);
                      const anonymousResidentId = getAnonymousResidentId(report.id);
                      const isSelected = selectedIds.includes(report.id);

                      // Latest timeline reply entry if any
                      const latestTimeline = report.timeline && report.timeline.length > 0
                        ? report.timeline[report.timeline.length - 1]
                        : null;

                      return (
                        <div
                          key={report.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                            isSelected
                              ? 'border-[#0891B2] bg-[#F0FCFD] dark:bg-[#321327] shadow-sm'
                              : 'border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] hover:border-[#0891B2]/50'
                          }`}
                        >
                          {/* TOP CARD ROW: Ticket ID, Anonymous Resident ID, Source, Status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E0F2F5] dark:border-[#521E3B]">
                            <div className="flex items-center gap-2">
                              {/* Checkbox for bulk */}
                              <button
                                type="button"
                                onClick={() => toggleSelectOne(report.id)}
                                className="text-[#0891B2] hover:scale-110 transition-transform cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4" />
                                ) : (
                                  <Square className="h-4 w-4 text-[#3E6B75]" />
                                )}
                              </button>

                              {/* Ticket ID */}
                              <span className="font-mono text-xs font-bold text-[#0891B2] bg-[#CCF1F4]/60 dark:bg-[#521E3B] px-2.5 py-0.5 rounded-lg border border-[#CCF1F4] dark:border-[#521E3B]">
                                {report.id}
                              </span>

                              {/* Filed by: Anonymous Resident ID */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F4E5A] dark:text-[#E3B0C4] bg-[#F0FCFD] dark:bg-[#36142B] px-2.5 py-0.5 rounded-lg border border-[#CCF1F4] dark:border-[#521E3B]">
                                <User className="h-3 w-3 text-[#0891B2]" />
                                <span>{language === 'hi' ? 'दर्जकर्ता: ' : 'Filed by: '}{anonymousResidentId}</span>
                              </span>

                              {/* Source Badge */}
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {report.isSimulatedComplaint ? (language === 'hi' ? 'नागरिक शिकायत' : 'Citizen Complaint') : (language === 'hi' ? 'ऐप रिपोर्ट' : 'App Report')}
                              </span>
                            </div>

                            {/* Current Status Badge */}
                            <div className="flex items-center gap-2">
                              {ONE_WORD_REPLIES.map((r) => {
                                if (r.key !== activeKey) return null;
                                return (
                                  <span
                                    key={r.key}
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${r.buttonClass}`}
                                  >
                                    <span>{language === 'hi' ? r.badgeHi : r.badgeEn}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* BODY ROW: Category, Landmark, Description & Timestamp */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{catInfo.icon}</span>
                                <span className="font-bold text-xs sm:text-sm text-[#0F3E48] dark:text-[#FFD1DC]">
                                  {language === 'hi' ? catInfo.nameHi : catInfo.nameEn}
                                </span>
                              </div>

                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3E6B75] dark:text-[#E3B0C4]">
                                <Clock className="h-3 w-3" />
                                <span>{formatDateTimeIST(report.timestamp)}</span>
                              </span>
                            </div>

                            {/* Location / Landmark */}
                            <div className="flex items-center gap-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC] font-semibold">
                              <MapPin className="h-3.5 w-3.5 text-[#0891B2] shrink-0" />
                              <span>{report.landmark}</span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-[#1F4E5A] dark:text-[#E3B0C4] leading-relaxed bg-[#F0FCFD]/40 dark:bg-[#1C0916]/40 p-3 rounded-xl border border-[#CCF1F4]/70 dark:border-[#521E3B]/70">
                              {report.description}
                            </p>
                          </div>

                          {/* ONE-WORD REPLY ACTION BUTTONS (7 Colored Buttons) */}
                          <div className="pt-2 border-t border-[#E0F2F5] dark:border-[#521E3B] space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3E6B75] dark:text-[#E3B0C4] block">
                              {language === 'hi' ? 'त्वरित एक-शब्द प्रतिक्रिया (One-Word Response):' : 'Quick One-Word Staff Response:'}
                            </span>

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              {ONE_WORD_REPLIES.map((replyDef) => {
                                const isActive = activeKey === replyDef.key;
                                return (
                                  <button
                                    key={replyDef.key}
                                    type="button"
                                    onClick={() => handleOneWordReplyClick(report, replyDef)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      isActive ? replyDef.activeClass : replyDef.buttonClass
                                    }`}
                                  >
                                    <span>{language === 'hi' ? replyDef.labelHi : replyDef.labelEn}</span>
                                  </button>
                                );
                              })}

                              {/* Toggle Custom Note Textbox */}
                              <button
                                type="button"
                                onClick={() =>
                                  setShowCustomBox((prev) => ({ ...prev, [report.id]: !prev[report.id] }))
                                }
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[#CCF1F4] dark:border-[#521E3B] bg-[#F0FCFD] dark:bg-[#36142B] text-[#0F3E48] dark:text-[#FFD1DC] hover:border-[#0891B2] cursor-pointer ml-auto"
                              >
                                💬 {language === 'hi' ? 'कस्टम संदेश' : 'Custom Reply'}
                              </button>
                            </div>
                          </div>

                          {/* CUSTOM REPLY TEXTBOX (Collapsible) */}
                          {showCustomBox[report.id] && (
                            <div className="p-3 rounded-xl bg-[#F0FCFD] dark:bg-[#1C0916] border border-[#CCF1F4] dark:border-[#521E3B] space-y-2 animate-in fade-in duration-150">
                              {/* Quick Template Chips */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#3E6B75] dark:text-[#E3B0C4]">
                                  {language === 'hi' ? 'त्वरित खाका (Templates):' : 'Quick Templates:'}
                                </span>
                                {QUICK_CHIPS.map((chip, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      setCustomReplyTexts((prev) => ({
                                        ...prev,
                                        [report.id]: language === 'hi' ? chip.hi : chip.en,
                                      }))
                                    }
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-[10px] font-medium text-[#0F3E48] dark:text-[#FFD1DC] hover:border-[#0891B2] cursor-pointer"
                                  >
                                    {language === 'hi' ? chip.hi : chip.en}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={customReplyTexts[report.id] || ''}
                                  onChange={(e) =>
                                    setCustomReplyTexts((prev) => ({
                                      ...prev,
                                      [report.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={
                                    language === 'hi'
                                      ? 'नागरिक को विस्तृत कस्टम संदेश लिखें...'
                                      : 'Type custom response message to resident...'
                                  }
                                  className="flex-1 rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] px-3 py-1.5 text-xs text-[#0F3E48] dark:text-[#FFD1DC] focus:outline-none focus:border-[#0891B2]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendCustomReply(report.id)}
                                  className="px-3 py-1.5 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:bg-[#0891B2]/90 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>{language === 'hi' ? 'भेजें' : 'Send'}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* RECENT REPLY HISTORY TIMELINE LINE */}
                          {latestTimeline ? (
                            <div className="p-2.5 rounded-xl bg-[#F0FCFD]/80 dark:bg-[#1C0916]/80 border border-[#CCF1F4]/80 dark:border-[#521E3B]/80 text-xs flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0891B2]/15 text-[#0891B2]">
                                  {latestTimeline.staffName || 'STARKTECH'}
                                </span>
                                <span className="font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
                                  {language === 'hi'
                                    ? latestTimeline.messageHi || latestTimeline.messageEn
                                    : latestTimeline.messageEn}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[#3E6B75] dark:text-[#E3B0C4] ml-auto">
                                • {formatShortTime(latestTimeline.timestamp, language)}
                              </span>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 italic">
                              {language === 'hi' ? 'अभी तक कोई उत्तर प्रेषित नहीं किया गया है।' : 'No responses sent yet.'}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
