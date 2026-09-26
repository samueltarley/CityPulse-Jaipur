import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { JAIPUR_ZONES } from '../config/city';
import { JharokhaCard } from '../components/theme/JharokhaCard';
import {
  PhoneCall,
  ShieldAlert,
  Ambulance,
  Zap,
  Droplet,
  HeartHandshake,
  AlertTriangle,
  Navigation,
  Compass,
  Calendar,
  Clock,
  Sparkles,
  Award,
  Share2,
  CheckCircle2,
  Home,
  Mic,
  MicOff,
  Search,
  ExternalLink,
  MapPin,
  Flame,
  Wind,
  Bed,
  Users,
  BadgeCheck,
  Send,
  Download,
  Copy,
  Check,
} from 'lucide-react';

// Emergency Helplines
const EMERGENCY_NUMBERS = [
  {
    number: '112',
    nameEn: 'All-in-One National Emergency',
    nameHi: 'अखिल भारतीय आपातकालीन नंबर (पुलिस, एम्बुलेंस, फायर)',
    deptEn: 'Police, Fire, Disaster Police Command',
    icon: ShieldAlert,
    color: 'bg-rose-600',
    highlight: true,
  },
  {
    number: '181',
    nameEn: 'Rajasthan Sampark Helpline',
    nameHi: 'राजस्थान संपर्क जन-शिकायत निवारण',
    deptEn: 'CM Rajasthan Citizen Grievance Portal',
    icon: PhoneCall,
    color: 'bg-amber-600',
    highlight: true,
  },
  {
    number: '108',
    nameEn: 'Emergency Medical & Trauma Ambulance',
    nameHi: '108 आपातकालीन मेडिकल व एम्बुलेंस',
    deptEn: 'National Health Mission Rajasthan',
    icon: Ambulance,
    color: 'bg-emerald-600',
    highlight: true,
  },
  {
    number: '1912',
    nameEn: 'JVVNL Electricity Breakdown & SCADA',
    nameHi: 'जयपुर डिस्कॉम 24x7 बिजली फॉल्ट हेल्पलाइन',
    deptEn: 'Jaipur Vidyut Vitran Nigam Limited',
    icon: Zap,
    color: 'bg-amber-500',
  },
  {
    number: '1077',
    nameEn: 'Jaipur District Flood & Disaster Cell',
    nameHi: 'जयपुर जिला आपदा व बाढ़ नियंत्रण कक्ष',
    deptEn: 'District Collectorate & Disaster Management',
    icon: AlertTriangle,
    color: 'bg-blue-600',
  },
  {
    number: '1090',
    nameEn: 'Garima Mahila Helpline',
    nameHi: 'गरिमा महिला सुरक्षा व सहायता हेल्पलाइन',
    deptEn: 'Rajasthan Police Women Cell',
    icon: Users,
    color: 'bg-purple-600',
  },
  {
    number: '1098',
    nameEn: 'Childline Helpline',
    nameHi: 'बाल सुरक्षा व बाल हेल्पलाइन 1098',
    deptEn: 'Ministry of Women and Child Development',
    icon: HeartHandshake,
    color: 'bg-indigo-600',
  },
  {
    number: '0141-2742900',
    nameEn: 'SMS Medical Emergency Desk',
    nameHi: 'सवाई मानसिंह (SMS) अस्पताल आपातकालीन डेस्क',
    deptEn: 'SMS Hospital Trauma & Emergency',
    icon: Ambulance,
    color: 'bg-rose-500',
  },
];

// Zone-wise Hospitals, Pharmacies & Blood Banks
const ZONE_TRAUMA_CENTERS: Record<
  string,
  Array<{
    nameEn: string;
    nameHi: string;
    type: 'Govt Hospital' | 'Trauma Center' | 'Private Super-Specialty' | '24x7 Pharmacy' | 'Blood Bank';
    addressEn: string;
    phone: string;
    timing: string;
    lat: number;
    lng: number;
  }>
> = {
  'walled-city': [
    {
      nameEn: 'Sawai Man Singh (SMS) Hospital & Trauma Centre',
      nameHi: 'सवाई मानसिंह (SMS) अस्पताल व ट्रॉमा केंद्र',
      type: 'Govt Hospital',
      addressEn: 'JLN Marg near Ajmeri Gate, Jaipur',
      phone: '0141-2560291',
      timing: '24x7 Open • Emergency & ICU',
      lat: 26.8992,
      lng: 75.8164,
    },
    {
      nameEn: 'Gangauri State Hospital',
      nameHi: 'गणगौरी राजकीय अस्पताल',
      type: 'Govt Hospital',
      addressEn: 'Gangauri Bazar, Walled City, Jaipur',
      phone: '0141-2601789',
      timing: '24x7 Emergency',
      lat: 26.9281,
      lng: 75.8239,
    },
  ],
  'malviya-nagar': [
    {
      nameEn: 'Rukmani Devi Jaipuria District Hospital',
      nameHi: 'रुक्मणी देवी जयपुरिया राजकीय जिला अस्पताल',
      type: 'Govt Hospital',
      addressEn: 'Sector 7, Milap Nagar, Malviya Nagar',
      phone: '0141-2546416',
      timing: '24x7 Emergency • Blood Bank',
      lat: 26.8524,
      lng: 75.8162,
    },
    {
      nameEn: 'Fortis Escorts Hospital',
      nameHi: 'फोर्टिस एस्कॉर्ट्स सुपर स्पेशियलिटी अस्पताल',
      type: 'Private Super-Specialty',
      addressEn: 'Jawahar Lal Nehru Marg, Malviya Nagar',
      phone: '0141-2547000',
      timing: '24x7 Emergency Trauma',
      lat: 26.8488,
      lng: 75.8089,
    },
  ],
  'mansarovar': [
    {
      nameEn: 'Metro MAS Multispeciality Hospital',
      nameHi: 'मेट्रो मास सुपर-स्पेशियलिटी अस्पताल',
      type: 'Private Super-Specialty',
      addressEn: 'Shipra Path, Mansarovar',
      phone: '0141-2785555',
      timing: '24x7 Emergency',
      lat: 26.8533,
      lng: 75.7688,
    },
    {
      nameEn: 'Mansarovar Urban Community Health Centre (CHC)',
      nameHi: 'मानसरोवर सामुदायिक स्वास्थ्य केंद्र (CHC)',
      type: 'Govt Hospital',
      addressEn: 'Kiran Path near VT Road, Mansarovar',
      phone: '0141-2781122',
      timing: '24x7 Emergency Desk',
      lat: 26.8582,
      lng: 75.7611,
    },
  ],
  'vaishali-nagar': [
    {
      nameEn: 'Amar Jain Hospital & Trauma Wing',
      nameHi: 'अमर जैन अस्पताल व ट्रॉमा विंग',
      type: 'Private Super-Specialty',
      addressEn: 'Queens Road, Vaishali Nagar',
      phone: '0141-2351234',
      timing: '24x7 Emergency Care',
      lat: 26.9082,
      lng: 75.7511,
    },
  ],
  'amer': [
    {
      nameEn: 'Amer Sub-District Hospital & Trauma Post',
      nameHi: 'आमेर उप-जिला अस्पताल व ट्रॉमा पोस्ट',
      type: 'Govt Hospital',
      addressEn: 'Kunda, Amer Road, Jaipur',
      phone: '0141-2530188',
      timing: '24x7 Emergency Care',
      lat: 26.9882,
      lng: 75.8524,
    },
  ],
  'sanganer': [
    {
      nameEn: 'Mahatma Gandhi Medical College & Hospital',
      nameHi: 'महात्मा गांधी मेडिकल कॉलेज व अस्पताल',
      type: 'Govt Hospital',
      addressEn: 'RIICO Institutional Area, Sitapura / Sanganer',
      phone: '0141-2771777',
      timing: '24x7 Super Specialty Trauma & Blood Bank',
      lat: 26.7824,
      lng: 75.8211,
    },
  ],
};

// Safe Commute & Flood-Free Routes
const SAFE_COMMUTE_ADVISORIES = [
  {
    id: 'sc-1',
    zone: 'walled-city',
    chokePointEn: 'Tripolia Bazar & Choti Chaupar Low-Lying Stagnation',
    chokePointHi: 'त्रिपोलिया बाजार व छोटी चौपड़ जलभराव',
    riskLevel: 'Moderate Waterlogging (1.2 ft)',
    status: 'divert_advised',
    safeAlternativeEn: 'Use MI Road or Kishanpole Bazar via Ajmeri Gate bypass.',
    safeAlternativeHi: 'एमआई रोड अथवा किशनपोल बाजार अजमेरी गेट बाईपास का उपयोग करें।',
  },
  {
    id: 'sc-2',
    zone: 'malviya-nagar',
    chokePointEn: 'Gopalpura Bypass Underpass Railway Culvert',
    chokePointHi: 'गोपालपुरा बाईपास रेलवे अंडरपास नाला',
    riskLevel: 'High Risk During Heavy Downpour',
    status: 'safe_clear',
    safeAlternativeEn: 'Currently drained and clear; pumping stations active.',
    safeAlternativeHi: 'वर्तमान में जल निकासी सामान्य है; पंपिंग स्टेशन सक्रिय हैं।',
  },
  {
    id: 'sc-3',
    zone: 'mansarovar',
    chokePointEn: 'New Sanganer Road near B2 Bypass Crossing',
    chokePointHi: 'न्यू सांगानेर रोड बी2 बाईपास चौराहा',
    riskLevel: 'Pothole & Asphalt Settling',
    status: 'slow_moving',
    safeAlternativeEn: 'Keep right lane towards Shipra Path flyover.',
    safeAlternativeHi: 'शिप्रा पथ फ्लाईओवर की ओर दाहिनी लेन में चलें।',
  },
];

// Scheduled Outages Board
const SCHEDULED_OUTAGES = [
  {
    id: 'outage-1',
    type: 'water',
    dept: 'Public Health Engineering Dept (PHED)',
    deptHi: 'जन स्वास्थ्य अभियांत्रिकी विभाग (PHED)',
    titleEn: 'Bisalpur Feeder Pipeline Maintenance',
    titleHi: 'बीसलपुर मुख्य पाइपलाइन वॉल्व मेंटेनेंस',
    affectedAreaEn: 'Mansarovar Sectors 7–11 & Sanganer Ward 42',
    affectedAreaHi: 'मानसरोवर सेक्टर 7-11 एवं सांगानेर वार्ड 42',
    scheduleTime: 'Tomorrow • 06:00 AM – 10:00 AM',
    recommendationEn: 'Residents are advised to store potable drinking water in advance.',
    recommendationHi: 'नागरिकों से पूर्व में पेयजल संचित करने का अनुरोध है।',
  },
  {
    id: 'outage-2',
    type: 'power',
    dept: 'Jaipur Discom (JVVNL)',
    deptHi: 'जयपुर विद्युत वितरण निगम लिमिटेड (JVVNL)',
    titleEn: '33/11kV Substation Transformer Upgradation',
    titleHi: '33/11kV सब-स्टेशन ट्रांसफॉर्मर सुदृढ़ीकरण',
    affectedAreaEn: 'Vaishali Nagar Amrapali Marg & Queens Road',
    affectedAreaHi: 'वैशाली नगर आम्रपाली मार्ग एवं क्वींस रोड',
    scheduleTime: 'Tomorrow • 11:00 AM – 02:00 PM',
    recommendationEn: 'Power cuts scheduled for grid safety; plan backup battery loads.',
    recommendationHi: 'ग्रिड सुरक्षा हेतु विद्युत कटौती प्रस्तावित; बैकअप व्यवस्था रखें।',
  },
];

// Night Shelters (रैन बसेरे) Directory
const NIGHT_SHELTERS = [
  {
    id: 'shelter-1',
    nameEn: 'Sindhi Camp Central Night Shelter',
    nameHi: 'सिंधी कैंप केंद्रीय रैन बसेरा',
    capacity: '120 Beds (Male / Female Separated)',
    locationEn: 'Near Sindhi Camp Central Bus Stand Platform 1',
    locationHi: 'सिंधी कैंप केंद्रीय बस स्टैंड प्लेटफार्म 1 के पास',
    phone: '0141-2200111',
    amenitiesEn: 'Clean bedding, warm blankets, RO drinking water, CCTV & security guard, free medical first aid.',
    amenitiesHi: 'साफ बिस्तर, कंबल, आरओ पेयजल, सीसीटीवी, 24 घंटे गार्ड व निशुल्क प्राथमिक उपचार।',
  },
  {
    id: 'shelter-2',
    nameEn: 'Jaipur Junction Railway Station Shelter',
    nameHi: 'जयपुर जंक्शन रेलवे स्टेशन रैन बसेरा',
    capacity: '80 Beds',
    locationEn: 'Hasanpura Road Gate 2, Railway Station',
    locationHi: 'हसनपुरा रोड गेट नं. 2, रेलवे स्टेशन जयपुर',
    phone: '0141-2202244',
    amenitiesEn: 'Emergency beds, clean washrooms, 24/7 care manager, luggage lockers.',
    amenitiesHi: 'आपातकालीन बिस्तर, स्वच्छ शौचालय, 24/7 केयर मैनेजर, सामान लॉकर।',
  },
  {
    id: 'shelter-3',
    nameEn: 'Ramniwas Bagh Community Relief Hall',
    nameHi: 'रामनिवार बाग सामुदायिक राहत केंद्र',
    capacity: '100 Beds',
    locationEn: 'Near Albert Hall Museum & Zoo Gate',
    locationHi: 'अल्बर्ट हॉल संग्रहालय के पास, रामनिवास बाग',
    phone: '0141-2563311',
    amenitiesEn: 'Monsoon and winter disaster refuge, medical desk, community dining area.',
    amenitiesHi: 'बाढ़ व सर्दी आपदा आश्रय, मेडिकल डेस्क, पेयजल एवं विश्राम कक्ष।',
  },
];

export const PublicHelpPage: React.FC = () => {
  const { language } = useLanguage();
  const { selectedZoneId, pulseMetrics, zoneWeatherAQI, residentReports, addToast } = useAppStore();

  const [activeSection, setActiveSection] = useState<
    'emergency' | 'routes' | 'outages' | 'health' | 'karma' | 'shelters'
  >('emergency');

  const [ticketSearch, setTicketSearch] = useState('');
  const [searchedReport, setSearchedReport] = useState<any | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Voice speech-to-text test state
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');

  const currentZoneId = selectedZoneId || 'walled-city';
  const currentZone = JAIPUR_ZONES.find((z) => z.id === currentZoneId) || JAIPUR_ZONES[0];
  const hospitalsInZone = ZONE_TRAUMA_CENTERS[currentZoneId] || ZONE_TRAUMA_CENTERS['walled-city'];

  // Current weather and AQI for health advice
  const currentAQI = zoneWeatherAQI[currentZoneId]?.aqi || 95;
  const currentTemp = zoneWeatherAQI[currentZoneId]?.temperatureC || 32;

  // Search Ticket Handler
  const handleTicketSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSearch.trim()) return;
    const found = residentReports.find(
      (r) => r.id.toLowerCase() === ticketSearch.trim().toLowerCase()
    );
    setSearchedReport(found || 'not_found');
  };

  // WhatsApp Share Handler
  const handleShareOnWhatsApp = (title: string, id: string, status: string, location: string) => {
    const text = encodeURIComponent(
      `🚨 *Jaipur CityPulse Grievance Update*\n` +
      `📌 *Ticket:* ${id}\n` +
      `📋 *Issue:* ${title}\n` +
      `📍 *Location:* ${location}\n` +
      `⚡ *Status:* ${status.replace('_', ' ').toUpperCase()}\n` +
      `🔗 Track live on CityPulse Jaipur: ${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  // Speech Recognition Handler
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addToast({
        title: language === 'hi' ? 'वॉइस इनपुट असमर्थ' : 'Speech Not Supported',
        message:
          language === 'hi'
            ? 'आपका ब्राउज़र स्पीच रिकॉग्निशन सपोर्ट नहीं करता। कृपया क्रोम या एज का उपयोग करें।'
            : 'Speech recognition is not supported in this browser.',
        type: 'warning',
      });
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setSpeechTranscript(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--jaipur-terracotta)] via-[#C2185B] to-[#991B1B] text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold ring-1 ring-white/30">
              <HeartHandshake className="h-4 w-4 text-[#F2A93B]" />
              <span>{language === 'hi' ? 'जयपुर नागरिक सुरक्षा व सहायता हब' : 'Public Care & Citizen Welfare'}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              {language === 'hi' ? 'जन-सहायता एवं आपातकालीन केंद्र' : 'Public Care, Relief & SOS Hub'}
            </h1>
            <p className="text-sm text-white/90 leading-relaxed">
              {language === 'hi'
                ? 'आपातकालीन नंबर, निकटतम अस्पताल, सुरक्षित जलभराव-मुक्त मार्ग, कटौती पूर्व-सूचना, स्वास्थ्य परामर्श व रैन बसेरे — सभी जनहितैषी सेवाएं एक ही स्थान पर।'
                : 'Emergency quick-dials, nearest trauma hospitals, flood-safe commute alerts, scheduled outage board, and disaster shelters.'}
            </p>
          </div>

          {/* Quick SOS Highlight Dial */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="tel:112"
              className="flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-white text-rose-700 font-black text-base shadow-lg hover:bg-rose-50 transition-all cursor-pointer ring-2 ring-white/50 active:scale-95"
            >
              <ShieldAlert className="h-6 w-6 text-rose-600 animate-bounce" />
              <span>DIAL 112 (POLICE / SOS)</span>
            </a>
            <a
              href="tel:108"
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Ambulance className="h-5 w-5" />
              <span>108 (AMBULANCE)</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Feature Section Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {[
          { id: 'emergency', labelEn: '🚨 Emergency & Trauma Desk', labelHi: '🚨 आपातकाल व अस्पताल' },
          { id: 'routes', labelEn: '🛣️ Safe Commute Advisor', labelHi: '🛣️ सुरक्षित मार्ग सलाह' },
          { id: 'outages', labelEn: '⚡ 24h Outages Notice', labelHi: '⚡ कटौती पूर्व-सूचना' },
          { id: 'health', labelEn: '🫁 Health & Vulnerable Care', labelHi: '🫁 स्वास्थ्य परामर्श' },
          { id: 'shelters', labelEn: '☔ Night Shelters & Relief', labelHi: '☔ रैन बसेरे व राहत' },
          { id: 'karma', labelEn: '🏆 Gulabi Karma Badges', labelHi: '🏆 नागरिक अंक व बैज' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-3.5 py-2.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
              activeSection === tab.id
                ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] shadow-md'
                : 'bg-[var(--jaipur-surface)] border-[var(--jaipur-border)] text-[var(--jaipur-text)] hover:bg-[var(--jaipur-surface-warm)]'
            }`}
          >
            {language === 'hi' ? tab.labelHi : tab.labelEn}
          </button>
        ))}
      </div>

      {/* 3. SECTION 1: EMERGENCY HELPLINES & TRAUMA DESK */}
      {activeSection === 'emergency' && (
        <div className="space-y-6">
          {/* Quick Dials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {EMERGENCY_NUMBERS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.number}
                  className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between space-y-3 ${
                    item.highlight
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-[var(--jaipur-border)] bg-[var(--jaipur-surface)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl ${item.color} text-white shadow-xs`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-xl font-black text-[var(--jaipur-text)] tracking-wider">
                          {item.number}
                        </span>
                        <div className="text-[11px] font-bold text-[var(--jaipur-text-secondary)]">
                          {language === 'hi' ? item.nameHi : item.nameEn}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--jaipur-text-muted)] line-clamp-2">
                    {item.deptEn}
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--jaipur-border)]">
                    <a
                      href={`tel:${item.number}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[var(--jaipur-terracotta)] text-white text-xs font-bold hover:bg-[#A61045] transition-colors cursor-pointer"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>{language === 'hi' ? 'कॉल करें' : 'Direct Call'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.number)}
                      className="p-1.5 rounded-xl border border-[var(--jaipur-border)] text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] transition-colors cursor-pointer"
                      title="Copy Number"
                    >
                      {copiedPhone === item.number ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zone Hospitals & Trauma Centers */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--jaipur-border)] pb-3">
              <div className="flex items-center gap-2">
                <Ambulance className="h-5 w-5 text-rose-600" />
                <div>
                  <h3 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                    {language === 'hi'
                      ? `निकटतम आपातकालीन अस्पताल (${currentZone.nameHi})`
                      : `Nearest Trauma Centers & 24x7 Hospitals (${currentZone.nameEn})`}
                  </h3>
                  <p className="text-xs text-[var(--jaipur-text-muted)]">
                    {language === 'hi' ? 'ब्लड बैंक, आईसीयू व एम्बुलेंस सहित' : 'Verified ICU, Blood Bank, and 24x7 emergency beds'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hospitalsInZone.map((hosp, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40 p-4 space-y-2.5 hover:border-[var(--jaipur-terracotta)] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 uppercase">
                        {hosp.type}
                      </span>
                      <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] mt-1">
                        {language === 'hi' ? hosp.nameHi : hosp.nameEn}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      {hosp.timing}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--jaipur-text-muted)] flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[var(--jaipur-terracotta)] shrink-0 mt-0.5" />
                    <span>{hosp.addressEn}</span>
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--jaipur-border)]">
                    <a
                      href={`tel:${hosp.phone}`}
                      className="text-xs font-mono font-bold text-[var(--jaipur-terracotta)] flex items-center gap-1 hover:underline"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>{hosp.phone}</span>
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.nameEn + ' ' + hosp.addressEn)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--jaipur-surface)] border border-[var(--jaipur-border)] text-xs font-semibold text-[var(--jaipur-text)] hover:border-[var(--jaipur-terracotta)] transition-colors cursor-pointer"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>{language === 'hi' ? 'रास्ता देखें' : 'Get Directions'}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION 2: SAFE COMMUTE & FLOOD-FREE ROUTE ADVISOR */}
      {activeSection === 'routes' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-sky-300 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Compass className="h-6 w-6 text-sky-600" />
              <div>
                <h3 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                  {language === 'hi' ? 'जयपुर सुरक्षित आवागमन व जलभराव एडवाइजर' : 'Jaipur Safe Commute & Flood Navigation'}
                </h3>
                <p className="text-xs text-[var(--jaipur-text-secondary)]">
                  {language === 'hi'
                    ? 'नागरिक रिपोर्टों व मौसम टेलीमेट्री के आधार पर लाइव डायवर्जन और गड्ढा-मुक्त सुरक्षित रास्ते।'
                    : 'Real-time avoidance guidance for seasonal waterlogging, road cave-ins, and construction diversions.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAFE_COMMUTE_ADVISORIES.map((adv) => (
              <div
                key={adv.id}
                className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-4 space-y-3 shadow-xs hover:border-[var(--jaipur-terracotta)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 uppercase">
                    {adv.riskLevel}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--jaipur-text-muted)] uppercase">
                    {adv.zone}
                  </span>
                </div>

                <div>
                  <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)]">
                    {language === 'hi' ? adv.chokePointHi : adv.chokePointEn}
                  </h4>
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold block mb-0.5">
                      ✓ {language === 'hi' ? 'सुझाया गया सुरक्षित मार्ग:' : 'Recommended Alternate:'}
                    </span>
                    <span>{language === 'hi' ? adv.safeAlternativeHi : adv.safeAlternativeEn}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SECTION 3: 24h ADVANCE SCHEDULED OUTAGES BOARD */}
      {activeSection === 'outages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--jaipur-text-muted)]">
            <span>
              {language === 'hi'
                ? 'आगामी 24 घंटों में जल व विद्युत विभाग द्वारा निर्धारित मेंटेनेंस:'
                : 'Official 24-hour advance maintenance notice board for Jaipur utilities:'}
            </span>
            <span className="font-mono text-emerald-600 font-bold">● Active SCADA Feeder Feeds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCHEDULED_OUTAGES.map((outage) => (
              <div
                key={outage.id}
                className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      outage.type === 'water'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                    }`}
                  >
                    {outage.type === 'water' ? <Droplet className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    <span>{outage.type === 'water' ? 'Water Supply' : 'Power Grid'}</span>
                  </span>

                  <span className="text-xs font-mono text-[var(--jaipur-text-muted)] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{outage.scheduleTime}</span>
                  </span>
                </div>

                <div>
                  <h4 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                    {language === 'hi' ? outage.titleHi : outage.titleEn}
                  </h4>
                  <p className="text-xs font-semibold text-[var(--jaipur-terracotta)] mt-0.5">
                    {language === 'hi' ? outage.affectedAreaHi : outage.affectedAreaEn}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] text-xs text-[var(--jaipur-text-secondary)]">
                  <span className="font-bold text-[var(--jaipur-text)] block mb-1">
                    💡 {language === 'hi' ? 'नागरिक सलाह:' : 'Resident Advisory:'}
                  </span>
                  <span>{language === 'hi' ? outage.recommendationHi : outage.recommendationEn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SECTION 4: HEALTH & VULNERABLE CARE */}
      {activeSection === 'health' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AQI Alert Card */}
            <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--jaipur-text-muted)] uppercase tracking-wider">
                  Zone AQI Health Risk
                </span>
                <span className="font-mono text-sm font-bold text-amber-600">{currentAQI} AQI</span>
              </div>
              <h4 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                {language === 'hi' ? 'वरिष्ठ नागरिक व दमा रोगी सलाह' : 'Elderly & Asthma Patient Alert'}
              </h4>
              <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
                {currentAQI > 150
                  ? language === 'hi'
                    ? 'हवा में PM2.5 कण बढ़े हुए हैं। सुबह की सैर 7 बजे के बाद करें और मास्क का उपयोग करें।'
                    : 'Particulate levels are elevated. Morning outdoor walks are advised after 7:30 AM with a protective mask.'
                  : language === 'hi'
                  ? 'वर्तमान वायु गुणवत्ता संतोषजनक है; सामान्य बाहरी गतिविधियां सुरक्षित हैं।'
                  : 'Current air quality is satisfactory; outdoor activities are safe.'}
              </p>
            </div>

            {/* Heat & Dehydration Protocol */}
            <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--jaipur-text-muted)] uppercase tracking-wider">
                  Thermal Status
                </span>
                <span className="font-mono text-sm font-bold text-rose-600">{currentTemp}°C</span>
              </div>
              <h4 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                {language === 'hi' ? 'लू राहत व निशुल्क पेयजल केंद्र' : 'Heatwave & Hydration Stations'}
              </h4>
              <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
                {language === 'hi'
                  ? 'जयपुर नगर निगम के 45 प्रमुख चौराहों (जैसे सांगानेरी गेट, अजमेरी गेट) पर निशुल्क प्याऊ व ओआरएस काउंटर स्थापित हैं।'
                  : 'Free chilled RO drinking water and ORS kiosks are accessible across 45 major Jaipur junctions.'}
              </p>
            </div>

            {/* Pediatric Health Alert */}
            <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--jaipur-text-muted)] uppercase tracking-wider">
                  Child Welfare
                </span>
                <span className="font-mono text-xs text-emerald-600 font-bold">Safe Guidelines</span>
              </div>
              <h4 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                {language === 'hi' ? 'बाल स्वास्थ्य व मौसमी संक्रमण' : 'Pediatric Wellness & Hydration'}
              </h4>
              <p className="text-xs text-[var(--jaipur-text-secondary)] leading-relaxed">
                {language === 'hi'
                  ? 'स्कूल व खेल के दौरान पर्याप्त पानी पिएं। खुले खाद्य पदार्थों से बचें।'
                  : 'Encourage frequent hydration during school hours. Protect against seasonal vector-borne moisture.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. SECTION 5: NIGHT SHELTERS & DISASTER RELIEF (रैन बसेरे) */}
      {activeSection === 'shelters' && (
        <div className="space-y-4">
          <div className="text-xs text-[var(--jaipur-text-muted)]">
            {language === 'hi'
              ? 'नगर निगम जयपुर द्वारा संचालित 24x7 निशुल्क रैन बसेरे (Night Shelters):'
              : 'Official 24x7 municipal night shelters and extreme weather community refuge:'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {NIGHT_SHELTERS.map((sh) => (
              <div
                key={sh.id}
                className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 uppercase">
                    {sh.capacity}
                  </span>
                  <Bed className="h-4 w-4 text-[var(--jaipur-terracotta)]" />
                </div>

                <div>
                  <h4 className="font-display text-base font-bold text-[var(--jaipur-text)]">
                    {language === 'hi' ? sh.nameHi : sh.nameEn}
                  </h4>
                  <p className="text-xs text-[var(--jaipur-text-secondary)] mt-1 flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[var(--jaipur-terracotta)] shrink-0 mt-0.5" />
                    <span>{language === 'hi' ? sh.locationHi : sh.locationEn}</span>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--jaipur-surface-warm)] text-xs text-[var(--jaipur-text-muted)] leading-relaxed">
                  {language === 'hi' ? sh.amenitiesHi : sh.amenitiesEn}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--jaipur-border)]">
                  <a
                    href={`tel:${sh.phone}`}
                    className="text-xs font-mono font-bold text-[var(--jaipur-terracotta)] flex items-center gap-1 hover:underline"
                  >
                    <PhoneCall className="h-3 w-3" />
                    <span>{sh.phone}</span>
                  </a>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Free Service</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. SECTION 6: GULABI KARMA CITIZEN BADGES & WHATSAPP TRACKER */}
      {activeSection === 'karma' && (
        <div className="space-y-6">
          {/* Karma Score Header Card */}
          <div className="rounded-3xl border border-[var(--jaipur-border)] bg-gradient-to-r from-[var(--jaipur-surface-warm)] via-[var(--jaipur-surface)] to-[var(--jaipur-surface-warm)] p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F2A93B]/20 text-[#D97706] border border-[#F2A93B]/40">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gulabi Civic Points & Recognition</span>
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--jaipur-text)]">
                  {language === 'hi' ? 'गुलाबी नागरिक कर्म व सम्मान' : 'Gulabi Karma & Citizen Recognition'}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--jaipur-text-secondary)] max-w-xl">
                  {language === 'hi'
                    ? 'शहर की समस्याओं की सही रिपोर्टिंग, समाधान की पुष्टि व सहयोग करने पर अंक और सम्मान बैज प्राप्त करें।'
                    : 'Earn points and civic badges for authentic issue reporting, resolution validations, and community support.'}
                </p>
              </div>

              {/* Digital Score Card */}
              <div className="rounded-2xl border border-[var(--jaipur-terracotta)]/40 bg-[var(--jaipur-surface)] p-5 text-center shadow-md space-y-1 min-w-[200px]">
                <span className="text-[10px] uppercase font-bold text-[var(--jaipur-text-muted)] tracking-wider">
                  Your Civic Score
                </span>
                <div className="font-mono text-3xl font-black text-[var(--jaipur-terracotta)]">
                  250 <span className="text-xs text-[var(--jaipur-text-muted)]">PTS</span>
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  <span>Level 2: City Contributor</span>
                </div>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--jaipur-border)]">
              {[
                { titleEn: 'Clean Jaipur Champion', titleHi: 'स्वच्छ जयपुर प्रहरी', icon: '🧹', unlocked: true },
                { titleEn: 'Water Watcher', titleHi: 'जल रक्षक', icon: '💧', unlocked: true },
                { titleEn: 'Power Vigilante', titleHi: 'ऊर्जा मित्र', icon: '⚡', unlocked: false },
                { titleEn: 'Jaipur Civic Fellow', titleHi: 'गुलाबी नागरिक शिरोमणि', icon: '🌟', unlocked: false },
              ].map((badge, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition-all ${
                    badge.unlocked
                      ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] opacity-50'
                  }`}
                >
                  <div className="text-2xl">{badge.icon}</div>
                  <div className="font-bold text-xs text-[var(--jaipur-text)]">
                    {language === 'hi' ? badge.titleHi : badge.titleEn}
                  </div>
                  <span className="text-[10px] font-mono block text-[var(--jaipur-text-muted)]">
                    {badge.unlocked ? '✓ Unlocked' : 'Locked (500 pts)'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Voice Reporting Playground */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-[var(--jaipur-terracotta)]" />
              <div>
                <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)]">
                  {language === 'hi' ? 'बोलकर शिकायत करें (Voice-to-Text Speech Tool)' : 'Speech-to-Text Voice Reporting Tool'}
                </h4>
                <p className="text-xs text-[var(--jaipur-text-muted)]">
                  {language === 'hi' ? 'माइक बटन दबाकर हिंदी या अंग्रेजी में अपनी समस्या बोलें' : 'Click the microphone to speak your issue in Hindi or English'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer shadow-md ${
                  isListening
                    ? 'bg-rose-600 animate-pulse ring-4 ring-rose-300'
                    : 'bg-[var(--jaipur-terracotta)] hover:bg-[#A61045]'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{isListening ? (language === 'hi' ? 'सुन रहे हैं... (रोकें)' : 'Listening... (Stop)') : (language === 'hi' ? 'माइक चालू करें' : 'Start Speaking')}</span>
              </button>

              <div className="flex-1 w-full p-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)] text-xs font-mono text-[var(--jaipur-text)] min-h-[42px] flex items-center">
                {speechTranscript || (
                  <span className="text-[var(--jaipur-text-muted)]">
                    {isListening
                      ? (language === 'hi' ? 'कृपया अपनी समस्या स्पष्ट बोलें...' : 'Please speak your issue clearly...')
                      : (language === 'hi' ? 'बोले गए शब्द यहाँ प्रदर्शित होंगे...' : 'Spoken words will transcribe here...')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Live WhatsApp Tracker */}
          <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-5 space-y-4 shadow-sm">
            <h4 className="font-display text-sm font-bold text-[var(--jaipur-text)] flex items-center gap-2">
              <Share2 className="h-4 w-4 text-emerald-600" />
              <span>{language === 'hi' ? 'शिकायत खोजें व व्हाट्सऐप पर साझा करें' : 'Lookup & Share Grievance Ticket'}</span>
            </h4>

            <form onSubmit={handleTicketSearch} className="flex gap-2">
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Enter Ticket ID (e.g. JPR-2026-00089)..."
                className="flex-1 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] px-3 py-2 text-xs text-[var(--jaipur-text)] focus:outline-none focus:border-[var(--jaipur-terracotta)]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--jaipur-terracotta)] text-white text-xs font-bold hover:bg-[#A61045] transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'खोजें' : 'Search'}
              </button>
            </form>

            {searchedReport === 'not_found' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">
                Ticket not found in local or Firestore cache. Please verify the ID.
              </div>
            )}

            {searchedReport && searchedReport !== 'not_found' && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {searchedReport.id} • {searchedReport.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleShareOnWhatsApp(
                        searchedReport.title,
                        searchedReport.id,
                        searchedReport.status,
                        searchedReport.landmark || 'Jaipur'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share on WhatsApp</span>
                  </button>
                </div>
                <div className="text-xs font-bold text-[var(--jaipur-text)]">{searchedReport.title}</div>
                <div className="text-xs text-[var(--jaipur-text-muted)]">{searchedReport.description}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
