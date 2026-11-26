import { useEffect, useState } from 'react';
import { Activity, Leaf, TrendingUp, RefreshCw, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminAPI, ndviHistoryAPI } from '@/services/api';
import { toast } from 'sonner';

const healthColor = (s: number | null) => {
  if (s === null || s === undefined) return 'text-gray-500';
  if (s >= 65) return 'text-green-400';
  if (s >= 40) return 'text-yellow-400';
  return 'text-red-400';
};

const healthBgBar = (s: number | null) => {
  if (!s) return 'bg-gray-600';
  if (s >= 65) return 'bg-green-500';
  if (s >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

const ndviBar = (n: number | null) => (n != null ? Math.min(Math.round(n * 100), 100) : 0);

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return d; }
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(3)}
        </p>
      ))}
    </div>
  );
};

export default function AdminMonitoringPage() {
  const [farms, setFarms]     = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminAPI.listFarms(), ndviHistoryAPI.getAllSummary()])
      .then(([f, s]) => { setFarms(f); setSummary(s); })
      .catch(() => toast.error('Failed to load monitoring data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const merged = farms.map(farm => {
    const hist = summary.find((s: any) => s.farm_id === farm.id);
    return { ...farm, hist_ndvi: hist?.latest_ndvi, hist_health: hist?.latest_health, hist_date: hist?.latest_date };
  });

  const avgNdvi   = merged.filter(f => f.latest_ndvi != null).map(f => f.latest_ndvi);
  const avgHealth = merged.filter(f => f.latest_health != null).map(f => f.latest_health);
  const mean      = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const healthy   = merged.filter(f => (f.latest_health ?? 0) >= 65).length;
  const stressed  = merged.filter(f => f.latest_health != null && f.latest_health < 40).length;

  // Build platform-wide NDVI trend from summary (top 10 farms, sorted by date)
  const trendData = summary
    .filter(s => s.latest_ndvi != null)
    .slice(0, 15)
    .map(s => ({
      farm:   s.farm_name?.slice(0, 12) + (s.farm_name?.length > 12 ? '…' : ''),
      NDVI:   s.latest_ndvi,
      Health: s.latest_health != null ? +(s.latest_health / 100).toFixed(3) : null,
    }));

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Farm Monitoring</h1>
            <p className="text-gray-400 text-sm mt-1">Real-time NDVI and crop health overview for all registered farms</p>
          </div>
          <button
            onClick={load}
            className="h-9 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Platform-wide stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg NDVI',        value: mean(avgNdvi)?.toFixed(3) ?? '—',        icon: Leaf,          color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
            { label: 'Avg Health',      value: mean(avgHealth) != null ? `${mean(avgHealth)!.toFixed(0)}%` : '—', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'Healthy Farms',   value: healthy,                                 icon: CheckCircle,   color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
            { label: 'Stressed Farms',  value: stressed,                                icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`bg-gray-900 border ${border} rounded-xl p-4`}>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading monitoring data…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Platform NDVI bar chart */}
            {trendData.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <h2 className="text-sm font-semibold text-gray-200">Platform NDVI Overview (Latest per Farm)</h2>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ndviAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="farm" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                    <Area type="monotone" dataKey="NDVI" stroke="#16a34a" strokeWidth={2} fill="url(#ndviAreaGrad)" dot={{ fill: '#16a34a', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Farm health grid */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Individual Farm Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {merged.map(farm => (
                  <div key={farm.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-green-800/60 transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white text-sm group-hover:text-green-300 transition-colors">{farm.farm_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {farm.owner_email || 'Unowned'} &nbsp;·&nbsp;
                          <span className="text-green-400">{farm.crop_type}</span>
                        </p>
                      </div>
                      <div className={`text-sm font-bold ${healthColor(farm.latest_health)}`}>
                        {farm.latest_health?.toFixed(0) ?? '—'}%
                      </div>
                    </div>

                    {/* NDVI bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>NDVI</span>
                        <span className="text-green-400 font-mono font-semibold">{farm.latest_ndvi?.toFixed(3) ?? '—'}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${healthBgBar(farm.latest_health)}`}
                          style={{ width: `${ndviBar(farm.latest_ndvi)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {farm.latitude?.toFixed(3)}°N
                      </span>
                      <span>{fmtDate(farm.hist_date || farm.created_at)}</span>
                    </div>
                  </div>
                ))}

                {merged.length === 0 && (
                  <div className="col-span-3 py-12 text-center text-gray-500">
                    No farms registered yet
                  </div>
                )}
              </div>
            </div>

            {/* Summary table */}
            {summary.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-300">NDVI History Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-800">
                      <tr className="text-xs text-gray-500">
                        <th className="text-left px-5 py-3">Farm</th>
                        <th className="text-left px-4 py-3">Crop</th>
                        <th className="text-left px-4 py-3">Owner</th>
                        <th className="text-right px-4 py-3">Latest NDVI</th>
                        <th className="text-right px-4 py-3">Health</th>
                        <th className="text-right px-5 py-3">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {summary.map((s: any) => {
                        const farm = farms.find(f => f.id === s.farm_id);
                        return (
                          <tr key={s.farm_id} className="hover:bg-gray-800/40 transition-colors">
                            <td className="px-5 py-3 font-medium text-white">{s.farm_name}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">{s.crop_type}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{farm?.owner_email || '—'}</td>
                            <td className="px-4 py-3 text-right text-green-400 font-mono font-semibold">
                              {s.latest_ndvi?.toFixed(3) ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-xs font-semibold ${healthColor(s.latest_health)}`}>
                                {s.latest_health?.toFixed(0) ?? '—'}%
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-gray-500 text-xs">
                              {fmtDate(s.latest_date)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
