import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Activity, TrendingUp, Leaf, ArrowRight,
  AlertTriangle, CheckCircle, Plus, BarChart3, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import FarmerLayout from '@/components/layout/FarmerLayout';
import { farmerAPI, ndviHistoryAPI } from '@/services/api';
import { authAPI } from '@/services/authAPI';
import { toast } from 'sonner';

const healthColor = (s: number | null) => {
  if (s === null) return 'text-gray-400';
  if (s >= 65) return 'text-green-600';
  if (s >= 40) return 'text-amber-600';
  return 'text-red-600';
};

const ndviBarColor = (n: number | null) => {
  if (!n) return 'bg-gray-200';
  if (n >= 0.65) return 'bg-green-500';
  if (n >= 0.4)  return 'bg-amber-400';
  return 'bg-red-400';
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(3)}
        </p>
      ))}
    </div>
  );
};

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const user     = authAPI.getStoredUser();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [ndviTrend, setNdviTrend] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    farmerAPI.dashboard()
      .then(d => {
        setData(d);
        // Load NDVI trend for first farm
        if (d.farms?.length > 0) {
          const farmId = d.farms[0].farm_id;
          ndviHistoryAPI.getFarmHistory(farmId, 180)
            .then(hist => setNdviTrend(hist.slice(-20)))
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const farms  = data?.farms  || [];
  const stats  = data?.stats  || {};

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const name = data?.farmer?.name || data?.farmer?.email?.split('@')[0] || user?.full_name || 'Farmer';

  if (loading) {
    return (
      <FarmerLayout>
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </FarmerLayout>
    );
  }

  return (
    <FarmerLayout>
      <div className="p-6 space-y-6">

        {/* Hero welcome banner */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-green-600/20">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-green-100 text-sm font-medium">{greeting()},</p>
              <h1 className="text-2xl font-bold mt-0.5">{name}</h1>
              <p className="text-green-100 text-sm mt-1">
                {farms.length === 0
                  ? 'Register your first farm to start monitoring crops with satellite data.'
                  : `You have ${farms.length} farm${farms.length > 1 ? 's' : ''} under active monitoring.`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/farmer/farms')}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Farm
              </button>
              <button
                onClick={load}
                className="p-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Farms',
              value: stats.total_farms ?? 0,
              icon: MapPin,
              color: 'text-green-600',
              bg: 'bg-green-50',
              border: 'border-green-100',
              sub: 'registered locations',
            },
            {
              label: 'Avg NDVI',
              value: stats.avg_ndvi != null ? stats.avg_ndvi.toFixed(3) : '—',
              icon: Leaf,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              border: 'border-emerald-100',
              sub: 'vegetation density index',
            },
            {
              label: 'Avg Health',
              value: stats.avg_health != null ? `${stats.avg_health.toFixed(0)}%` : '—',
              icon: Activity,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              border: 'border-blue-100',
              sub: 'crop health score',
            },
          ].map(({ label, value, icon: Icon, color, bg, border, sub }) => (
            <div key={label} className={`bg-white border ${border} rounded-xl p-5 shadow-sm`}>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* NDVI trend chart — only if history data exists */}
        {ndviTrend.length > 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">NDVI Trend — {farms[0]?.farm_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Last {ndviTrend.length} satellite observations</p>
              </div>
              <BarChart3 className="w-4 h-4 text-gray-300" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={ndviTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                  tickFormatter={d => d?.slice(5)} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="ndvi_mean" name="NDVI" stroke="#16a34a" strokeWidth={2}
                  fill="url(#ndviGrad)" dot={false} activeDot={{ r: 4, fill: '#16a34a' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Farm Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Your Farms</h2>
            <button
              onClick={() => navigate('/farmer/farms')}
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {farms.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-gray-700 font-semibold">No farms registered yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your first farm to start satellite monitoring</p>
              <button
                onClick={() => navigate('/farmer/farms')}
                className="mt-5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                Register First Farm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {farms.map((farm: any) => (
                <div
                  key={farm.farm_id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{farm.farm_name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 mt-1 inline-flex items-center gap-1">
                        <Leaf className="w-3 h-3" />{farm.crop_type}
                      </span>
                    </div>
                    {farm.latest_health != null ? (
                      farm.latest_health >= 50
                        ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>NDVI</span>
                      <span className="text-gray-800 font-mono font-semibold">
                        {farm.latest_ndvi != null ? farm.latest_ndvi.toFixed(3) : '—'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ndviBarColor(farm.latest_ndvi)}`}
                        style={{ width: farm.latest_ndvi != null ? `${Math.round(farm.latest_ndvi * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>
                      Health:&nbsp;
                      <span className={`font-semibold ${healthColor(farm.latest_health)}`}>
                        {farm.latest_health != null ? `${farm.latest_health.toFixed(0)}%` : 'No data'}
                      </span>
                    </span>
                    {farm.latest_yield != null && (
                      <span className="font-medium text-gray-700">
                        {farm.latest_yield.toFixed(1)} t/ha
                      </span>
                    )}
                  </div>

                  {farm.last_updated && (
                    <p className="text-xs text-gray-400 mb-3">Updated: {fmtDate(farm.last_updated)}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/farmer/insights?farm=${farm.farm_id}`)}
                      className="flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium border border-green-200"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> AI Insights
                    </button>
                    <button
                      onClick={() => navigate(`/farmer/feedback?farm=${farm.farm_id}`)}
                      className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs rounded-lg transition-colors border border-gray-200"
                    >
                      Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}
