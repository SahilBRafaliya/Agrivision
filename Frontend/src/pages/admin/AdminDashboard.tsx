import { useEffect, useState } from 'react';
import { Users, MapPin, MessageSquare, TrendingUp, Cpu, ShieldCheck, Leaf, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

const CROP_COLORS: Record<string, string> = {
  Wheat: '#f59e0b', Rice: '#10b981', Cotton: '#6366f1',
  Sugarcane: '#ec4899', Soybean: '#f97316', Maize: '#14b8a6',
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 font-medium">{label}</p>
      <p className="text-white font-bold mt-0.5">{payload[0]?.value} farms</p>
    </div>
  );
};

export default function AdminDashboard() {
  const [health, setHealth]       = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [models, setModels]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminAPI.systemHealth(), adminAPI.analytics(), adminAPI.modelStatus()])
      .then(([h, a, m]) => { setHealth(h); setAnalytics(a); setModels(m); })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const statCards = health && analytics ? [
    { label: 'Total Users',    value: health.total_users,    icon: Users,         color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'Total Farms',    value: health.total_farms,    icon: MapPin,        color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    { label: 'Total Feedback', value: health.total_feedback, icon: MessageSquare, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'Model Accuracy', value: `${analytics.feedback?.accuracy ?? 0}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Labels Ready',   value: analytics.feedback?.labeled ?? 0, icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    {
      label: 'System Status',
      value: health.status === 'healthy' ? 'Healthy' : 'Error',
      icon: ShieldCheck,
      color: health.status === 'healthy' ? 'text-green-400' : 'text-red-400',
      bg:    health.status === 'healthy' ? 'bg-green-500/10' : 'bg-red-500/10',
      border: health.status === 'healthy' ? 'border-green-500/20' : 'border-red-500/20',
    },
  ] : [];

  const cropChartData = analytics?.farms?.crop_distribution
    ? Object.entries(analytics.farms.crop_distribution).map(([crop, count]: any) => ({
        name: crop, farms: count, color: CROP_COLORS[crop] || '#6b7280',
      }))
    : [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Platform-wide overview and system health</p>
          </div>
          <button
            onClick={load}
            className="h-9 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading dashboard…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
                <div key={label} className={`bg-gray-900 border ${border} rounded-xl p-4`}>
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-white mt-1">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Crop Distribution Bar Chart */}
              {cropChartData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Leaf className="w-4 h-4 text-green-400" />
                    <h2 className="text-sm font-semibold text-gray-200">Crop Distribution</h2>
                    <span className="ml-auto text-xs text-gray-500">{analytics.farms.total} farms total</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cropChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="farms" radius={[4, 4, 0, 0]}>
                        {cropChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ML Models */}
              {models?.models && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-gray-200">ML Model Status</h2>
                  </div>
                  <div className="space-y-3">
                    {models.models.map((m: any) => {
                      const sampleLabel =
                        m.type === 'crop'  ? `${m.samples_used} HIL feedback samples` :
                        m.type === 'yield' ? `${m.samples_used} yield observations` :
                        m.type === 'ssl'   ? `${m.samples_used} analyses run` :
                        `${m.samples_used} samples`;
                      return (
                        <div key={m.name} className="bg-gray-800 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${m.trained ? 'bg-green-400' : 'bg-gray-500'}`} />
                            <div>
                              <p className="text-sm text-gray-200 font-medium">{m.name}</p>
                              <p className="text-xs text-gray-500">{sampleLabel}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              m.trained ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                            }`}>
                              {m.trained ? 'Trained' : 'Heuristic'}
                            </span>
                            {m.last_saved && <p className="text-xs text-gray-600 mt-1">{m.last_saved}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-sm">
                    <span className="text-gray-500 text-xs">Feedback ready to train</span>
                    <span className="font-bold text-indigo-400">{models.training_queue?.feedback_ready} samples</span>
                  </div>
                </div>
              )}

              {/* Feedback Analytics */}
              {analytics?.feedback && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-yellow-400" />
                    <h2 className="text-sm font-semibold text-gray-200">Feedback Analytics</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-2xl font-bold text-white">{analytics.feedback.total}</p>
                      <p className="text-xs text-gray-500 mt-1">Total</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-400">{analytics.feedback.correct}</p>
                      <p className="text-xs text-gray-500 mt-1">Correct</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-2xl font-bold text-indigo-400">{analytics.feedback.accuracy}%</p>
                      <p className="text-xs text-gray-500 mt-1">Accuracy</p>
                    </div>
                  </div>

                  {/* Accuracy bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>AI Prediction Accuracy</span>
                      <span className="text-indigo-400 font-semibold">{analytics.feedback.accuracy}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${analytics.feedback.accuracy ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NDVI Overview */}
              {analytics?.ndvi && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <h2 className="text-sm font-semibold text-gray-200">NDVI Platform Overview</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-400 font-mono">{analytics.ndvi.avg_ndvi}</p>
                      <p className="text-xs text-gray-500 mt-1">Avg NDVI</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-400">{analytics.ndvi.avg_health}%</p>
                      <p className="text-xs text-gray-500 mt-1">Avg Health</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-2xl font-bold text-white">{analytics.ndvi.total_records}</p>
                      <p className="text-xs text-gray-500 mt-1">Records</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Average Vegetation Health</span>
                      <span className="text-blue-400 font-semibold">{analytics.ndvi.avg_health}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                        style={{ width: `${analytics.ndvi.avg_health ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
