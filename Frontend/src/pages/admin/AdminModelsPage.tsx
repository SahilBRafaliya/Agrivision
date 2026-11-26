import { useEffect, useState } from 'react';
import { Cpu, RefreshCw, CheckCircle, XCircle, Clock, Database, Zap, Brain, Activity } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

const fmtDate = (d: string) => {
  if (!d) return 'Never';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

export default function AdminModelsPage() {
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [retraining, setRetraining] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.modelStatus()
      .then(setData)
      .catch(() => toast.error('Failed to load model status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const retrain = async () => {
    if (!confirm('Trigger HIL retraining on all available labeled feedback? This may take a moment.')) return;
    setRetraining(true);
    try {
      const result = await adminAPI.retrain();
      if (result.success) {
        toast.success(result.message || 'Retraining complete');
        load();
      } else {
        toast.warning(result.message || 'Retraining did not complete');
      }
    } catch (err: any) {
      toast.error(err.message || 'Retraining failed');
    } finally {
      setRetraining(false);
    }
  };

  const feedbackReady = data?.training_queue?.feedback_ready ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">ML Models</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor model status, training history &amp; trigger retraining</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="h-9 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={retrain}
              disabled={retraining || feedbackReady === 0}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <Zap className={`w-4 h-4 ${retraining ? 'animate-pulse' : ''}`} />
              {retraining ? 'Retraining…' : 'Trigger Retraining'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading model status…</p>
            </div>
          </div>
        ) : data && (
          <>
            {/* Training Queue */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-indigo-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-gray-400 font-medium">Feedback Ready to Train</span>
                </div>
                <p className="text-4xl font-bold text-indigo-400">{data.training_queue?.feedback_ready}</p>
                <p className="text-xs text-gray-600 mt-1.5">labeled samples not yet used for training</p>
                {feedbackReady > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Ready for retraining
                  </div>
                )}
              </div>
              <div className="bg-gray-900 border border-green-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-400 font-medium">Total Trained On</span>
                </div>
                <p className="text-4xl font-bold text-green-400">{data.training_queue?.total_trained_on}</p>
                <p className="text-xs text-gray-600 mt-1.5">cumulative HIL samples used across all runs</p>
              </div>
            </div>

            {/* Model Cards */}
            <div className="space-y-4">
              {data.models?.map((model: any) => (
                <div key={model.name} className={`bg-gray-900 border rounded-xl p-5 ${
                  model.trained ? 'border-green-500/25' : 'border-gray-800'
                }`}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        model.trained ? 'bg-green-500/15' : 'bg-gray-800'
                      }`}>
                        <Cpu className={`w-5 h-5 ${model.trained ? 'text-green-400' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-base">{model.name}</p>
                        <p className="text-xs text-gray-600 font-mono mt-0.5 break-all">{model.file_path}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${
                      model.trained
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {model.trained
                        ? <><CheckCircle className="w-3 h-3" />Saved to disk</>
                        : <><XCircle className="w-3 h-3" />Not saved</>}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Status</p>
                      <p className={`font-semibold mt-1.5 text-sm ${model.trained ? 'text-green-400' : 'text-yellow-400'}`}>
                        {model.trained ? 'Trained & Loaded' : 'Using Heuristics'}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Brain className="w-3 h-3" /> Samples Used</p>
                      <p className="text-white font-semibold mt-1.5">{model.samples_used}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Last Saved</p>
                      <p className="text-white font-semibold mt-1.5 text-xs">{fmtDate(model.last_saved)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Version History */}
            {data.version_history?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-300">Training History</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-800">
                      <tr className="text-xs text-gray-500">
                        <th className="text-left px-5 py-3">Version</th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-right px-4 py-3">Accuracy</th>
                        <th className="text-right px-4 py-3">Samples</th>
                        <th className="text-right px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {data.version_history.map((v: any) => (
                        <tr key={v.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-gray-400">{v.version}</td>
                          <td className="px-4 py-3 text-gray-300">{v.model_type}</td>
                          <td className="px-4 py-3 text-right text-indigo-400 font-semibold">
                            {v.accuracy ? `${(v.accuracy * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">{v.trained_on_count}</td>
                          <td className="px-5 py-3 text-right text-xs text-gray-500">{fmtDate(v.created_at)}</td>
                        </tr>
                      ))}
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
