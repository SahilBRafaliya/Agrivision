import { useEffect, useState } from 'react';
import { FileText, Download, Leaf, Activity, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import FarmerLayout from '@/components/layout/FarmerLayout';
import { farmAPI, farmerAPI, feedbackAPI, ndviHistoryAPI, Farm } from '@/services/api';
import { toast } from 'sonner';

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }); }
  catch { return d; }
};

const healthBg = (s: number | null) => {
  if (!s) return 'bg-gray-100 text-gray-500';
  if (s >= 65) return 'bg-green-100 text-green-700';
  if (s >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value != null ? p.value.toFixed(3) : '—'}
        </p>
      ))}
    </div>
  );
};

export default function FarmerReportsPage() {
  const [farms, setFarms]     = useState<Farm[]>([]);
  const [selected, setSelected] = useState('');
  const [days, setDays]       = useState(90);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    farmAPI.getFarms().then(f => { setFarms(f); if (f[0]) setSelected(f[0].id); });
  }, []);

  const loadPreview = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const [insights, history, feedback] = await Promise.all([
        farmerAPI.insights(selected),
        ndviHistoryAPI.getFarmHistory(selected, days),
        feedbackAPI.getFarmFeedback(selected),
      ]);
      setPreview({ insights, history, feedback, farm: farms.find(f => f.id === selected) });
    } catch { toast.error('Failed to load report data'); }
    finally { setLoading(false); }
  };

  const downloadText = () => {
    if (!preview) return;
    const { insights, history, feedback, farm } = preview;
    const an = insights?.analysis;
    const lines = [
      '══════════════════════════════════════════',
      '          AgriVision AI — Farm Report',
      '══════════════════════════════════════════',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `FARM: ${farm?.farm_name}`,
      `Crop: ${farm?.crop_type}  |  Location: ${farm?.latitude?.toFixed(4)}°N, ${farm?.longitude?.toFixed(4)}°E`,
      '',
      '── AI ANALYSIS SUMMARY ──────────────────',
      `NDVI:           ${an?.ndvi?.toFixed(3) ?? '—'}`,
      `NDWI:           ${an?.ndwi?.toFixed(3) ?? '—'}`,
      `EVI:            ${an?.evi?.toFixed(3)  ?? '—'}`,
      `Health Score:   ${an?.health_score?.toFixed(0) ?? '—'}%`,
      `Yield Estimate: ${an?.yield_prediction?.toFixed(1) ?? '—'} t/ha`,
      `Predicted Crop: ${an?.predicted_crop ?? '—'} (${an?.confidence != null ? `${(an.confidence * 100).toFixed(0)}%` : '—'} confidence)`,
      '',
      `STATUS: ${insights?.insights?.ndvi_status?.label ?? '—'}`,
      '',
      '── ISSUES DETECTED ──────────────────────',
      ...(insights?.insights?.issues?.length
          ? insights.insights.issues.map((i: any) => `  [${i.severity.toUpperCase()}] ${i.issue}: ${i.detail}`)
          : ['  No critical issues detected']),
      '',
      '── RECOMMENDATIONS ──────────────────────',
      ...(insights?.insights?.recommendations || []).map((r: any) => `  ${r.priority}. ${r.action} — ${r.detail} (${r.effort})`),
      '',
      '── EXPECTED OUTCOMES ────────────────────',
      ...(insights?.insights?.expected_outcomes || []).map((o: string) => `  • ${o}`),
      '',
      `── NDVI HISTORY (last ${days} days) ─────`,
      'Date          NDVI    NDWI    Health  Yield',
      ...history.slice(-15).map((r: any) =>
        `${r.date}  ${r.ndvi_mean?.toFixed(3) ?? '—'}   ${r.ndwi_mean?.toFixed(3) ?? '—'}   ${r.health_score?.toFixed(0) ?? '—'}%    ${r.yield_prediction?.toFixed(1) ?? '—'} t/ha`
      ),
      '',
      '── FEEDBACK SUMMARY ─────────────────────',
      `Total:    ${feedback.length}`,
      `Correct:  ${feedback.filter((f: any) => f.correct_prediction).length}`,
      `Accuracy: ${feedback.length ? ((feedback.filter((f: any) => f.correct_prediction).length / feedback.length) * 100).toFixed(0) : '—'}%`,
      '',
      '──────────────────────────────────────────',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `AgriVision_${farm?.farm_name}_${new Date().toISOString().split('T')[0]}.txt`,
    });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success('Report downloaded');
  };

  const an   = preview?.insights?.analysis;
  const hist = preview?.history || [];
  const fb   = preview?.feedback || [];

  const chartData = hist.slice(-20).map((r: any) => ({
    date:    r.date?.slice(5) ?? r.date,
    NDVI:    r.ndvi_mean,
    NDWI:    r.ndwi_mean,
    Health:  r.health_score != null ? +(r.health_score / 100).toFixed(3) : null,
  }));

  const fbCorrect   = fb.filter((f: any) => f.correct_prediction).length;
  const fbAccuracy  = fb.length ? Math.round(fbCorrect / fb.length * 100) : null;

  const selectCls = 'h-9 px-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-500';

  return (
    <FarmerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Generate comprehensive satellite analysis reports for your farms</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <select value={selected} onChange={e => { setSelected(e.target.value); setPreview(null); }} className={selectCls}>
            <option value="">Select farm…</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.farm_name}</option>)}
          </select>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className={selectCls}>
            {[30, 90, 180, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
          <button
            onClick={loadPreview}
            disabled={!selected || loading}
            className="h-9 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
              : <><BarChart3 className="w-4 h-4" /> Generate Report</>}
          </button>
          {preview && (
            <button
              onClick={downloadText}
              className="h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download (.txt)
            </button>
          )}
        </div>

        {preview && (
          <div className="space-y-5">
            {/* Farm header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-green-600/20">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Farm Report</p>
                  <h2 className="text-2xl font-bold mt-1">{preview.farm?.farm_name}</h2>
                  <p className="text-green-100 text-sm mt-1">
                    <Leaf className="w-3.5 h-3.5 inline mr-1" />{preview.farm?.crop_type}
                    &nbsp;·&nbsp;{preview.farm?.latitude?.toFixed(4)}°N, {preview.farm?.longitude?.toFixed(4)}°E
                  </p>
                  <p className="text-green-200 text-xs mt-1">
                    Report period: Last {days} days &nbsp;·&nbsp; Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-200 text-xs">Crop Status</p>
                  <p className="font-semibold text-lg mt-0.5">{preview.insights?.insights?.ndvi_status?.label ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'NDVI Index',   value: an?.ndvi?.toFixed(3),                          icon: Leaf,       color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
                { label: 'Health Score', value: `${an?.health_score?.toFixed(0) ?? '—'}%`,      icon: Activity,   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
                { label: 'Est. Yield',   value: `${an?.yield_prediction?.toFixed(1) ?? '—'} t/ha`, icon: TrendingUp, color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
                { label: 'Feedback',     value: fb.length ? `${fbCorrect}/${fb.length}` : 'None', icon: FileText,   color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
              ].map(({ label, value, icon: Icon, color, bg, border }) => (
                <div key={label} className={`bg-white border ${border} rounded-xl p-4 shadow-sm`}>
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{value}</p>
                </div>
              ))}
            </div>

            {/* NDVI / NDWI Chart */}
            {chartData.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Vegetation Index Trend</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{chartData.length} data points over {days} days</p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-gray-300" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ndwiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[-0.5, 1]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="NDVI" stroke="#16a34a" strokeWidth={2} fill="url(#ndviGrad)" dot={false} />
                    <Area type="monotone" dataKey="NDWI" stroke="#2563eb" strokeWidth={1.5} fill="url(#ndwiGrad)" dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Issues + Recs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Issues Detected</h3>
                {preview.insights?.insights?.issues?.length ? (
                  <div className="space-y-2">
                    {preview.insights.insights.issues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          issue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          issue.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{issue.severity}</span>
                        <span className="text-gray-700">{issue.issue}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    No critical issues detected
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Recommendations</h3>
                <div className="space-y-2">
                  {(preview.insights?.insights?.recommendations || []).slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                        {r.priority}
                      </span>
                      <div>
                        <p className="text-gray-800 font-medium">{r.action}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{r.effort}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* NDVI History table */}
            {hist.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">NDVI Observation History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-2.5">Date</th>
                        <th className="text-right px-4 py-2.5">NDVI</th>
                        <th className="text-right px-4 py-2.5">NDWI</th>
                        <th className="text-right px-4 py-2.5">EVI</th>
                        <th className="text-right px-4 py-2.5">Health</th>
                        <th className="text-right px-5 py-2.5">Yield est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {hist.slice(-12).map((r: any) => (
                        <tr key={r.date} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-2.5 text-gray-500 text-xs font-mono">{fmtDate(r.date)}</td>
                          <td className="px-4 py-2.5 text-right text-green-700 font-mono font-semibold">{r.ndvi_mean?.toFixed(3) ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right text-blue-600 font-mono">{r.ndwi_mean?.toFixed(3) ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right text-purple-600 font-mono">{r.evi_mean?.toFixed(3)  ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthBg(r.health_score)}`}>
                              {r.health_score?.toFixed(0) ?? '—'}%
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right text-gray-600 font-mono">
                            {r.yield_prediction?.toFixed(1) ?? '—'} t/ha
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Feedback summary */}
            {fb.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Feedback Summary</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-900">{fb.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total submissions</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-700">{fbCorrect}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Correct predictions</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-700">{fbAccuracy ?? '—'}{fbAccuracy != null ? '%' : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI accuracy</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}
