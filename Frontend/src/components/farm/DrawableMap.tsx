import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// @ts-ignore — mapbox-gl-draw works with maplibre-gl at runtime
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';

interface Props {
  onBoundaryChange: (geojson: any, areaHa: number, centroid: { lat: number; lng: number }) => void;
  initialCenter?: [number, number]; // [lng, lat]
}

export function DrawableMap({ onBoundaryChange, initialCenter = [72.83, 21.17] }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: initialCenter,
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: 'draw_polygon',
    });

    // @ts-ignore
    map.current.addControl(draw.current);

    const handleDrawUpdate = () => {
      if (!draw.current) return;
      const data = draw.current.getAll();
      if (!data.features.length) return;

      const feature = data.features[0];
      const areaM2 = turf.area(feature);
      const areaHa = areaM2 / 10000;
      const centroidFeature = turf.centroid(feature);
      const [lng, lat] = centroidFeature.geometry.coordinates;

      onBoundaryChange(feature.geometry, areaHa, { lat, lng });
    };

    map.current.on('draw.create', handleDrawUpdate);
    map.current.on('draw.update', handleDrawUpdate);
    map.current.on('draw.delete', () => {
      onBoundaryChange(null, 0, { lat: initialCenter[1], lng: initialCenter[0] });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div>
      <div ref={mapContainer} style={{ width: '100%', height: 260, borderRadius: 8, overflow: 'hidden' }} />
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Click on the map to draw your farm boundary polygon. Click the first point to close.
      </p>
    </div>
  );
}
