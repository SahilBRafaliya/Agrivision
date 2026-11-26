import { useAppStore } from '@/store/useAppStore';
import { Search, Cloud, Calendar as CalIcon, Satellite, Download, Eye } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { satelliteAPI } from '@/services/api';

export function STACExplorer() {
  const { setStacResults, setActiveScene, stacResults, searchSatellite } = useAppStore();
  const [dateRange, setDateRange] = useState({ from: '2025-01-01', to: '2025-03-07' });
  const [cloudMax, setCloudMax] = useState(30);
  const [searching, setSearching] = useState(false);
  const [bbox, setBbox] = useState({ minLon: 72.0, minLat: 20.5, maxLon: 73.5, maxLat: 22.0 });

  const handleSearch = async () => {
    setSearching(true);
    try {
      const bboxArray = [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat];
      await searchSatellite(bboxArray, dateRange.from, dateRange.to);
    } catch (error) {
      console.error('Failed to search satellite imagery:', error);
    } finally {
      setSearching(false);
    }
  };

  const handlePreviewScene = async (sceneId: string) => {
    try {
      const imageBlob = await satelliteAPI.getTrueColor(sceneId);
      const imageUrl = URL.createObjectURL(imageBlob);
      // In a real app, you'd show this in a modal or preview panel
    } catch (error) {
      console.error('Failed to preview scene:', error);
    }
  };

  const results = stacResults.length > 0 ? stacResults : [];

  return (
    <div className="h-full flex flex-col bg-popover">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Satellite className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">STAC Satellite Explorer</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Collection</label>
            <Input value="Sentinel-2 L2A" readOnly className="h-8 text-xs bg-muted border-0" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input type="date" value={dateRange.from} onChange={(e) => setDateRange(p => ({ ...p, from: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input type="date" value={dateRange.to} onChange={(e) => setDateRange(p => ({ ...p, to: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Cloud Cover: {cloudMax}%</label>
            <input type="range" min={0} max={100} value={cloudMax} onChange={(e) => setCloudMax(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bounding Box</label>
            <Input 
              value={`${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}`} 
              onChange={(e) => {
                const coords = e.target.value.split(',').map(Number);
                if (coords.length === 4 && coords.every(n => !isNaN(n))) {
                  setBbox({ minLon: coords[0], minLat: coords[1], maxLon: coords[2], maxLat: coords[3] });
                }
              }}
              className="h-8 text-xs font-mono" 
            />
          </div>
          <Button onClick={handleSearch} className="w-full h-8 text-xs" disabled={searching}>
            <Search className="w-3 h-3 mr-1" />
            {searching ? 'Searching...' : 'Search Imagery'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Search for satellite scenes above</p>
        )}
        {results.map((scene) => (
          <div key={scene.id} className="card-elevated p-3">
            <p className="text-xs font-semibold text-foreground truncate">{scene.id}</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalIcon className="w-3 h-3" />
                {new Date(scene.datetime).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Cloud: {scene.cloudCover}%
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {scene.bands.map((b) => (
                  <span key={b} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{b}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => handlePreviewScene(scene.id)}>
                <Eye className="w-3 h-3 mr-1" />Preview
              </Button>
              <Button size="sm" className="h-7 text-xs flex-1" onClick={() => setActiveScene(scene)}>
                <Download className="w-3 h-3 mr-1" />Load Scene
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
