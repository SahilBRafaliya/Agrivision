import { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, Database, TrendingUp, Filter } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

const ISSUE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300">{payload[0].name}</p>
      <p className="text-white font-bold mt-0.5">{payload[0].value} reports</p>
    </div>
  );
};

export default function AdminFeedbackPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | 'correct' | 'incorrect'>('all');

  useEffect(() => {
    adminAPI.getFeedback()
      .then(setData)
      .catch(() => toast.error('Failed to load feedback'))
      .finally(() => setLoading(false));
  }, []);

  const analytics = data?.analytics;
  const allFeedback = data?.feedback || [];

  const feedback = allFeedback.filter((fb: any) => {
    if (filter === 'correct')   return fb.correct_prediction;
    if (filter === 'incorrect') return !fb.correct_prediction;
    return true;
  });

  const pieData = analytics?.issue_breakdown
    ? Object.entries(analytics.issue_breakdown).map(([name, value]: any) => ({ name, value }))
    : [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback &amp; Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Farmer-submitted feedback used for model improvement (HIL)</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading feedback data…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Analytics cards */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: 'Total Feedback',    value: analytics.total,                   icon: MessageSquare, color: 'text-gray-300',   bg: 'bg-gray-700' },
                  { label: 'Correct',           value: analytics.correct,                  icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-500/15' },
                  { label: 'Incorrect',         value: analytics.incorrect,                icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-500/15' },
                  { label: 'Model Accuracy',    value: `${analytics.accuracy}%`,           icon: TrendingUp,    color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
                  { label: 'Labeled (HIL)',     value: analytics.labeled_for_training,     icon: Database,      color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
                  { label: 'Used in Training',  value: analytics.used_for_training,        icon: CheckCircle,   color: 'text-cyan-400',   bg: 'bg-cyan-500/15' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Charts row */}
            {(pieData.length > 0 || analytics) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Issue breakdown pie chart */}
                {pieData.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-yellow-400" /> Issue Breakdown
                    </h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={ISSUE_COLORS[i % ISSUE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Accuracy & coverage summary */}
                {analytics && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
                    <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" /> Model Accuracy Overview
                    </h2>

                    <div className="space-y-4 flex-1">
                      {/* Accuracy bar */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>Overall Accuracy</span>
                          <span className="text-indigo-400 font-bold">{analytics.accuracy}%</span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{ width: `${analytics.accuracy}%` }}
                          />
                        </div>
                      </div>

                      {/* Correct vs Incorrect */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>Correct Predictions</span>
                          <span className="text-green-400 font-bold">{analytics.correct} / {analytics.total}</span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: analytics.total ? `${(analytics.correct / analytics.total) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* HIL coverage */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>HIL Training Coverage</span>
                          <span className="text-yellow-400 font-bold">{analytics.used_for_training} / {analytics.labeled_for_training}</span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: analytics.labeled_for_training ? `${(analytics.used_for_training / analytics.labeled_for_training) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">All Feedback ({feedback.length})</h2>
                <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5">
                  {(['all', 'correct', 'incorrect'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        filter === f ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-800">
                    <tr className="text-xs text-gray-500">
                      <th className="text-left px-5 py-3">Result</th>
                      <th className="text-left px-4 py-3">Farm</th>
                      <th className="text-left px-4 py-3">Issue</th>
                      <th className="text-left px-4 py-3">Actual Crop</th>
                      <th className="text-right px-4 py-3">Yield Obs.</th>
                      <th className="text-center px-4 py-3">HIL</th>
                      <th className="text-right px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {feedback.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          {filter === 'all' ? 'No feedback submitted yet' : `No ${filter} feedback`}
                        </td>
                      </tr>
                    ) : feedback.map((fb: any) => (
                      <tr key={fb.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-5 py-3">
                          {fb.correct_prediction
                            ? <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" />Correct</span>
                            : <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium"><XCircle className="w-3.5 h-3.5" />Incorrect</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{fb.farm_id?.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{fb.issue_type || '—'}</td>
                        <td className="px-4 py-3">
                          {fb.actual_crop_type
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">{fb.actual_crop_type}</span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 text-xs font-mono">
                          {fb.actual_yield_observed != null ? `${fb.actual_yield_observed} t/ha` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {fb.used_for_training
                            ? <span className="text-green-400">✓ Used</span>
                            : fb.actual_crop_type
                            ? <span className="text-yellow-400">Ready</span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500 text-xs">{fmtDate(fb.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
