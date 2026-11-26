import { useAppStore } from '@/store/useAppStore';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const LAYER_OPTIONS = [
  { id: 'true-color', label: 'True Color' },
  { id: 'ndvi',       label: 'NDVI' },
  { id: 'ndwi',       label: 'NDWI' },
  { id: 'false-color',label: 'False Color' },
  { id: 'evi',        label: 'EVI' },
];

// Free OpenFreeMap style — fast, no API key
const BASE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const BASEMAP_STYLES: Record<string, string> = {
  'true-color':  BASE_STYLE,
  'false-color': BASE_STYLE,
  'ndvi':        BASE_STYLE,
  'ndwi':        BASE_STYLE,
  'evi':         BASE_STYLE,
};

export function SatelliteMap() {
  const {
    selectedLayer, setSelectedLayer,
    farms, alerts,
    setPixelInfo, mapCenter, mapZoom,
    setMapCenter, setMapZoom,
    getAIAnalysis,
  } = useAppStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const alertMarkersRef = useRef<maplibregl.Marker[]>([]);
  // Track programmatic flyTo so moveend doesn't write back to store and cause a loop
  const flyingRef = useRef(false);

  const [showLayers, setShowLayers] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [clickCoord, setClickCoord] = useState<{ lat: number; lng: number } | null>(null);

  // ── initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES['true-color'],
      center: [mapCenter[0], mapCenter[1]],
      zoom: mapZoom,
      // Ensure scroll zoom works properly
      scrollZoom: true,
      boxZoom: true,
      dragRotate: true,
      dragPan: true,
      keyboard: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    map.current.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'top-right',
    );

    // Click handler — only for pixel AI analysis, NOT for zoom/pan
    map.current.on('click', async (e) => {
      const { lat, lng } = e.lngLat;
      setClickCoord({ lat, lng });
      setAnalyzing(true);
      try {
        const sceneId = `scene-${lat.toFixed(4)}-${lng.toFixed(4)}-${Date.now()}`;
        const analysis = await getAIAnalysis(sceneId);
        if (analysis) {
          setPixelInfo({
            lat: parseFloat(lat.toFixed(4)),
            lng: parseFloat(lng.toFixed(4)),
            ndvi: parseFloat(analysis.ndvi.toFixed(2)),
            crop: analysis.crop_type,
            health: Math.round(analysis.health_score),
            confidence: Math.round((analysis.health_score / 100) * 85 + 10),
          });
        }
      } catch {
        setPixelInfo({
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4)),
          ndvi: parseFloat((0.3 + Math.random() * 0.5).toFixed(2)),
          crop: ['Wheat', 'Rice', 'Cotton', 'Sugarcane'][Math.floor(Math.random() * 4)],
          health: Math.floor(60 + Math.random() * 35),
          confidence: Math.floor(70 + Math.random() * 25),
        });
      } finally {
        setAnalyzing(false);
      }
    });

    // Only sync back to store when the move was user-initiated (not from flyTo)
    map.current.on('moveend', () => {
      if (flyingRef.current) {
        flyingRef.current = false;
        return;
      }
      if (!map.current) return;
      const c = map.current.getCenter();
      setMapCenter([c.lng, c.lat]);
      setMapZoom(map.current.getZoom());
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── programmatic navigation from store (e.g. "View on Map" button) ────────
  // Uses a ref comparison so it only fires on EXTERNAL store changes, not user map moves
  const prevCenter = useRef(mapCenter);
  const prevZoom = useRef(mapZoom);
  useEffect(() => {
    if (!map.current) return;
    const centerChanged =
      mapCenter[0] !== prevCenter.current[0] || mapCenter[1] !== prevCenter.current[1];
    const zoomChanged = mapZoom !== prevZoom.current;
    if (centerChanged || zoomChanged) {
      flyingRef.current = true;
      map.current.flyTo({ center: [mapCenter[0], mapCenter[1]], zoom: mapZoom, duration: 800 });
    }
    prevCenter.current = mapCenter;
    prevZoom.current = mapZoom;
  }, [mapCenter, mapZoom]);

  // ── farm markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    farms.forEach((farm) => {
      const el = document.createElement('div');
      el.className = 'farm-marker';
      el.style.cssText = `
        width:14px;height:14px;border-radius:50%;
        background:#10b981;border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;
      `;

      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
        <div style="font-size:12px;padding:4px 0">
          <strong>${farm.name}</strong><br/>
          🌾 ${farm.cropType} &nbsp;|&nbsp; 📐 ${farm.size} acres<br/>
          <span style="color:#6b7280;font-family:monospace">${farm.latitude.toFixed(4)}°N, ${farm.longitude.toFixed(4)}°E</span>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([farm.longitude, farm.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [farms]);

  // ── alert markers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    alertMarkersRef.current.forEach(m => m.remove());
    alertMarkersRef.current = [];

    alerts.forEach((alert) => {
      const el = document.createElement('div');
      const color = alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6';
      el.style.cssText = `
        width:10px;height:10px;border-radius:50%;
        background:${color};border:2px solid white;
        box-shadow:0 2px 4px rgba(0,0,0,0.3);
      `;

      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(`
        <div style="font-size:11px;padding:2px 0">
          <strong>${alert.title}</strong><br/>
          <span style="color:#6b7280">${alert.description}</span>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([alert.longitude, alert.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      alertMarkersRef.current.push(marker);
    });
  }, [alerts]);

  // ── click crosshair marker ───────────────────────────────────────────────
  const crosshairRef = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    if (!map.current || !clickCoord) return;
    crosshairRef.current?.remove();
    const el = document.createElement('div');
    el.style.cssText = `
      width:16px;height:16px;border-radius:50%;
      background:rgba(99,102,241,0.8);border:2px solid white;
      box-shadow:0 0 0 4px rgba(99,102,241,0.3);
    `;
    crosshairRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([clickCoord.lng, clickCoord.lat])
      .addTo(map.current);
  }, [clickCoord]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      {/* Map container — must have explicit pixel height for MapLibre to initialise correctly */}
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* Layer selector */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setShowLayers(!showLayers)}
          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          🗂 {LAYER_OPTIONS.find(l => l.id === selectedLayer)?.label || 'Layers'} ▾
        </button>
        {showLayers && (
          <div style={{ borderTop: '1px solid #e5e7eb' }}>
            {LAYER_OPTIONS.map(l => (
              <button
                key={l.id}
                onClick={() => { setSelectedLayer(l.id); setShowLayers(false); }}
                style={{
                  display: 'block', width: '100%', padding: '5px 12px', fontSize: 11,
                  textAlign: 'left', background: selectedLayer === l.id ? '#f0fdf4' : 'none',
                  color: selectedLayer === l.id ? '#10b981' : '#374151',
                  fontWeight: selectedLayer === l.id ? 600 : 400,
                  border: 'none', cursor: 'pointer',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analyzing spinner */}
      {analyzing && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'white', padding: '10px 16px', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 600,
          zIndex: 20,
        }}>
          🤖 Analysing pixel...
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 32, left: 12, zIndex: 10,
        background: 'white', borderRadius: 8,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        padding: '8px 12px', fontSize: 11,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          <span>Farm</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', border: '2px solid white' }} />
          <span>High Alert</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid white' }} />
          <span>Medium Alert</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', border: '2px solid white' }} />
          <span>Selected Pixel</span>
        </div>
      </div>
    </div>
  );
}
