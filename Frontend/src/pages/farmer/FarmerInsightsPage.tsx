import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Brain, AlertTriangle, CheckCircle, Droplets, Leaf,
  TrendingUp, RefreshCw, BarChart3, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import FarmerLayout from '@/components/layout/FarmerLayout';
import { farmAPI, farmerAPI, ndviHistoryAPI, Farm } from '@/services/api';
import { toast } from 'sonner';

const severityStyle: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  high:     'bg-orange-50 border-orange-200 text-orange-700',
  medium:   'bg-amber-50 border-amber-200 text-amber-700',
  low:      'bg-blue-50 border-blue-200 text-blue-700',
};

const severityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-500',
  low:      'bg-blue-500',
};

const ndviStatusStyle = (level: string) => {
  if (level === 'excellent' || level === 'good') return 'bg-green-100 text-green-700 border-green-200';
  if (level === 'fair' || level === 'moderate')  return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

const ndviBarColor = (n: number) => {
  if (n >= 0.65) return 'bg-green-500';
  if (n >= 0.5)  return 'bg-lime-500';
  if (n >= 0.35) return 'bg-amber-400';
  if (n >= 0.2)  return 'bg-orange-400';
  return 'bg-red-500';
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(3)}
        </p>
      ))}
    </div>
  );
};

export default function FarmerInsightsPage() {
  const [searchParams]   = useSearchParams();
  const [farms, setFarms]             = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [insights, setInsights]       = useState<any>(null);
  const [history, setHistory]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    farmAPI.getFarms().then(f => {
      setFarms(f);
      const pre = searchParams.get('farm') || f[0]?.id || '';
      if (pre) { setSelectedFarm(pre); loadInsights(pre); }
    });
  }, []);

  const loadInsights = (farmId: string) => {
    if (!farmId) return;
    setInsights(null); setHistory([]); setLoading(true);
    Promise.all([
      farmerAPI.insights(farmId),
      ndviHistoryAPI.getFarmHistory(farmId, 180),
    ])
      .then(([ins, hist]) => { setInsights(ins); setHistory(hist); })
      .catch(() => toast.error('Failed to load insights'))
      .finally(() => setLoading(false));
  };

  const an      = insights?.analysis;
  const insight = insights?.insights;
  const chartData = history.slice(-24).map(r => ({
    date:         r.date?.slice(5) ?? r.date,
    NDVI:         r.ndvi_mean,
    NDWI:         r.ndwi_mean,
    'Health %':   r.health_score ? r.health_score / 100 : null,
  }));

  return (
    <FarmerLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
            <p className="text-gray-500 text-sm mt-1">Satellite-based crop health analysis &amp; recommendations</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedFarm}
              onChange={e => { setSelectedFarm(e.target.value); loadInsights(e.target.value); }}
              className="h-9 px-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Select farm…</option>
              {farms.map(f => <option key={f.id} value={f.id}>{f.farm_name}</option>)}
            </select>
            <button
              onClick={() => loadInsights(selectedFarm)}
              disabled={!selectedFarm || loading}
              className="h-9 w-9 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!selectedFarm && (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-gray-700 font-semibold">Select a farm to view AI insights</p>
            <p className="text-gray-400 text-sm mt-1">Real-time analysis powered by Sentinel-2 satellite imagery</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Analysing satellite data…</p>
            <p className="text-gray-400 text-sm mt-1">Loading vegetation indices, AI predictions &amp; recommendations</p>
          </div>
        )}

        {insights && an && !loading && (
          <>
            {/* Farm header */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">{insights.farm?.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {insights.farm?.latitude?.toFixed(4)}°N, {insights.farm?.longitude?.toFixed(4)}°E &nbsp;·&nbsp; Crop: {insights.farm?.crop_type}
                </p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${ndviStatusStyle(insight?.ndvi_status?.level)}`}>
                {insight?.ndvi_status?.label}
              </span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'NDVI',         value: an.ndvi?.toFixed(3),                      icon: Leaf,       color: 'text-green-600',  bg: 'bg-green-50',  bar: true, ndvi: an.ndvi },
                { label: 'NDWI',         value: an.ndwi?.toFixed(3),                      icon: Droplets,   color: 'text-blue-600',   bg: 'bg-blue-50' },
                { label: 'Health Score', value: `${an.health_score?.toFixed(0)}%`,         icon: CheckCircle,color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Est. Yield',   value: `${an.yield_prediction?.toFixed(1)} t/ha`, icon: TrendingUp, color: 'text-amber-600',  bg: 'bg-amber-50' },
              ].map(({ label, value, icon: Icon, color, bg, bar, ndvi }: any) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{value}</p>
                  {bar && ndvi != null && (
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${ndviBarColor(ndvi)}`} style={{ width: `${Math.round(ndvi * 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* NDVI History Chart */}
            {chartData.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm">Vegetation Index History</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Last {chartData.length} satellite passes (up to 180 days)</p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-gray-300" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[-0.5, 1]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="NDVI" stroke="#16a34a" strokeWidth={2}
                      dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="NDWI" stroke="#2563eb" strokeWidth={2}
                      dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Issues */}
            {insight?.issues?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Issues Detected
                </h2>
                <div className="space-y-2">
                  {insight.issues.map((issue: any, i: number) => (
                    <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${severityStyle[issue.severity] || severityStyle.low}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[issue.severity] || severityDot.low}`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{issue.issue}</p>
                        <p className="text-xs opacity-80 mt-0.5">{issue.detail}</p>
                      </div>
                      <span className="text-xs uppercase font-bold opacity-50 flex-shrink-0 pt-0.5">{issue.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Recommendations
              </h2>
              <div className="space-y-3">
                {insight?.recommendations?.map((rec: any, i: number) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3 hover:border-green-200 transition-colors">
                    <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      {rec.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{rec.action}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{rec.detail}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 flex-shrink-0 font-medium">
                      {rec.effort}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expected Outcomes */}
            {insight?.expected_outcomes?.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Expected Outcomes
                </h2>
                <div className="space-y-2">
                  {insight.expected_outcomes.map((o: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-green-800">{o}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Model Output */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" /> AI Model Output
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  ['Predicted Crop',   an.predicted_crop],
                  ['Confidence',       `${(an.confidence * 100).toFixed(0)}%`],
                  ['Healthy Pixels',   `${an.health_breakdown?.healthy_percentage?.toFixed(1)}%`],
                  ['Stressed Pixels',  `${an.health_breakdown?.stressed_percentage?.toFixed(1)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{k}</p>
                    <p className="text-gray-900 font-bold mt-0.5">{v ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </FarmerLayout>
  );
}
