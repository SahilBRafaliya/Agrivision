import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Save, Crosshair, PenTool } from 'lucide-react';
import { DrawableMap } from './DrawableMap';

export function FarmForm({ onClose }: { onClose?: () => void }) {
  const { addFarm } = useAppStore();
  const [form, setForm] = useState({
    name: '', cropType: 'Wheat', size: '', lat: '21.1702', lng: '72.8311',
  });
  const [method, setMethod] = useState<'manual' | 'click' | 'draw'>('manual');
  const [boundary, setBoundary] = useState<any>(null);

  const handleBoundaryChange = (geojson: any, areaHa: number, centroid: { lat: number; lng: number }) => {
    setBoundary(geojson);
    setForm(p => ({
      ...p,
      lat: centroid.lat.toFixed(6),
      lng: centroid.lng.toFixed(6),
      size: areaHa > 0 ? (areaHa * 2.471).toFixed(2) : p.size, // convert ha → acres
    }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.lat || !form.lng) return;
    addFarm({
      id: `f-${Date.now()}`,
      name: form.name,
      cropType: form.cropType,
      size: parseFloat(form.size) || 0,
      latitude: parseFloat(form.lat),
      longitude: parseFloat(form.lng),
      boundary: boundary ? { type: 'Feature', geometry: boundary } : null,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setForm({ name: '', cropType: 'Wheat', size: '', lat: '', lng: '' });
    setBoundary(null);
    onClose?.();
  };

  const cropTypes = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Soybean', 'Maize'];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">Farm Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Sector A-12"
          className="h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Crop Type</label>
          <select
            value={form.cropType}
            onChange={(e) => setForm(p => ({ ...p, cropType: e.target.value }))}
            className="w-full h-9 rounded-md border border-input bg-popover px-3 text-sm"
          >
            {cropTypes.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Farm Size (acres)</label>
          <Input
            type="number"
            value={form.size}
            onChange={(e) => setForm(p => ({ ...p, size: e.target.value }))}
            placeholder="Auto from boundary"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Location Method */}
      <div>
        <label className="text-xs font-medium text-foreground mb-2 block">Location Method</label>
        <div className="flex gap-2">
          {[
            { id: 'manual' as const, icon: Crosshair, label: 'Coordinates' },
            { id: 'click'  as const, icon: MapPin,    label: 'Map Click' },
            { id: 'draw'   as const, icon: PenTool,   label: 'Draw Boundary' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                method === m.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {method === 'manual' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
            <Input
              value={form.lat}
              onChange={(e) => setForm(p => ({ ...p, lat: e.target.value }))}
              placeholder="21.1702"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
            <Input
              value={form.lng}
              onChange={(e) => setForm(p => ({ ...p, lng: e.target.value }))}
              placeholder="72.8311"
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {method === 'click' && (
        <div className="bg-muted rounded-lg p-4 text-center text-xs text-muted-foreground">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-primary" />
          Click on the dashboard map to select farm location. Coordinates will auto-populate.
        </div>
      )}

      {method === 'draw' && (
        <DrawableMap
          onBoundaryChange={handleBoundaryChange}
          initialCenter={[parseFloat(form.lng) || 72.83, parseFloat(form.lat) || 21.17]}
        />
      )}

      {boundary && (
        <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
          <PenTool className="w-3 h-3" />
          Boundary drawn — {form.size} acres calculated automatically
        </div>
      )}

      <Button onClick={handleSubmit} className="w-full h-9 text-xs">
        <Save className="w-3 h-3 mr-1" />Save Farm
      </Button>
    </div>
  );
}
