import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Leaf, Calendar, Navigation, X, Satellite, Crosshair } from 'lucide-react';
import FarmerLayout from '@/components/layout/FarmerLayout';
import { farmAPI, Farm } from '@/services/api';
import { SatelliteMapPicker } from '@/components/farm/SatelliteMapPicker';
import { toast } from 'sonner';

const CROP_TYPES = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Soybean', 'Maize'];

const CROP_COLORS: Record<string, string> = {
  Wheat: 'bg-amber-100 text-amber-700',
  Rice: 'bg-emerald-100 text-emerald-700',
  Cotton: 'bg-purple-100 text-purple-700',
  Sugarcane: 'bg-pink-100 text-pink-700',
  Soybean: 'bg-orange-100 text-orange-700',
  Maize: 'bg-teal-100 text-teal-700',
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function FarmerFarmsPage() {
  const [farms, setFarms]       = useState<Farm[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [locMethod, setLocMethod] = useState<'manual' | 'map'>('manual');
  const [boundary, setBoundary]   = useState<any>(null);
  const [form, setForm] = useState({
    farm_name: '',
    crop_type: 'Wheat',
    latitude:  '',
    longitude: '',
    size_acres: '',
  });

  const load = () => {
    setLoading(true);
    farmAPI.getFarms()
      .then(setFarms)
      .catch(() => toast.error('Failed to load farms'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (!form.farm_name.trim()) { toast.error('Farm name is required'); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast.error(locMethod === 'map' ? 'Please click the map to select a farm location' : 'Enter a valid latitude (−90 to 90)');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      toast.error(locMethod === 'map' ? 'Please click the map to select a farm location' : 'Enter a valid longitude (−180 to 180)');
      return;
    }
    setSaving(true);
    try {
      await farmAPI.addFarm({
        farm_name: form.farm_name.trim(),
        crop_type: form.crop_type,
        latitude: lat,
        longitude: lon,
        boundary_geojson: boundary || undefined,
      });
      toast.success('Farm registered successfully');
      setShowForm(false);
      setLocMethod('manual');
      setBoundary(null);
      setForm({ farm_name: '', crop_type: 'Wheat', latitude: '', longitude: '', size_acres: '' });
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register farm');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await farmAPI.deleteFarm(id);
      toast.success('Farm deleted');
      setFarms(prev => prev.filter(f => f.id !== id));
    } catch { toast.error('Failed to delete farm'); }
  };

  const inputCls = 'w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30';

  return (
    <FarmerLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Farms</h1>
            <p className="text-gray-500 text-sm mt-1">{farms.length} farm{farms.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Register Farm
          </button>
        </div>

        {/* Add Farm Form */}
        {showForm && (
          <div className="bg-white border border-green-200 rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Register New Farm</h2>
              <button onClick={() => { setShowForm(false); setLocMethod('manual'); setBoundary(null); }} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Farm Name *</label>
                  <input
                    value={form.farm_name}
                    onChange={e => setForm(p => ({ ...p, farm_name: e.target.value }))}
                    placeholder="e.g. North Field — Wheat Block"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Crop Type *</label>
                  <select
                    value={form.crop_type}
                    onChange={e => setForm(p => ({ ...p, crop_type: e.target.value }))}
                    className={inputCls}
                  >
                    {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Farm Size (acres)</label>
                  <input
                    type="number"
                    step="any"
                    value={form.size_acres}
                    onChange={e => setForm(p => ({ ...p, size_acres: e.target.value }))}
                    placeholder="Auto-filled from boundary"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Location method tabs */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Farm Location *</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLocMethod('manual')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      locMethod === 'manual'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" /> Enter Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocMethod('map')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      locMethod === 'map'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Satellite className="w-3.5 h-3.5" /> Satellite Map
                  </button>
                </div>

                {locMethod === 'manual' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Latitude *</label>
                      <input
                        type="number" step="any" min="-90" max="90"
                        value={form.latitude}
                        onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                        placeholder="e.g. 21.1458"
                        className={inputCls}
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">−90 to 90 (positive = North)</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Longitude *</label>
                      <input
                        type="number" step="any" min="-180" max="180"
                        value={form.longitude}
                        onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                        placeholder="e.g. 72.8777"
                        className={inputCls}
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">−180 to 180 (positive = East)</p>
                    </div>
                  </div>
                )}

                {locMethod === 'map' && (
                  <SatelliteMapPicker
                    onLocationSelect={(lat, lng, geojson, areaAcres) => {
                      setForm(p => ({
                        ...p,
                        latitude: lat.toFixed(6),
                        longitude: lng.toFixed(6),
                        size_acres: areaAcres ? areaAcres.toFixed(2) : p.size_acres,
                      }));
                      setBoundary(geojson ?? null);
                    }}
                  />
                )}

                {/* Show confirmed coordinates */}
                {form.latitude && form.longitude && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-xs text-green-700 font-medium font-mono">
                      {parseFloat(form.latitude).toFixed(5)}°N, {parseFloat(form.longitude).toFixed(5)}°E
                    </span>
                    {form.size_acres && (
                      <span className="ml-auto text-xs text-green-600">{form.size_acres} acres</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Registering…' : 'Register Farm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setLocMethod('manual'); setBoundary(null); }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Farm list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : farms.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-gray-700 font-semibold text-base">No farms registered yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Register Farm" to add your first farm and start satellite monitoring.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Register First Farm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {farms.map(farm => (
              <div
                key={farm.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                      {farm.farm_name}
                    </h3>
                    <span className={`text-xs px-2.5 py-0.5 mt-1.5 inline-flex items-center gap-1 rounded-full font-medium ${CROP_COLORS[farm.crop_type] || 'bg-green-100 text-green-700'}`}>
                      <Leaf className="w-3 h-3" />{farm.crop_type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(farm.id, farm.farm_name)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete farm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-gray-400" />
                    {farm.latitude.toFixed(5)}°N,&nbsp;{farm.longitude.toFixed(5)}°E
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    Registered: {fmtDate(farm.created_at)}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-gray-300 font-mono text-xs">{farm.id.slice(0, 12)}…</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}
