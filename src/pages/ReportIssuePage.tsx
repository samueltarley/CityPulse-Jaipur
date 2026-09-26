import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { JharokhaCard } from '../components/theme/JharokhaCard';
import { JAIPUR_ZONES } from '../config/city';
import { ResidentReport, EventCategory, EventSeverity } from '../types';
import { formatDateTimeIST } from '../utils/dateFormat';
import {
  AlertCircle,
  MapPin,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Navigation,
  ThumbsUp,
  FileText,
  Building2,
  ChevronRight,
  PlusCircle,
  Layers,
  Search,
  Eye,
  Mic,
  MicOff,
  Share2,
  Lock,
} from 'lucide-react';
import { redactPII, fuzzLocationCoordinates } from '../utils/privacySanitizer';
import { checkReportRateLimit, recordReportSubmission } from '../utils/securityRateLimit';

interface CategoryOption {
  id: string;
  category: EventCategory;
  nameEn: string;
  nameHi: string;
  icon: string;
  defaultDepartment: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'waterlogging',
    category: 'water',
    nameEn: 'Waterlogging',
    nameHi: 'जलभराव',
    icon: '💧',
    defaultDepartment: 'JMC & Drainage Division',
  },
  {
    id: 'garbage',
    category: 'sanitation',
    nameEn: 'Garbage Dump',
    nameHi: 'कचरा ढेर',
    icon: '🗑️',
    defaultDepartment: 'Jaipur Municipal Corporation (Swachhata Wing)',
  },
  {
    id: 'pothole',
    category: 'traffic',
    nameEn: 'Pothole / Road Damage',
    nameHi: 'सड़क का गड्ढा',
    icon: '🕳️',
    defaultDepartment: 'Jaipur Development Authority (JDA)',
  },
  {
    id: 'streetlight',
    category: 'power',
    nameEn: 'Streetlight Out',
    nameHi: 'स्ट्रीट लाइट बंद',
    icon: '💡',
    defaultDepartment: 'JVVNL & JMC Street Lighting Cell',
  },
  {
    id: 'stray_cattle',
    category: 'sanitation',
    nameEn: 'Stray Cattle',
    nameHi: 'आवारा पशु',
    icon: '🐂',
    defaultDepartment: 'JMC Animal Management Wing',
  },
  {
    id: 'noise',
    category: 'crowd',
    nameEn: 'Noise Pollution',
    nameHi: 'ध्वनि प्रदूषण',
    icon: '📢',
    defaultDepartment: 'Jaipur City Police & RSPCB',
  },
  {
    id: 'water_supply',
    category: 'water',
    nameEn: 'Water Supply Disruption',
    nameHi: 'पेयजल संकट / पाइप रिसाव',
    icon: '🚰',
    defaultDepartment: 'Public Health Engineering Dept (PHED)',
  },
  {
    id: 'sewage',
    category: 'sanitation',
    nameEn: 'Sewage Overflow',
    nameHi: 'सीवेज रिसाव',
    icon: '🚽',
    defaultDepartment: 'JMC Sewerage & Drainage Wing',
  },
  {
    id: 'traffic',
    category: 'traffic',
    nameEn: 'Traffic Jam / Gridlock',
    nameHi: 'यातायात जाम / रुकावट',
    icon: '🚗',
    defaultDepartment: 'Jaipur City Police & Traffic Division',
  },
  {
    id: 'power',
    category: 'power',
    nameEn: 'Power Cut / Voltage',
    nameHi: 'बिजली संकट / वोल्टेज',
    icon: '⚡',
    defaultDepartment: 'JVVNL Power Grid Cell',
  },
];

const QUICK_REASONS = [
  { id: 'pothole', hi: 'सड़क पर खतरनाक गड्ढा', en: 'Severe Road Pothole', icon: '🕳️', cat: 'pothole' },
  { id: 'garbage', hi: 'कचरे का ढेर व बदबू', en: 'Garbage Dump Accumulation', icon: '🗑️', cat: 'garbage' },
  { id: 'sewage', hi: 'सीवर चोक / गंदा पानी', en: 'Sewage Overflow & Drain Block', icon: '🚯', cat: 'sewage' },
  { id: 'water_supply', hi: 'पीने के पानी की सप्लाई बंद', en: 'No Water Supply / Low Pressure', icon: '🚰', cat: 'water_supply' },
  { id: 'streetlight', hi: 'स्ट्रीट लाइट बंद व अंधेरा', en: 'Streetlight Off & Darkness', icon: '💡', cat: 'streetlight' },
  { id: 'waterlogging', hi: 'सड़क पर जलभराव', en: 'Street Waterlogging', icon: '🌊', cat: 'waterlogging' },
  { id: 'traffic', hi: 'भीषण ट्रैफिक जाम', en: 'Heavy Traffic Jam', icon: '🚦', cat: 'traffic' },
  { id: 'stray_cattle', hi: 'आवारा पशुओं का जमावड़ा', en: 'Stray Cattle Blocking Road', icon: '🐄', cat: 'stray_cattle' },
  { id: 'pipe_leak', hi: 'पाइपलाइन लीकेज व बर्बादी', en: 'Pipeline Burst & Leakage', icon: '💧', cat: 'water_supply' },
  { id: 'transformer', hi: 'ट्रांसफार्मर स्पार्किंग / खराबी', en: 'Transformer Sparking / Hazard', icon: '⚡', cat: 'power' },
  { id: 'encroachment', hi: 'अतिक्रमण व मार्ग अवरोध', en: 'Pathway Encroachment', icon: '🚧', cat: 'traffic' },
  { id: 'noise', hi: 'तेज लाउडस्पीकर शोर', en: 'Loudspeaker Noise Disturbance', icon: '📢', cat: 'noise' },
];

const SEVERITY_LEVELS: Array<{ id: EventSeverity; labelEn: string; labelHi: string; color: string }> = [
  { id: 'low', labelEn: 'Low', labelHi: 'सामान्य', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'medium', labelEn: 'Medium', labelHi: 'मध्यम', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  { id: 'high', labelEn: 'High', labelHi: 'गंभीर', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  { id: 'critical', labelEn: 'Critical', labelHi: 'आपातकालीन', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30' },
];

/**
 * Privacy strip helper: strips 10-digit phone numbers and email addresses
 */
function sanitizePrivacyText(input: string): string {
  if (!input) return '';
  // Strip 10-digit Indian phone numbers with optional +91 or leading 0
  let sanitized = input.replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]');
  // Also strip common formats like 98765-43210
  sanitized = sanitized.replace(/\b[6-9]\d{4}[-\s]?\d{5}\b/g, '[REDACTED_PHONE]');
  // Strip email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  return sanitized;
}

export const ReportIssuePage: React.FC = () => {
  const { language, t } = useLanguage();
  const { residentReports, addResidentReport, userMyAreaZoneId, addToast } = useAppStore();

  const [activeView, setActiveView] = useState<'form' | 'my_reports'>('form');

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<string>('waterlogging');
  const [reportReason, setReportReason] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(userMyAreaZoneId || 'walled-city');
  const [landmark, setLandmark] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<EventSeverity>('medium');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({ lat: 26.9239, lng: 75.8267 });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);

  // Google Places Autocomplete & Geocoding states
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePredictions, setAutocompletePredictions] = useState<Array<{
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
    coordinates?: { lat: number; lng: number };
    zoneId?: string;
  }>>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);

  // Submission result modal / banner
  const [submittedReport, setSubmittedReport] = useState<ResidentReport | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // Web Speech Voice Input Handler (Hindi & English)
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        language === 'hi'
          ? 'आपका ब्राउज़र वॉइस इनपुट सपोर्ट नहीं करता। कृपया Google Chrome या Microsoft Edge का उपयोग करें।'
          : 'Voice input is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setDescription((prev) => (prev ? `${prev} ${text}` : text).slice(0, 280));

          // Auto-select category based on spoken keywords
          const lower = text.toLowerCase();
          if (lower.includes('पानी') || lower.includes('जल') || lower.includes('water') || lower.includes('जलभराव')) {
            setSelectedCategory('waterlogging');
          } else if (lower.includes('कचरा') || lower.includes('गंदगी') || lower.includes('garbage') || lower.includes('कूड़ा')) {
            setSelectedCategory('garbage');
          } else if (lower.includes('गड्ढा') || lower.includes('सड़क') || lower.includes('pothole') || lower.includes('road')) {
            setSelectedCategory('pothole');
          } else if (lower.includes('लाइट') || lower.includes('बिजली') || lower.includes('streetlight') || lower.includes('अंधेरा')) {
            setSelectedCategory('streetlight');
          } else if (lower.includes('पशु') || lower.includes('गाय') || lower.includes('cattle') || lower.includes('सांड')) {
            setSelectedCategory('stray_cattle');
          } else if (lower.includes('सीवर') || lower.includes('नाली') || lower.includes('sewage')) {
            setSelectedCategory('sewage');
          } else if (lower.includes('पाइप') || lower.includes('सप्लाई') || lower.includes('नल')) {
            setSelectedCategory('water_supply');
          }
        }
      };

      recognition.onerror = () => setIsVoiceRecording(false);
      recognition.onend = () => setIsVoiceRecording(false);

      recognition.start();
    } catch {
      setIsVoiceRecording(false);
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = (report: ResidentReport) => {
    const text = encodeURIComponent(
      `🚨 *Jaipur CityPulse Grievance Report*\n` +
      `📌 *Ticket ID:* ${report.id}\n` +
      `📋 *Category:* ${report.category.toUpperCase()}\n` +
      `📍 *Location:* ${report.landmark || 'Jaipur'}\n` +
      `📝 *Details:* ${report.description}\n` +
      `⚡ *Status:* ${report.status.replace('_', ' ').toUpperCase()}\n` +
      `👍 *Upvotes:* ${report.upvotes}\n` +
      `🔗 *Track live on CityPulse Jaipur:* ${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Mini Map ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Close prediction dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteContainerRef.current && !autocompleteContainerRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reverse geocoding helper (Google Geocoding API proxy)
  const triggerReverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.landmark) {
          setLandmark(data.landmark);
        }
        if (data.zoneId) {
          setSelectedZoneId(data.zoneId);
        }
      }
    } catch (err) {
      console.warn('Geocoding notice:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleAutocompleteSearch = async (val: string) => {
    setAutocompleteQuery(val);
    if (!val.trim() || val.length < 2) {
      setAutocompletePredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsSearchingPlaces(true);
    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: val }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutocompletePredictions(data.predictions || []);
        setShowPredictions(true);
      }
    } catch (err) {
      console.warn('Places autocomplete notice:', err);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleSelectPrediction = (pred: any) => {
    setAutocompleteQuery(pred.description);
    setLandmark(pred.mainText || pred.description);
    setShowPredictions(false);

    if (pred.coordinates) {
      const { lat, lng } = pred.coordinates;
      setCoordinates({ lat, lng });
      const matched = pred.zoneId || findClosestZone(lat, lng);
      setSelectedZoneId(matched);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([lat, lng], 15);
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  };

  // Load user my_reports ticket IDs from localStorage
  const [myReportIds, setMyReportIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('citypulse_my_reports') || '[]');
    } catch {
      return [];
    }
  });

  // Calculate closest zone from coordinate
  const findClosestZone = (lat: number, lng: number): string => {
    let closestZone = JAIPUR_ZONES[0].id;
    let minDistance = Infinity;

    JAIPUR_ZONES.forEach((zone) => {
      const dist = Math.hypot(zone.center.lat - lat, zone.center.lng - lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestZone = zone.id;
      }
    });

    return closestZone;
  };

  // Mini Leaflet Map initialization
  useEffect(() => {
    if (activeView !== 'form') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coordinates.lat, coordinates.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      // Custom pulsing pin icon
      const customPin = L.divIcon({
        className: 'custom-resident-pin',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #d97757;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
          ">📍</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([coordinates.lat, coordinates.lng], {
        icon: customPin,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoordinates({ lat: pos.lat, lng: pos.lng });
        const matchedZone = findClosestZone(pos.lat, pos.lng);
        setSelectedZoneId(matchedZone);
        triggerReverseGeocode(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoordinates({ lat, lng });
        const matchedZone = findClosestZone(lat, lng);
        setSelectedZoneId(matchedZone);
        triggerReverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [activeView]);

  // Update map pin when zone dropdown changes
  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const z = JAIPUR_ZONES.find((zone) => zone.id === zoneId);
    if (z) {
      setCoordinates(z.center);
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([z.center.lat, z.center.lng]);
        mapInstanceRef.current.panTo([z.center.lat, z.center.lng]);
      }
    }
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocatingError(language === 'hi' ? 'ब्राउज़र में जियोलोकेशन समर्थित नहीं है।' : 'Geolocation not supported in browser.');
      return;
    }

    setIsLocating(true);
    setLocatingError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        const closest = findClosestZone(latitude, longitude);
        setSelectedZoneId(closest);

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.setView([latitude, longitude], 15);
        }

        triggerReverseGeocode(latitude, longitude);

        addToast({
          title: language === 'hi' ? 'स्थान प्राप्त हुआ' : 'Location Acquired',
          message: `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${closest})`,
          type: 'success',
        });
      },
      (err) => {
        setIsLocating(false);
        setLocatingError(language === 'hi' ? 'स्थान प्राप्त नहीं हो सका। कृपया सूची से क्षेत्र चुनें।' : 'Could not access GPS location. Please select zone from the dropdown.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Anti-Spam Rate Limit Check
    const rateCheck = checkReportRateLimit();
    if (!rateCheck.allowed) {
      addToast({
        title: language === 'hi' ? 'सुरक्षा सीमा (Anti-Spam Alert)' : 'Anti-Spam Security Alert',
        message: rateCheck.message || 'Please wait before submitting another report.',
        type: 'warning',
      });
      return;
    }

    const catObj = CATEGORY_OPTIONS.find((c) => c.id === selectedCategory) || CATEGORY_OPTIONS[0];
    const zoneObj = JAIPUR_ZONES.find((z) => z.id === selectedZoneId) || JAIPUR_ZONES[0];

    // Generate ticket ID like JPR-2026-00123
    const randomTicketNum = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `JPR-2026-${randomTicketNum}`;

    // 2. Strict Privacy Sanitization & PII Redaction
    const descSanitized = redactPII(description.trim());
    const cleanDescription =
      descSanitized.cleanText || `${catObj.nameEn} incident reported at ${landmark || zoneObj.nameEn}`;
    const cleanLandmark = redactPII(landmark.trim()).cleanText || `${zoneObj.nameEn} Sector`;
    const cleanTitle = `${catObj.nameEn} at ${cleanLandmark.slice(0, 30)}`;

    // 3. Street-level GPS Fuzzing (~11m privacy safeguard)
    const fuzzedCoords = fuzzLocationCoordinates(coordinates.lat, coordinates.lng);

    const finalReason = reportReason.trim() || `${catObj.nameHi} / ${catObj.nameEn}`;

    const newReport: ResidentReport = {
      id: ticketId,
      timestamp: Date.now(),
      zoneId: selectedZoneId,
      category: catObj.category,
      rawCategory: catObj.id,
      title: cleanTitle,
      reason: finalReason,
      description: cleanDescription,
      landmark: cleanLandmark,
      coordinates: fuzzedCoords,
      severity,
      upvotes: 1,
      status: 'submitted',
      isAnonymous: true,
      assignedDepartment: catObj.defaultDepartment,
      reportedByMe: true,
    };

    // Record submission for rate limiting
    recordReportSubmission();

    // Ingest into store and full pipeline
    addResidentReport(newReport);

    // Update local state list
    setMyReportIds((prev) => [ticketId, ...prev]);

    // Show confirmation modal
    setSubmittedReport(newReport);

    // Reset form
    setDescription('');
    setLandmark('');
    setReportReason('');

    if (descSanitized.hasRedactions) {
      addToast({
        title: language === 'hi' ? 'डेटा निजता सुरक्षा लागू' : 'Privacy Protection Active',
        message:
          language === 'hi'
            ? 'आपके संपर्क विवरण को सार्वजनिक प्रदर्शन से स्वतः मास्क कर दिया गया है।'
            : 'Personal contact details were automatically masked to protect your privacy.',
        type: 'info',
      });
    }

    addToast({
      title: language === 'hi' ? 'शिकायत सफलतापूर्वक दर्ज' : 'Grievance Submitted',
      message: `${ticketId} logged into Jaipur municipal pipeline.`,
      type: 'success',
    });
  };

  // Handle local upvote
  const handleUpvote = (reportId: string) => {
    if (upvotedIds[reportId]) return;
    setUpvotedIds((prev) => ({ ...prev, [reportId]: true }));
    addToast({
      title: language === 'hi' ? 'समर्थन दर्ज किया' : 'Upvote Registered',
      message: language === 'hi' ? 'इस समस्या की प्राथमिकता में आपका वोट जुड़ गया है।' : 'Your vote increases response priority in the cluster engine.',
      type: 'info',
    });
  };

  // Reports to display in "My Reports" view
  const myReports = residentReports.filter((r) => r.reportedByMe || myReportIds.includes(r.id));
  const publicReports = residentReports;

  // Status step configuration (5-step resident pipeline)
  const statusSteps: Array<{ key: ResidentReport['status']; labelEn: string; labelHi: string }> = [
    { key: 'submitted', labelEn: 'Submitted', labelHi: 'दर्ज' },
    { key: 'considered', labelEn: 'Considered', labelHi: 'समीक्षाधीन' },
    { key: 'team_sent', labelEn: 'Team Sent', labelHi: 'टीम रवाना' },
    { key: 'in_progress', labelEn: 'Work in Progress', labelHi: 'कार्य जारी' },
    { key: 'resolved', labelEn: 'Resolved', labelHi: 'निस्तारित' },
  ];

  const getStatusStepIndex = (st: ResidentReport['status']): number => {
    switch (st) {
      case 'submitted':
        return 0;
      case 'considered':
      case 'acknowledged':
      case 'triaged':
      case 'need_info':
        return 1;
      case 'team_sent':
        return 2;
      case 'in_progress':
        return 3;
      case 'resolved':
        return 4;
      case 'rejected':
        return -1;
      default:
        return 0;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#280D1F] p-6 sm:p-8 border border-[#E0F2F5] dark:border-[#521E3B] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCF1F4] text-[#0891B2] dark:text-[#38BDF8] text-xs font-semibold mb-2 border border-[#CCF1F4] dark:border-[#521E3B]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Jaipur Citizen Grievance Redressal</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F3E48] dark:text-[#FFD1DC] tracking-tight">
              {language === 'hi' ? 'नागरिक समस्या रिपोर्ट करें' : 'Report a Civic Issue'}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#3E6B75] dark:text-[#E3B0C4] leading-relaxed max-w-2xl">
              {language === 'hi'
                ? 'जलभराव, कचरा, गड्ढे या स्ट्रीट लाइट की सीधी रिपोर्टिंग। यह सीधे नगर निगम व आपदा नियंत्रण केंद्र में दर्ज होती है।'
                : 'Direct civic dispatch for waterlogging, potholes, power, and sanitation. Tracked live through municipal resolution.'}
            </p>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[#F0FCFD] dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] shrink-0 self-start sm:self-center shadow-xs">
            <button
              type="button"
              onClick={() => setActiveView('form')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'form'
                  ? 'bg-[#0891B2] text-white shadow-xs'
                  : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'नई रिपोर्ट' : 'Report Issue'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('my_reports')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'my_reports'
                  ? 'bg-[#0891B2] text-white shadow-xs'
                  : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>
                {language === 'hi' ? 'मेरी शिकायतें' : 'My Reports'} ({myReports.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Success Card (shown immediately upon submission) */}
      {submittedReport && (
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-600 text-white mb-1">
                  <span>TICKET: {submittedReport.id}</span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-[var(--jaipur-text)]">
                  {language === 'hi' ? 'शिकायत सफलतापूर्वक दर्ज कर ली गई है!' : 'Grievance Successfully Registered!'}
                </h4>
                <p className="text-xs text-[var(--jaipur-text-secondary)] mt-0.5">
                  {language === 'hi'
                    ? 'आपकी रिपोर्ट नब्ज़ पाइपलाइन में जुड़ चुकी है और नगर निगम की संबंधित शाखा को प्रेषित कर दी गई है।'
                    : 'Report ingested into Jaipur Pulse telemetry, anomaly clustering, and dispatched to the field department.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSubmittedReport(null)}
              className="text-xs text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--jaipur-surface)] border border-emerald-500/20 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--jaipur-text-muted)] block">Assigned Wing</span>
              <span className="font-semibold text-[var(--jaipur-text)]">{submittedReport.assignedDepartment}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--jaipur-text-muted)] block">Ward / Zone</span>
              <span className="font-semibold text-[var(--jaipur-text)]">
                {JAIPUR_ZONES.find((z) => z.id === submittedReport.zoneId)?.nameEn || submittedReport.zoneId}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--jaipur-text-muted)] block">Initial Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">Submitted • Active Queue</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleShareWhatsApp(submittedReport)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'व्हाट्सऐप पर साझा करें' : 'Share on WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmittedReport(null);
                setActiveView('my_reports');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] hover:bg-[var(--jaipur-surface)] text-[var(--jaipur-text)] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {language === 'hi' ? 'मेरी रिपोर्ट सूची में ट्रैक करें →' : 'Track in My Reports →'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: REPORT FORM */}
      {activeView === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <JharokhaCard
            title={language === 'hi' ? 'घटना विवरण दर्ज करें' : 'File New Grievance'}
            subtitle={language === 'hi' ? 'सभी फ़ील्ड्स तुरंत सत्यापित व प्रोसेस की जाती हैं' : 'Integrated with Jaipur GIS and multi-modal pipeline'}
            variant="elevated"
          >
            <div className="space-y-6">
              {/* 1. Category Icon Buttons */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--jaipur-text-secondary)] mb-2.5">
                  1. {language === 'hi' ? 'समस्या की श्रेणी चुनें' : 'Select Issue Category'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--jaipur-terracotta)] bg-[var(--jaipur-terracotta)]/15 shadow-sm scale-[1.02]'
                            : 'border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 hover:border-[var(--jaipur-terracotta)]/50 hover:bg-[var(--jaipur-surface)]'
                        }`}
                      >
                        <span className="text-2xl mb-1">{cat.icon}</span>
                        <span className="text-xs font-bold text-[var(--jaipur-text)] line-clamp-1">
                          {language === 'hi' ? cat.nameHi : cat.nameEn}
                        </span>
                        <span className="text-[10px] text-[var(--jaipur-text-muted)] mt-0.5 capitalize">
                          {cat.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Reason for Report (किस बात के लिए रिपोर्ट है) - ANY LANGUAGE */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px]">2</span>
                    <span>{language === 'hi' ? 'रिपोर्ट का कारण (किस बात के लिए रिपोर्ट है?)' : 'Reason for Report (What is this report about?)'}</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {language === 'hi' ? '✨ किसी भी भाषा में लिखें (हिंदी, English, Hinglish, राजस्थानी)' : '✨ Type in any language (Hindi, English, Hinglish, etc.)'}
                  </span>
                </div>

                {/* Quick Reason Chips */}
                <div>
                  <span className="text-[11px] text-[var(--jaipur-text-secondary)] font-medium mb-1.5 block">
                    {language === 'hi' ? 'त्वरित कारण चुनें (Quick Select):' : 'Quick Select Reason:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((qr) => {
                      const isChosen = reportReason === (language === 'hi' ? qr.hi : qr.en);
                      return (
                        <button
                          type="button"
                          key={qr.id}
                          onClick={() => {
                            setReportReason(language === 'hi' ? qr.hi : qr.en);
                            setSelectedCategory(qr.cat);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-105'
                              : 'bg-[var(--jaipur-card)] text-[var(--jaipur-text)] border-[var(--jaipur-border)] hover:border-amber-500/50 hover:bg-amber-500/5'
                          }`}
                        >
                          <span>{qr.icon}</span>
                          <span>{language === 'hi' ? qr.hi : qr.en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom / Editable Reason Input in any language */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--jaipur-text)] mb-1">
                    {language === 'hi' ? 'कारण लिखें या संपादित करें (Editable in any language):' : 'Enter or Edit exact reason (Any language):'}
                  </label>
                  <input
                    type="text"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder={
                      language === 'hi'
                        ? 'उदा. "सड़क पर गहरा गड्ढा" या "Kachra 3 din se nahi uthaya" या "Water pipe leaking" या "भीषण ट्रैफिक"'
                        : 'e.g. "Severe pothole on main road" or "Kachra nahi utha" or "No drinking water since morning"'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-500/50 bg-[var(--jaipur-surface)] text-[var(--jaipur-text)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
                    required
                  />
                </div>
              </div>

              {/* 3. Interactive Mini Map & Location Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--jaipur-text-secondary)]">
                    3. {language === 'hi' ? 'स्थान चुनें (मानचित्र पर टैप करें अथवा GPS का उपयोग करें)' : 'Location (Tap mini map or use GPS)'}
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta)]/25 border border-[var(--jaipur-terracotta)]/30 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>
                      {isLocating
                        ? (language === 'hi' ? 'खोज रहे हैं...' : 'Acquiring GPS...')
                        : (language === 'hi' ? 'मेरी वर्तमान स्थिति का उपयोग करें' : 'Use My Current Location')}
                    </span>
                  </button>
                </div>

                {locatingError && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{locatingError}</span>
                  </div>
                )}

                {/* Places Autocomplete Search Bar (restricted to Jaipur) */}
                <div className="relative" ref={autocompleteContainerRef}>
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-[var(--jaipur-text-muted)]" />
                    <input
                      type="text"
                      value={autocompleteQuery}
                      onChange={(e) => handleAutocompleteSearch(e.target.value)}
                      onFocus={() => {
                        if (autocompletePredictions.length > 0) setShowPredictions(true);
                      }}
                      placeholder={
                        language === 'hi'
                          ? 'स्थान खोजें (जैसे "बड़ी चौपड़", "हवा महल", "एमआई रोड")...'
                          : 'Search location (e.g. "Badi Chaupar", "Hawa Mahal", "MI Road")...'
                      }
                      className="w-full rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] pl-9 pr-9 py-2.5 text-xs text-[var(--jaipur-text)] focus:outline-none focus:border-[var(--jaipur-terracotta)] shadow-xs"
                    />
                    {isSearchingPlaces && (
                      <div className="absolute right-3">
                        <div className="h-3.5 w-3.5 border-2 border-[var(--jaipur-terracotta)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Autocomplete Predictions Dropdown */}
                  {showPredictions && autocompletePredictions.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-[var(--jaipur-surface-warm)] border-b border-[var(--jaipur-border)] flex items-center justify-between text-[10px] text-[var(--jaipur-text-muted)] font-mono">
                        <span>GOOGLE PLACES AUTOCOMPLETE (JAIPUR)</span>
                        <span>SELECT TO PIN</span>
                      </div>
                      {autocompletePredictions.map((pred) => (
                        <button
                          key={pred.placeId}
                          type="button"
                          onClick={() => handleSelectPrediction(pred)}
                          className="w-full text-left px-3 py-2.5 hover:bg-[var(--jaipur-surface-warm)] transition-colors border-b border-[var(--jaipur-border)]/50 last:border-0 flex items-start gap-2 cursor-pointer"
                        >
                          <MapPin className="h-4 w-4 text-[var(--jaipur-terracotta)] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-xs text-[var(--jaipur-text)] block truncate">
                              {pred.mainText}
                            </span>
                            <span className="text-[10px] text-[var(--jaipur-text-secondary)] block truncate">
                              {pred.secondaryText || pred.description}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-[var(--jaipur-text-muted)] shrink-0">
                            Jaipur
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Leaflet Mini Map Container */}
                <div className="relative rounded-xl overflow-hidden border border-[var(--jaipur-border)] h-52 sm:h-60 bg-[var(--jaipur-surface-warm)]">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />
                  <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-md bg-[var(--jaipur-surface)]/90 backdrop-blur-xs border border-[var(--jaipur-border)] text-[11px] font-mono text-[var(--jaipur-text)] shadow-xs flex items-center gap-2">
                    <span>Pin: {coordinates.lat.toFixed(4)}°N, {coordinates.lng.toFixed(4)}°E</span>
                    {isReverseGeocoding && (
                      <span className="text-[var(--jaipur-terracotta)] animate-pulse flex items-center gap-1">
                        <span>• Geocoding...</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Zone Picker Fallback / Override */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--jaipur-text-secondary)] mb-1">
                      {language === 'hi' ? 'प्रशासनिक ज़ोन (वार्ड)' : 'Administrative Zone'}
                    </label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      className="w-full rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] px-3 py-2 text-xs font-semibold text-[var(--jaipur-text)] focus:outline-none focus:border-[var(--jaipur-terracotta)]"
                    >
                      {JAIPUR_ZONES.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {language === 'hi' ? zone.nameHi : zone.nameEn} ({zone.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--jaipur-text-secondary)] mb-1">
                      {language === 'hi' ? 'समीपस्थ लैंडमार्क / गली' : 'Landmark / Street Address'}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--jaipur-text-muted)]" />
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near Hawa Mahal, Johari Bazar road"
                        className="w-full rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] pl-8 pr-3 py-2 text-xs text-[var(--jaipur-text)] focus:outline-none focus:border-[var(--jaipur-terracotta)]"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Description (max 280 chars) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--jaipur-text-secondary)]">
                    4. {language === 'hi' ? 'समस्या का विस्तृत विवरण (अधिकतम 280 अक्षर)' : 'Detailed Description (Max 280 chars)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        isVoiceRecording
                          ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                          : 'bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta)]/25 border border-[var(--jaipur-terracotta)]/30'
                      }`}
                      title={language === 'hi' ? 'बोलकर विवरण भरें (हिंदी / English)' : 'Voice Input (Hindi / English)'}
                    >
                      {isVoiceRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      <span>{isVoiceRecording ? (language === 'hi' ? 'सुन रहे हैं...' : 'Listening...') : (language === 'hi' ? 'बोलकर लिखें' : 'Voice Input')}</span>
                    </button>
                    <span
                      className={`text-[11px] font-mono ${
                        description.length > 260
                          ? 'text-rose-500 font-bold'
                          : 'text-[var(--jaipur-text-muted)]'
                      }`}
                    >
                      {description.length} / 280
                    </span>
                  </div>
                </div>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what is occurring (e.g. water stagnation under the railway bridge, impassable for bikes since 11 AM)..."
                  className="w-full rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-3 text-xs text-[var(--jaipur-text)] focus:outline-none focus:border-[var(--jaipur-terracotta)] resize-none"
                  required
                />
              </div>

              {/* 4. Optional Severity Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--jaipur-text-secondary)] mb-2">
                  4. {language === 'hi' ? 'गंभीरता स्तर (वैकल्पिक)' : 'Estimated Severity (Optional)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITY_LEVELS.map((sev) => {
                    const isSelected = severity === sev.id;
                    return (
                      <button
                        type="button"
                        key={sev.id}
                        onClick={() => setSeverity(sev.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? `${sev.color} ring-2 ring-[var(--jaipur-terracotta)] shadow-xs`
                            : 'border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] hover:bg-[var(--jaipur-surface-warm)]'
                        }`}
                      >
                        {language === 'hi' ? sev.labelHi : sev.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Privacy Notice & Sanitization Guarantee */}
              <div className="p-3.5 rounded-xl bg-[var(--jaipur-sandstone)]/15 border border-[var(--jaipur-sandstone)]/30 flex items-start gap-3 text-xs">
                <ShieldCheck className="h-4 w-4 text-[var(--jaipur-gold)] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-[var(--jaipur-text)] block">
                    {language === 'hi' ? 'नागरिक गोपनीयता सुरक्षा (Privacy Note)' : 'Civic Privacy Protection Guarantee'}
                  </span>
                  <p className="text-[var(--jaipur-text-secondary)] leading-relaxed text-[11px]">
                    {language === 'hi'
                      ? 'कृपया अपना नाम या मोबाइल नंबर न लिखें। सिस्टम स्वचालित रूप से किसी भी 10-अंकीय फोन नंबर और ईमेल पते को सुरक्षित रूप से हटा (redact) देता है।'
                      : 'Do not include names or phone numbers. All 10-digit telephone numbers and email addresses are automatically stripped before submission.'}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta-deep)] text-white text-sm font-bold shadow-md shadow-[var(--jaipur-terracotta)]/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{language === 'hi' ? 'शिकायत दर्ज करें' : 'Submit Grievance'}</span>
                </button>
              </div>
            </div>
          </JharokhaCard>
        </form>
      )}

      {/* VIEW 2: MY REPORTS & STATUS TRACKER */}
      {activeView === 'my_reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--jaipur-text)]">
                {language === 'hi' ? 'मेरी प्रस्तुत शिकायतें' : 'My Filed Reports'}
              </h3>
              <p className="text-xs text-[var(--jaipur-text-secondary)]">
                {language === 'hi'
                  ? 'दर्ज → स्वीकृत → प्रगति पर → निस्तारित चरण की लाइव स्थिति'
                  : 'Track lifecycle: Submitted → Acknowledged → In Progress → Resolved'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('form')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--jaipur-terracotta)] text-white text-xs font-bold shadow-xs hover:bg-[var(--jaipur-terracotta-deep)] cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'नई शिकायत करें' : 'File Another Report'}</span>
            </button>
          </div>

          {myReports.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[var(--jaipur-surface)] border border-dashed border-[var(--jaipur-border)] text-center space-y-3">
              <FileText className="h-10 w-10 text-[var(--jaipur-text-muted)] mx-auto" />
              <h4 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                {language === 'hi' ? 'आपने अभी तक कोई शिकायत दर्ज नहीं की है' : 'No Reports Submitted Yet'}
              </h4>
              <p className="text-xs text-[var(--jaipur-text-secondary)] max-w-md mx-auto">
                {language === 'hi'
                  ? 'जयपुर शहर में कहीं भी जलभराव, सड़क गड्ढे या कचरे की समस्या दिखाई देने पर आप तुरंत रिपोर्ट दर्ज कर सकते हैं।'
                  : 'Report issues like waterlogging, dark streetlights, or potholes to engage Jaipur municipal services.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveView('form')}
                className="mt-2 px-5 py-2 rounded-xl bg-[var(--jaipur-terracotta)] text-white text-xs font-bold hover:bg-[var(--jaipur-terracotta-deep)] cursor-pointer"
              >
                {language === 'hi' ? 'पहली शिकायत दर्ज करें' : 'Submit First Grievance'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myReports.map((report) => {
                const stepIdx = getStatusStepIndex(report.status);
                const isUpvoted = upvotedIds[report.id];
                const catInfo = CATEGORY_OPTIONS.find((c) => c.id === report.rawCategory || c.category === report.category) || CATEGORY_OPTIONS[0];
                const zoneInfo = JAIPUR_ZONES.find((z) => z.id === report.zoneId);

                return (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-4 shadow-xs hover:border-[var(--jaipur-terracotta)]/40 transition-colors"
                  >
                    {/* VERY TOP: REASON FOR REPORT (किस बात के लिए रिपोर्ट है) - ANY LANGUAGE */}
                    <div className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-orange-500/15 border-l-4 border-l-amber-500 border border-amber-500/30 flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider shrink-0 shadow-xs">
                          {language === 'hi' ? 'रिपोर्ट का कारण' : 'REASON FOR REPORT'}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-[var(--jaipur-text)] truncate" title={report.reason || report.title}>
                          {report.reason || report.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[var(--jaipur-terracotta)] bg-white/70 dark:bg-black/30 px-2 py-0.5 rounded shrink-0">
                        {report.id}
                      </span>
                    </div>

                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--jaipur-border)]">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{catInfo.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[var(--jaipur-terracotta)] bg-[var(--jaipur-terracotta)]/10 px-2 py-0.5 rounded border border-[var(--jaipur-terracotta)]/20">
                              {report.id}
                            </span>
                            <span className="text-xs font-semibold text-[var(--jaipur-text)]">
                              {language === 'hi' ? catInfo.nameHi : catInfo.nameEn}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              <span>{language === 'hi' ? 'गोपनीयता सुरक्षित' : 'Privacy Protected'}</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--jaipur-text-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {report.landmark} • {language === 'hi' ? zoneInfo?.nameHi : zoneInfo?.nameEn || report.zoneId}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
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
                          {report.status === 'resolved' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : report.status === 'in_progress' ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : report.status === 'team_sent' ? (
                            <Building2 className="h-3.5 w-3.5" />
                          ) : report.status === 'considered' || report.status === 'acknowledged' ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : report.status === 'rejected' ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {report.status === 'resolved'
                              ? (language === 'hi' ? 'निस्तारित' : 'Resolved')
                              : report.status === 'in_progress'
                              ? (language === 'hi' ? 'कार्य जारी' : 'In Progress')
                              : report.status === 'team_sent'
                              ? (language === 'hi' ? 'टीम रवाना' : 'Team Sent')
                              : report.status === 'considered' || report.status === 'acknowledged'
                              ? (language === 'hi' ? 'समीक्षाधीन' : 'Considered')
                              : report.status === 'rejected'
                              ? (language === 'hi' ? 'अस्वीकृत' : 'Rejected')
                              : report.status === 'need_info'
                              ? (language === 'hi' ? 'जानकारी अपेक्षित' : 'Need Info')
                              : (language === 'hi' ? 'दर्ज' : 'Submitted')}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleUpvote(report.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            isUpvoted
                              ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)]'
                              : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text)] border-[var(--jaipur-border)] hover:border-[var(--jaipur-terracotta)]'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>
                            {report.upvotes + (isUpvoted ? 1 : 0)} {language === 'hi' ? 'समर्थन' : 'Upvotes'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(report)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                          title={language === 'hi' ? 'व्हाट्सऐप पर भेजें' : 'Share on WhatsApp'}
                        >
                          <Share2 className="h-3 w-3" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--jaipur-text)] leading-relaxed">
                      {report.description}
                    </p>

                    {/* Progress Pipeline Stepper (5 steps: Submitted -> Considered -> Team Sent -> Work in Progress -> Resolved) */}
                    {report.status !== 'rejected' && (
                      <div className="pt-2">
                        <div className="grid grid-cols-5 gap-1.5 relative">
                          {statusSteps.map((step, idx) => {
                            const isDone = stepIdx >= 0 && idx <= stepIdx;
                            const isCurrent = idx === stepIdx;

                            return (
                              <div key={step.key} className="flex flex-col items-center text-center relative">
                                <div
                                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                                    isCurrent
                                      ? 'bg-[var(--jaipur-terracotta)] text-white ring-4 ring-[var(--jaipur-terracotta)]/20'
                                      : isDone
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-muted)] border border-[var(--jaipur-border)]'
                                  }`}
                                >
                                  {isDone && !isCurrent ? '✓' : idx + 1}
                                </div>
                                <span
                                  className={`text-[9px] sm:text-[10px] mt-1 font-semibold leading-tight ${
                                    isCurrent
                                      ? 'text-[var(--jaipur-terracotta)] font-bold'
                                      : isDone
                                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                      : 'text-[var(--jaipur-text-muted)]'
                                  }`}
                                >
                                  {language === 'hi' ? step.labelHi : step.labelEn}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rejection notice if rejected */}
                    {report.status === 'rejected' && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{language === 'hi' ? 'शिकायत अस्वीकृति / अमान्य विवरण' : 'Grievance Rejected / Duplicate'}</span>
                        </div>
                        <p className="text-[var(--jaipur-text)] text-[11px] leading-relaxed">
                          {report.resolutionNote || (language === 'hi' ? 'यह शिकायत डुप्लिकेट या गैर-कार्रवाई योग्य पाई गई।' : 'This grievance was flagged as duplicate or non-actionable by staff.')}
                        </p>
                      </div>
                    )}

                    {/* Full Timeline of Staff Replies */}
                    {report.timeline && report.timeline.length > 0 && (
                      <div className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--jaipur-text-muted)] block">
                          {language === 'hi' ? 'निगम कार्रवाई व टाइमलाइन' : 'Municipal Action & Response Timeline'}
                        </span>
                        <div className="space-y-2 border-l-2 border-[var(--jaipur-border)] ml-1 pl-3">
                          {report.timeline.map((entry) => (
                            <div key={entry.id} className="text-xs space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--jaipur-terracotta)]/10 text-[var(--jaipur-terracotta)] border border-[var(--jaipur-terracotta)]/20">
                                  {entry.staffName || 'STARKTECH'}
                                </span>
                                {entry.team && (
                                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.2 rounded border border-purple-300 dark:border-purple-800">
                                    👷 {entry.team}
                                  </span>
                                )}
                                {entry.expectedTime && (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800">
                                    ⏱️ {entry.expectedTime}
                                  </span>
                                )}
                                <span className="text-[10px] text-[var(--jaipur-text-muted)] font-mono ml-auto">
                                  {formatDateTimeIST(entry.timestamp)}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--jaipur-text)] leading-relaxed">
                                {language === 'hi' ? entry.messageHi || entry.messageEn : entry.messageEn}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution Note if resolved and not duplicated */}
                    {report.resolutionNote && report.status === 'resolved' && !report.timeline && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {language === 'hi' ? 'अधिकारियों द्वारा समाधान नोट' : 'Official Resolution Note'}
                          </span>
                        </div>
                        <p className="text-[var(--jaipur-text)] text-[11px] leading-relaxed">
                          {report.resolutionNote}
                        </p>
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--jaipur-border)]/60 text-[10px] text-[var(--jaipur-text-muted)]">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>
                          {language === 'hi' ? 'आवंटित विभाग: ' : 'Department: '}
                          {report.assignedDepartment}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTimeIST(report.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
