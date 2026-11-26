import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// @ts-ignore
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import { MapPin, PenTool } from 'lucide-react';

interface Props {
  onLocationSelect: (lat: number, lng: number, boundary?: any, areaAcres?: number) => void;
  initialCenter?: [number, number]; // [lng, lat]
}

const SAT_STYLE = {
  version: 8 as const,
  sources: {
    sat: {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'sat', type: 'raster' as const, source: 'sat' }],
};

type Mode = 'pin' | 'draw';

export function SatelliteMapPicker({ onLocationSelect, initialCenter = [72.83, 21.17] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const markerRef    = useRef<maplibregl.Marker | null>(null);
  const drawRef      = useRef<any>(null);

  const [mode, setMode]           = useState<Mode>('pin');
  const [pinned, setPinned]       = useState(false);
  const [hasBoundary, setHasBoundary] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: SAT_STYLE as any,
      center: initialCenter,
      zoom: 13,
    });
    mapRef.current = m;
    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    m.on('click', (e) => {
      if (drawRef.current) return;
      const { lng, lat } = e.lngLat;
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: '#16a34a' })
          .setLngLat([lng, lat])
          .addTo(m);
      }
      setPinned(true);
      onLocationSelect(lat, lng);
    });

    return () => { m.remove(); mapRef.current = null; };
  }, []);

  const activateDraw = () => {
    const m = mapRef.current;
    if (!m || drawRef.current) return;

    markerRef.current?.remove();
    markerRef.current = null;
    setPinned(false);

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: 'draw_polygon',
    });
    drawRef.current = draw;
    (m as any).addControl(draw);
    setMode('draw');
    setHasBoundary(false);

    const handleDraw = () => {
      const data = draw.getAll();
      if (!data.features.length) { setHasBoundary(false); return; }
      const feat = data.features[0];
      const areaAcres = (turf.area(feat) / 10000) * 2.471;
      const [lng, lat] = turf.centroid(feat).geometry.coordinates;
      setHasBoundary(true);
      onLocationSelect(lat, lng, feat.geometry, areaAcres);
    };

    m.on('draw.create', handleDraw);
    m.on('draw.update', handleDraw);
    m.on('draw.delete', () => setHasBoundary(false));
  };

  const activatePin = () => {
    const m = mapRef.current;
    if (!m) return;
    if (drawRef.current) {
      m.removeControl(drawRef.current);
      drawRef.current = null;
    }
    setMode('pin');
    setHasBoundary(false);
  };

  const statusText = () => {
    if (mode === 'draw') {
      return hasBoundary
        ? 'Boundary drawn — centroid is set as farm location'
        : 'Click corners of your farm to draw a boundary polygon, then click the first point to close';
    }
    return pinned
      ? 'Location pinned — click elsewhere on the map to adjust'
      : 'Click anywhere on the satellite map to pin your farm location';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={activatePin}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            mode === 'pin'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Click to Pin
        </button>
        <button
          type="button"
          onClick={activateDraw}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            mode === 'draw'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" /> Draw Boundary
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ width: '100%', height: 300, borderRadius: 8, overflow: 'hidden', border: '1px solid #d1d5db' }}
      />

      <p className={`text-xs text-center ${(pinned || hasBoundary) ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
        {statusText()}
      </p>
    </div>
  );
}
