import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { JAIPUR_ZONES, JAIPUR_METRO_STATIONS, JAIPUR_COORDINATES } from '../../config/city';
import { getBandDetails, getPulseBand } from '../../engine/pulseScore';
import { GoogleJaipurMap } from './GoogleJaipurMap';
import { MapsGroundingExplorer } from './MapsGroundingExplorer';
import {
  Layers,
  Train,
  AlertCircle,
  Zap,
  CloudSun,
  Maximize2,
  Filter,
  Activity,
  Sparkles,
  Map as MapIcon,
  CheckCircle2,
} from 'lucide-react';

interface LayerVisibility {
  zones: boolean;
  transit: boolean;
  complaints: boolean;
  weather: boolean;
  power: boolean;
  correlations: boolean;
}

export const JaipurCityMap: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    pulseMetrics,
    events,
    correlations,
    clusters,
    selectedZoneId,
    setSelectedZoneId,
    zoneWeatherAQI,
    highlightedEventIds,
    setHighlightedEventIds,
    theme,
  } = useAppStore();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Throttled events reference to prevent rapid Leaflet DOM thrashing
  const [throttledEvents, setThrottledEvents] = useState(events);
  const eventsThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!eventsThrottleTimerRef.current) {
      eventsThrottleTimerRef.current = setTimeout(() => {
        setThrottledEvents(events);
        eventsThrottleTimerRef.current = null;
      }, 1500);
    }
    return () => {
      if (eventsThrottleTimerRef.current) {
        clearTimeout(eventsThrottleTimerRef.current);
        eventsThrottleTimerRef.current = null;
      }
    };
  }, [events]);

  // Layer groups refs to easily add/remove layers without destroying the base map
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);
  const transitLayerRef = useRef<L.LayerGroup | null>(null);
  const complaintsLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const powerLayerRef = useRef<L.LayerGroup | null>(null);
  const correlationLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer toggle state
  const [layers, setLayers] = useState<LayerVisibility>({
    zones: true,
    transit: true,
    complaints: true,
    weather: true,
    power: true,
    correlations: true,
  });

  // Map Provider toggle (Google Maps default, OpenStreetMap Leaflet Canvas fallback)
  const [mapProvider, setMapProvider] = useState<'google' | 'carto'>('google');
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number; label?: string } | null>(null);

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Initialize Leaflet Map and handle responsive resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: [JAIPUR_COORDINATES.lat, JAIPUR_COORDINATES.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Tile Layer (Standard OpenStreetMap tile layer)
    const isRaat = theme === 'raat';
    const tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      className: isRaat ? 'osm-dark-tile-filter' : '',
    }).addTo(map);
    tileLayerRef.current = tile;

    // Initialize LayerGroups
    zoneLayerRef.current = L.layerGroup().addTo(map);
    transitLayerRef.current = L.layerGroup().addTo(map);
    complaintsLayerRef.current = L.layerGroup().addTo(map);
    weatherLayerRef.current = L.layerGroup().addTo(map);
    powerLayerRef.current = L.layerGroup().addTo(map);
    correlationLayerRef.current = L.layerGroup().addTo(map);
    highlightLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Observe container size to auto-invalidate tiles on mobile/tablet/desktop resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // 1b. React to Day / Raat Theme Switch and Swap Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const isRaat = theme === 'raat';
    const newTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      className: isRaat ? 'osm-dark-tile-filter' : '',
    }).addTo(map);

    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, [theme]);

  // 2. Render Zone Polygons with Pulse Band Colors & Score Labels
  useEffect(() => {
    const layer = zoneLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.zones) return;

    JAIPUR_ZONES.forEach((zone) => {
      const zoneScore = pulseMetrics.zoneScores[zone.id] ?? 78;
      const band = getPulseBand(zoneScore);
      const bandInfo = getBandDetails(band);
      const isSelected = selectedZoneId === zone.id;

      // Leaflet bounds from zone config
      const bounds: L.LatLngBoundsExpression = [
        [zone.bounds[0].lat, zone.bounds[0].lng],
        [zone.bounds[1].lat, zone.bounds[1].lng],
      ];

      const rect = L.rectangle(bounds, {
        color: isSelected ? 'var(--jaipur-terracotta)' : bandInfo.color,
        weight: isSelected ? 3.5 : 2,
        fillColor: bandInfo.color,
        fillOpacity: isSelected ? 0.45 : 0.28,
        dashArray: isSelected ? '6, 6' : undefined,
      });

      rect.on('click', () => {
        setSelectedZoneId(zone.id);
      });

      // Name & Score Label in center of zone
      const labelText = language === 'hi' ? zone.nameHi : zone.nameEn;
      const customIcon = L.divIcon({
        className: 'custom-zone-label',
        html: `
          <div class="px-2 py-1 rounded-lg shadow-md border text-center whitespace-nowrap cursor-pointer transition-transform hover:scale-105"
               style="background-color: var(--jaipur-surface, #ffffff); border-color: ${bandInfo.color}; color: var(--jaipur-text, #2c221e);">
            <div class="text-[10px] font-bold tracking-tight">${labelText}</div>
            <div class="flex items-center justify-center gap-1 mt-0.5">
              <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${bandInfo.color};"></span>
              <span class="font-mono text-[11px] font-bold" style="color: ${bandInfo.color};">${zoneScore}</span>
              <span class="text-[9px] text-[var(--jaipur-text-muted,#777)]">/100</span>
            </div>
          </div>
        `,
        iconSize: [110, 36],
        iconAnchor: [55, 18],
      });

      const labelMarker = L.marker([zone.center.lat, zone.center.lng], {
        icon: customIcon,
      });

      labelMarker.on('click', () => {
        setSelectedZoneId(zone.id);
      });

      rect.addTo(layer);
      labelMarker.addTo(layer);
    });
  }, [pulseMetrics.zoneScores, selectedZoneId, layers.zones, language, setSelectedZoneId]);

  // 3. Render Pink Line Metro Stations & Transit Corridor
  useEffect(() => {
    const layer = transitLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.transit) return;

    // Pink Line track polyline
    const stationCoords: [number, number][] = JAIPUR_METRO_STATIONS.map((st) => [
      st.coordinates.lat,
      st.coordinates.lng,
    ]);

    const metroLine = L.polyline(stationCoords, {
      color: '#e83e8c', // Pink Line signature color
      weight: 4.5,
      opacity: 0.85,
    });
    metroLine.bindTooltip('Pink Line Metro Corridor (Mansarovar <-> Badi Chaupar)', {
      sticky: true,
    });
    metroLine.addTo(layer);

    // Metro Station Markers
    JAIPUR_METRO_STATIONS.forEach((st) => {
      const stName = language === 'hi' ? st.nameHi : st.nameEn;
      const markerIcon = L.divIcon({
        className: 'metro-station-marker',
        html: `
          <div class="w-5 h-5 rounded-full bg-white border-2 border-[#e83e8c] shadow-md flex items-center justify-center cursor-pointer hover:scale-125 transition-transform" title="${stName}">
            <div class="w-2 h-2 rounded-full bg-[#e83e8c]"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([st.coordinates.lat, st.coordinates.lng], { icon: markerIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #2c221e;">
          <strong style="color: #e83e8c;">🚇 ${stName}</strong><br/>
          <span style="font-size: 10px; color: #666;">Station #${st.stationNumber} • Pink Line</span>
        </div>
      `);
      marker.addTo(layer);
    });

    // Live Transit Events (Buses & Delays)
    const transitEvents = throttledEvents.filter((e) => e.category === 'transit' || e.source === 'metro_feed').slice(0, 15);
    transitEvents.forEach((ev) => {
      const icon = L.divIcon({
        className: 'transit-event-icon',
        html: `
          <div class="px-1.5 py-0.5 rounded shadow bg-purple-600 text-white text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer">
            <span>🚌</span>
            <span class="truncate max-w-[60px]">${ev.titleEn.split(' ')[0]}</span>
          </div>
        `,
        iconSize: [60, 18],
        iconAnchor: [30, 9],
      });

      const marker = L.marker([ev.coordinates.lat, ev.coordinates.lng], { icon });
      marker.bindPopup(`
        <div style="font-size: 11px;">
          <strong>${language === 'hi' ? ev.titleHi : ev.titleEn}</strong><br/>
          <span style="color: #666;">${ev.locationName}</span>
        </div>
      `);
      marker.addTo(layer);
    });
  }, [throttledEvents, layers.transit, language]);

  // 4. Render Citizen Complaints & Grievance Pulsing Cluster Rings
  useEffect(() => {
    const layer = complaintsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.complaints) return;

    // Pulsing Cluster Rings
    clusters.forEach((cl) => {
      const circle = L.circle([cl.centroid.lat, cl.centroid.lng], {
        radius: cl.radiusMeters,
        color: '#d97757',
        fillColor: '#d97757',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4',
      });

      circle.bindTooltip(`
        <div style="font-size: 11px;">
          <strong style="color: #d97757;">⚠️ Grievance Hotspot Cluster</strong><br/>
          <span>${cl.theme}</span><br/>
          <span style="font-size: 10px; color: #777;">${cl.eventIds.length} complaints within 500m</span>
        </div>
      `, { sticky: true });

      circle.addTo(layer);
    });

    // Recent individual complaints (last 25)
    const recentComplaints = throttledEvents
      .filter((e) => e.source === 'resident_report' || e.category === 'sanitation' || e.category === 'water')
      .slice(0, 25);

    recentComplaints.forEach((comp) => {
      const isCritical = comp.severity === 'critical';
      const color = isCritical ? '#c0392b' : '#d97757';

      const icon = L.divIcon({
        className: 'complaint-pin',
        html: `
          <div class="w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
               style="background-color: ${color};">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([comp.coordinates.lat, comp.coordinates.lng], { icon });
      marker.bindPopup(`
        <div style="font-size: 11px;">
          <strong style="color: ${color};">${language === 'hi' ? comp.titleHi : comp.titleEn}</strong><br/>
          <span>${comp.locationName}</span><br/>
          <span style="font-size: 10px; color: #777;">Severity: ${comp.severity.toUpperCase()}</span>
        </div>
      `);
      marker.addTo(layer);
    });
  }, [throttledEvents, clusters, layers.complaints, language]);

  // 5. Render Weather Stations & CPCB AQI Markers
  useEffect(() => {
    const layer = weatherLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.weather) return;

    JAIPUR_ZONES.forEach((zone) => {
      const data = zoneWeatherAQI[zone.id];
      if (!data) return;

      const icon = L.divIcon({
        className: 'weather-zone-marker',
        html: `
          <div class="px-1.5 py-0.5 rounded shadow bg-white/90 dark:bg-black/80 border border-sky-400 text-[10px] font-mono flex items-center gap-1 cursor-pointer">
            <span>${data.weatherIcon || '☀️'}</span>
            <span class="font-bold text-sky-700 dark:text-sky-300">${data.temperatureC}°</span>
            <span class="text-[9px] px-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">AQI ${data.aqi || 90}</span>
          </div>
        `,
        iconSize: [75, 20],
        iconAnchor: [37, -12], // offset below zone center
      });

      const marker = L.marker([zone.center.lat, zone.center.lng], { icon });
      marker.bindPopup(`
        <div style="font-size: 11px;">
          <strong>🌤️ ${language === 'hi' ? zone.nameHi : zone.nameEn} Ambient Sensor</strong><br/>
          <span>Temp: ${data.temperatureC}°C (Feels like: ${data.apparentTemperatureC}°C)</span><br/>
          <span>Rain: ${data.rainMm || 0}mm • Wind: ${data.windSpeedKmh} km/h</span><br/>
          <strong style="color: #d97757;">CPCB Indian AQI: ${data.aqi}</strong> (PM2.5: ${data.pm25 || '--'} µg/m³)
        </div>
      `);
      marker.addTo(layer);
    });
  }, [zoneWeatherAQI, layers.weather, language]);

  // 6. Render Power Grid Stations
  useEffect(() => {
    const layer = powerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.power) return;

    const powerEvents = throttledEvents.filter((e) => e.category === 'power' || e.source === 'power_grid').slice(0, 15);
    powerEvents.forEach((pe) => {
      const icon = L.divIcon({
        className: 'power-station-marker',
        html: `
          <div class="w-4 h-4 rounded bg-amber-500 text-white flex items-center justify-center text-[10px] shadow cursor-pointer">
            ⚡
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([pe.coordinates.lat, pe.coordinates.lng], { icon });
      marker.bindPopup(`
        <div style="font-size: 11px;">
          <strong>⚡ ${language === 'hi' ? pe.titleHi : pe.titleEn}</strong><br/>
          <span>${pe.locationName}</span><br/>
          <span style="font-size: 10px; color: #777;">JVVNL SCADA Feed</span>
        </div>
      `);
      marker.addTo(layer);
    });
  }, [throttledEvents, layers.power, language]);

  // 7. Render Dashed Lines for Correlations Between Zones
  useEffect(() => {
    const layer = correlationLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.correlations) return;

    correlations.forEach((corr) => {
      if (corr.zoneIds && corr.zoneIds.length >= 2) {
        const idA = corr.zoneIds?.[0]?.replace('_', '-');
        const idB = corr.zoneIds?.[1]?.replace('_', '-');
        const zoneA = JAIPUR_ZONES.find((z) => z.id === idA);
        const zoneB = JAIPUR_ZONES.find((z) => z.id === idB);

        if (zoneA && zoneB) {
          const polyline = L.polyline(
            [
              [zoneA.center.lat, zoneA.center.lng],
              [zoneB.center.lat, zoneB.center.lng],
            ],
            {
              color: '#d97757',
              weight: 2.8,
              dashArray: '6, 8',
              opacity: 0.9,
            }
          );

          polyline.bindTooltip(`
            <div style="font-size: 11px; max-width: 200px;">
              <strong style="color: #d97757;">🔗 ${corr.titleEn}</strong><br/>
              <span style="font-size: 10px; color: #666;">Confidence: ${(corr.confidenceScore * 100).toFixed(0)}% (${corr.confidence.toUpperCase()})</span>
            </div>
          `, { sticky: true });

          polyline.addTo(layer);
        }
      }
    });
  }, [correlations, layers.correlations]);

  // 8. Render Highlighted Evidence Events from Nabz Agent Flags (Spec 6.2)
  useEffect(() => {
    const layer = highlightLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!highlightedEventIds || highlightedEventIds.length === 0) return;

    const matchedEvents = throttledEvents.filter((e) => highlightedEventIds.includes(e.id));
    if (matchedEvents.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    matchedEvents.forEach((evt) => {
      const latLng: L.LatLngExpression = [evt.coordinates.lat, evt.coordinates.lng];
      latLngs.push(latLng);

      const icon = L.divIcon({
        className: 'flag-evidence-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer" style="width: 32px; height: 32px;">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-80"></span>
            <div class="relative w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-xs text-white font-bold">
              ⚡
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon, zIndexOffset: 1000 });
      marker.bindPopup(`
        <div style="font-size: 11px; max-width: 220px; font-family: sans-serif;">
          <div style="background: #b45309; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-bottom: 4px; display: inline-block;">
            🎯 AGENT EVIDENCE EVENT
          </div><br/>
          <strong style="font-size: 12px; color: #1c1917;">${language === 'hi' ? evt.titleHi : evt.titleEn}</strong><br/>
          <span style="color: #44403c;">📍 ${evt.locationName}</span><br/>
          <span style="font-size: 10px; color: #78716c; font-family: monospace;">[${evt.source.toUpperCase()}] • ${evt.severity.toUpperCase()}</span>
        </div>
      `);
      marker.addTo(layer);
    });

    // Pan / zoom to highlighted evidence events
    if (mapInstanceRef.current && latLngs.length > 0) {
      if (latLngs.length === 1) {
        mapInstanceRef.current.setView(latLngs[0], 14, { animate: true });
      } else {
        const bounds = L.latLngBounds(latLngs);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
      }
    }
  }, [highlightedEventIds, events, language]);

  // Reset view button handler
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([JAIPUR_COORDINATES.lat, JAIPUR_COORDINATES.lng], 12);
    }
  };

  return (
    <div id="jaipur-city-map-container" className="rounded-2xl border border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] shadow-[0_2px_8px_rgba(15,62,72,0.06)] dark:shadow-none overflow-hidden flex flex-col animate-card-fade-in hover-lift">
      {/* Map Header & Layer Toggles Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6 border-b border-[#E0F2F5] dark:border-[#521E3B] bg-white dark:bg-[#36142B]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#CCF1F4] text-[#0891B2] shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-[18px] font-bold text-[#0F3E48] dark:text-[#FFD1DC]">
              {language === 'hi' ? 'लाइव शहर नक्शा' : 'Live City Map'}
            </h3>
            <p className="text-[13px] text-[#3E6B75] dark:text-[#E3B0C4] font-medium">
              {language === 'hi'
                ? 'नक्शे पर किसी भी इलाके पर क्लिक करके स्थिति देखें'
                : 'Interactive map showing real-time traffic, weather, and area health'}
            </p>
          </div>
        </div>

        {/* Map Provider Selector (Google Maps Platform vs Leaflet Carto) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F0FCFD] dark:bg-[#280D1F] border border-[#CCF1F4] dark:border-[#521E3B] text-xs">
          <button
            type="button"
            onClick={() => setMapProvider('google')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
              mapProvider === 'google'
                ? 'bg-[#0891B2] text-white shadow-xs'
                : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Google Maps</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" title="API Key Linked"></span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMapProvider('carto');
              setTimeout(() => {
                if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
              }, 100);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 min-h-[36px] ${
              mapProvider === 'carto'
                ? 'bg-[#0891B2] text-white shadow-xs'
                : 'text-[#1F4E5A] dark:text-[#E3B0C4] hover:text-[#0F3E48]'
            }`}
          >
            <span>City Canvas</span>
          </button>
        </div>

        {/* Layer Toggles (Horizontally Scrollable) */}
        <div className="w-full max-w-full overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 text-xs flex-nowrap whitespace-nowrap min-w-max">
            <span className="text-[11px] font-semibold text-[var(--jaipur-text-muted)] mr-1 flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3" />
              {language === 'hi' ? 'परतें:' : 'Layers:'}
            </span>

            <button
              type="button"
              onClick={() => toggleLayer('zones')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                layers.zones
                  ? 'bg-[var(--jaipur-terracotta)] text-white border-[var(--jaipur-terracotta)] font-bold'
                  : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
              }`}
            >
              {language === 'hi' ? '9 इलाके' : '9 Zones'}
            </button>

            <button
              type="button"
              onClick={() => toggleLayer('transit')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                layers.transit
                  ? 'bg-[#e83e8c] text-white border-[#e83e8c] font-bold'
                  : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
              }`}
            >
              {language === 'hi' ? 'पिंक लाइन' : 'Metro'}
            </button>

            <button
              type="button"
              onClick={() => toggleLayer('complaints')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                layers.complaints
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
              }`}
            >
              {language === 'hi' ? 'शिकायतें' : 'Complaints'}
            </button>

            <button
              type="button"
              onClick={() => toggleLayer('weather')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                layers.weather
                  ? 'bg-sky-600 text-white border-sky-600 font-bold'
                  : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
              }`}
            >
              {language === 'hi' ? 'मौसम व AQI' : 'Weather & AQI'}
            </button>

            <button
              type="button"
              onClick={() => toggleLayer('correlations')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                layers.correlations
                  ? 'bg-[var(--jaipur-peacock)] text-white border-[var(--jaipur-peacock)] font-bold'
                  : 'bg-[var(--jaipur-surface)] text-[var(--jaipur-text-secondary)] border-[var(--jaipur-border)]'
              }`}
            >
              {language === 'hi' ? 'संभावित जुड़ाव' : 'Possible Links'}
            </button>

            {highlightedEventIds.length > 0 && (
              <button
                type="button"
                onClick={() => setHighlightedEventIds([])}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="Clear highlighted evidence events"
              >
                <span>⚡ Clear ({highlightedEventIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetView}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] border border-[var(--jaipur-border)] hover:bg-[var(--jaipur-surface)] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{language === 'hi' ? 'रीसेट' : 'Reset View'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas Container (60% screen height on mobile 360-430px) */}
      <div className="relative w-full h-[60vh] min-h-[380px] max-h-[620px] sm:h-[500px] z-0">
        {/* Google Maps Platform View */}
        {mapProvider === 'google' && (
          <div className="w-full h-full">
            <GoogleJaipurMap
              layers={layers}
              targetCoords={targetCoords}
              onResetView={handleResetView}
              onFallbackToCarto={() => setMapProvider('carto')}
            />
          </div>
        )}

        {/* Leaflet OpenStreetMap Canvas View */}
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ display: mapProvider === 'carto' ? 'block' : 'none' }}
        />

        {/* Style rule for dark mode filter ONLY on OpenStreetMap tiles */}
        <style>{`
          .osm-dark-tile-filter img,
          .osm-dark-tile-filter .leaflet-tile {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
          }
        `}</style>

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-[var(--jaipur-surface)]/95 backdrop-blur-md p-2.5 rounded-xl border border-[var(--jaipur-border)] shadow-md text-[10px] space-y-1.5 max-w-[210px] pointer-events-auto">
          <div className="font-bold text-[var(--jaipur-text)] uppercase tracking-wider text-[9px] border-b border-[var(--jaipur-border)] pb-1 flex items-center justify-between">
            <span>Pulse Bands Legend</span>
            <span className="text-[8px] font-mono text-emerald-600 font-bold">
              {mapProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
            <span className="text-[var(--jaipur-text)]">Calm (80–100 / शांत)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-600"></span>
            <span className="text-[var(--jaipur-text)]">Watch (60–79 / सतर्क)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-orange-600"></span>
            <span className="text-[var(--jaipur-text)]">Stressed (40–59 / तनावग्रस्त)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-600"></span>
            <span className="text-[var(--jaipur-text)]">Critical (0–39 / गंभीर)</span>
          </div>
          <div className="pt-1 border-t border-[var(--jaipur-border)]/60 text-[9px] text-[var(--jaipur-text-muted)]">
            Dashed lines = Cross-zone correlations
          </div>
        </div>
      </div>

      {/* Google Maps & Gemini Search Grounding Explorer */}
      <div className="p-3 sm:p-4 border-t border-[var(--jaipur-border)] bg-[var(--jaipur-surface-warm)]/40">
        <MapsGroundingExplorer
          onSelectLocation={(coords) => {
            setTargetCoords(coords);
            if (mapProvider === 'carto' && mapInstanceRef.current) {
              mapInstanceRef.current.setView([coords.lat, coords.lng], 14);
            }
          }}
        />
      </div>
    </div>
  );
};
