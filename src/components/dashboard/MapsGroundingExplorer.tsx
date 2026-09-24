import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  MapPin,
  Search,
  Sparkles,
  Navigation,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Compass,
} from 'lucide-react';

interface GroundingResult {
  text: string;
  grounded?: boolean;
  model?: string;
  fallback?: boolean;
  groundingMetadata?: any;
}

interface MapsGroundingExplorerProps {
  onSelectLocation?: (coords: { lat: number; lng: number; label: string }) => void;
}

const PRESET_PLACES = [
  {
    nameEn: 'Hawa Mahal & Walled City',
    nameHi: 'हवा महल एवं चारदीवारी',
    query: 'Hawa Mahal, Badi Chaupar, Walled City Jaipur',
    coords: { lat: 26.9239, lng: 75.8267 },
  },
  {
    nameEn: 'SMS Hospital Medical Hub',
    nameHi: 'एसएमएस अस्पताल मेडिकल हब',
    query: 'Sawai Man Singh (SMS) Hospital, Tonk Road, Jaipur',
    coords: { lat: 26.8928, lng: 75.8152 },
  },
  {
    nameEn: 'Sindhi Camp Intercity Transit',
    nameHi: 'सिंधी कैंप केंद्रीय बस टर्मिनल',
    query: 'Sindhi Camp Central Bus Stand, Station Road, Jaipur',
    coords: { lat: 26.9231, lng: 75.7997 },
  },
  {
    nameEn: 'Mansarovar Metro Terminal',
    nameHi: 'मानसरोवर मेट्रो टर्मिनल',
    query: 'Mansarovar Metro Station, Bhrigu Path, Jaipur',
    coords: { lat: 26.8661, lng: 75.7601 },
  },
  {
    nameEn: 'Amer Fort & Heritage Corridor',
    nameHi: 'आमेर किला एवं विरासत क्षेत्र',
    query: 'Amer Fort, Devisinghpura, Amer, Jaipur',
    coords: { lat: 26.9855, lng: 75.8513 },
  },
  {
    nameEn: 'Nagar Nigam HQ (Lal Kothi)',
    nameHi: 'नगर निगम मुख्यालय (लाल कोठी)',
    query: 'Jaipur Municipal Corporation Nagar Nigam Headquarters, Lal Kothi, Tonk Road, Jaipur',
    coords: { lat: 26.892, lng: 75.803 },
  },
];

export const MapsGroundingExplorer: React.FC<MapsGroundingExplorerProps> = ({
  onSelectLocation,
}) => {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'maps' | 'search'>('maps');
  const [result, setResult] = useState<GroundingResult | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string, type: 'maps' | 'search' = activeTab) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const endpoint =
      type === 'maps' ? '/api/gemini/maps-grounding' : '/api/gemini/search-grounding';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        throw new Error(`Service returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch grounded civic information');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_PLACES[0]) => {
    setSelectedPreset(preset.nameEn);
    setQuery(preset.query);
    if (onSelectLocation) {
      onSelectLocation({
        lat: preset.coords.lat,
        lng: preset.coords.lng,
        label: language === 'hi' ? preset.nameHi : preset.nameEn,
      });
    }
    handleSearch(preset.query, activeTab);
  };

  return (
    <div className="bg-white dark:bg-[var(--jaipur-surface)] border border-[#CCF1F4] dark:border-[var(--jaipur-border)] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CCF1F4] dark:border-[var(--jaipur-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#CCF1F4] text-[#0891B2]">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-[#0F3E48] dark:text-[var(--jaipur-text)] flex items-center gap-1.5">
              <span>{language === 'hi' ? 'जयपुर गूगल मैप्स एवं खोज ग्राउंडिंग' : 'Jaipur Maps & Search Grounding'}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                Live Grounded
              </span>
            </h4>
            <p className="text-[11px] text-[#3E6B75] dark:text-[var(--jaipur-text-secondary)] font-medium">
              {language === 'hi'
                ? 'गूगल मैप्स और सर्च डेटा से सत्यापित जयपुर नगर निगम एवं भौगोलिक स्थिति'
                : 'Verified municipal locations and live city intelligence powered by Google Maps and Gemini'}
            </p>
          </div>
        </div>

        {/* Mode Toggle: Maps Grounding vs Search Grounding */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F0FCFD] dark:bg-[var(--jaipur-surface-warm)] border border-[#CCF1F4] dark:border-[var(--jaipur-border)] text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('maps');
              if (query) handleSearch(query, 'maps');
            }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'maps'
                ? 'bg-[#0891B2] text-white shadow-xs'
                : 'text-[#3E6B75] hover:text-[#0F3E48] dark:text-[var(--jaipur-text-secondary)] dark:hover:text-[var(--jaipur-text)]'
            }`}
          >
            <MapPin className="h-3 w-3" />
            <span>Maps Grounding</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('search');
              if (query) handleSearch(query, 'search');
            }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'search'
                ? 'bg-[#0891B2] text-white shadow-xs'
                : 'text-[#3E6B75] hover:text-[#0F3E48] dark:text-[var(--jaipur-text-secondary)] dark:hover:text-[var(--jaipur-text)]'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Live Search</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-[#3E6B75] dark:text-[var(--jaipur-text-muted)] flex items-center gap-1">
          <Navigation className="h-3 w-3" />
          <span>{language === 'hi' ? 'त्वरित स्थान (Quick Jaipur Landmarks):' : 'Key Municipal Landmarks:'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PLACES.map((p) => {
            const isSelected = selectedPreset === p.nameEn;
            return (
              <button
                key={p.nameEn}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0891B2] text-white border-[#0891B2] shadow-xs'
                    : 'bg-[#F0FCFD] dark:bg-[var(--jaipur-surface-warm)] text-[#1F4E5A] dark:text-[var(--jaipur-text)] border-[#CCF1F4] dark:border-[var(--jaipur-border)] hover:border-[#0891B2]'
                }`}
              >
                {language === 'hi' ? p.nameHi : p.nameEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#3E6B75]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              activeTab === 'maps'
                ? language === 'hi'
                  ? 'जयपुर का कोई भी स्थान या वार्ड खोजें (उदा. सांगानेर मंडी, अजमेरी गेट)...'
                  : 'Search any Jaipur landmark, ward, or metro node (e.g., Albert Hall, Bapu Bazaar)...'
                : language === 'hi'
                ? 'जयपुर यातायात या नागरिक सूचना खोजें (उदा. आज का मौसम, मेट्रो डायवर्जन)...'
                : 'Search live Jaipur civic advisories, weather alert, traffic diversion...'
            }
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#F0FCFD] dark:bg-[var(--jaipur-surface-warm)] border border-[#CCF1F4] dark:border-[var(--jaipur-border)] text-[#1F4E5A] dark:text-[var(--jaipur-text)] placeholder:text-[#3E6B75] focus:outline-hidden focus:ring-2 focus:ring-[#0891B2]/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D9707E] hover:bg-[#C2185B] text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{language === 'hi' ? 'खोज जारी...' : 'Querying...'}</span>
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'जांचें' : 'Inspect'}</span>
            </>
          )}
        </button>
      </form>

      {/* Result Display */}
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="p-3 rounded-xl bg-[#F0FCFD] dark:bg-[var(--jaipur-surface-warm)] border border-[#CCF1F4] dark:border-[var(--jaipur-border)] space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-[#CCF1F4] dark:border-[var(--jaipur-border)]/60 pb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0891B2]">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>
                {activeTab === 'maps'
                  ? 'Grounded Location Intelligence (Google Maps Grounding)'
                  : 'Live Web Grounded Civic Advisory (Google Search)'}
              </span>
            </div>
            {result.model && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[var(--jaipur-surface)] border border-[#CCF1F4] dark:border-[var(--jaipur-border)] text-[#3E6B75] dark:text-[var(--jaipur-text-muted)]">
                {result.model}
              </span>
            )}
          </div>

          <div className="text-[#1F4E5A] dark:text-[var(--jaipur-text)] leading-relaxed whitespace-pre-line text-xs font-normal">
            {result.text}
          </div>

          {result.groundingMetadata?.webSearchQueries && (
            <div className="pt-2 border-t border-[#CCF1F4] dark:border-[var(--jaipur-border)]/40 flex flex-wrap gap-1 text-[10px] text-[#3E6B75] dark:text-[var(--jaipur-text-muted)]">
              <span className="font-semibold text-[#0F3E48]">Sources:</span>
              {result.groundingMetadata.webSearchQueries.map((q: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-white dark:bg-[var(--jaipur-surface)] border border-[#CCF1F4] dark:border-[var(--jaipur-border)]">
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
