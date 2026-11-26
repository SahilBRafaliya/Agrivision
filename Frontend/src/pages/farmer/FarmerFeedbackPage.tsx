import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Send, MessageSquare, Leaf, Clock } from 'lucide-react';
import FarmerLayout from '@/components/layout/FarmerLayout';
import { farmAPI, feedbackAPI, farmerAPI, Farm } from '@/services/api';
import { toast } from 'sonner';

const ISSUE_TYPES = ['Pest Attack', 'Disease', 'Water Shortage', 'Flood', 'Nutrient Deficiency', 'Incorrect Crop ID', 'Other'];
const CROP_TYPES  = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Soybean', 'Maize'];

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d?.split('T')[0] ?? '—'; }
};

export default function FarmerFeedbackPage() {
  const [searchParams]   = useSearchParams();
  const [farms, setFarms]               = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [analysis, setAnalysis]         = useState<any>(null);
  const [pastFeedback, setPastFeedback] = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [form, setForm] = useState({
    correct: true,
    issue_type: '',
    actual_crop_type: '',
    actual_yield: '',
    ground_notes: '',
  });

  useEffect(() => {
    farmAPI.getFarms().then(f => {
      setFarms(f);
      const pre = searchParams.get('farm') || f[0]?.id || '';
      if (pre) { setSelectedFarm(pre); loadFarm(pre); }
    });
  }, []);

  const loadFarm = (farmId: string) => {
    setAnalysis(null); setPastFeedback([]); setLoading(true);
    Promise.all([farmerAPI.insights(farmId), feedbackAPI.getFarmFeedback(farmId)])
      .then(([ins, fb]) => { setAnalysis(ins); setPastFeedback(fb); })
      .catch(() => toast.error('Failed to load farm data'))
      .finally(() => setLoading(false));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) { toast.error('Select a farm first'); return; }
    setSubmitting(true);
    try {
      await feedbackAPI.submitFeedback({
        farm_id:              selectedFarm,
        correct_prediction:   form.correct,
        issue_type:           !form.correct ? form.issue_type || undefined : undefined,
        actual_crop_type:     !form.correct ? form.actual_crop_type || undefined : undefined,
        actual_yield_observed:!form.correct && form.actual_yield ? parseFloat(form.actual_yield) : undefined,
        ground_notes:          form.ground_notes || undefined,
        observation_date:      new Date().toISOString().split('T')[0],
      });
      toast.success('Feedback submitted — thank you for helping improve the AI!');
      setForm({ correct: true, issue_type: '', actual_crop_type: '', actual_yield: '', ground_notes: '' });
      loadFarm(selectedFarm);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const an = analysis?.analysis;
  const fbCorrect   = pastFeedback.filter(f => f.correct_prediction).length;
  const fbAccuracy  = pastFeedback.length ? Math.round(fbCorrect / pastFeedback.length * 100) : null;

  const inputCls = 'w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30';

  return (
    <FarmerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback &amp; Corrections</h1>
          <p className="text-gray-500 text-sm mt-1">Help improve AI predictions by reporting what you observed in the field</p>
        </div>

        {/* Farm selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedFarm}
            onChange={e => { setSelectedFarm(e.target.value); loadFarm(e.target.value); }}
            className="h-10 px-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-500 min-w-[220px]"
          >
            <option value="">Select farm…</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.farm_name}</option>)}
          </select>
          {pastFeedback.length > 0 && fbAccuracy != null && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
              AI Accuracy: {fbAccuracy}% ({fbCorrect}/{pastFeedback.length})
            </span>
          )}
        </div>

        {selectedFarm && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: AI Report + past feedback */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Current AI Analysis</h2>

              {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
                  <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Loading analysis…</p>
                </div>
              ) : an ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                    <p className="font-semibold text-gray-900 text-sm">{analysis?.farm?.name}</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      <Leaf className="w-3 h-3 inline mr-1" />{analysis?.farm?.crop_type}
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      ['Predicted Crop', an.predicted_crop],
                      ['Confidence',     `${(an.confidence * 100).toFixed(0)}%`],
                      ['NDVI',           an.ndvi?.toFixed(3)],
                      ['Health Score',   `${an.health_score?.toFixed(0)}%`],
                      ['Est. Yield',     `${an.yield_prediction?.toFixed(1)} t/ha`],
                      ['NDWI',           an.ndwi?.toFixed(3)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">{k}</p>
                        <p className="text-gray-900 font-bold mt-0.5 font-mono">{v ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                  {analysis?.insights?.recommendations?.slice(0, 2).map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 px-4 pb-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-xs">{r.action}: {r.detail}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Past feedback list */}
              {pastFeedback.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Recent Feedback ({pastFeedback.length})
                  </h3>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-xl">
                    {[...pastFeedback].reverse().slice(0, 6).map(fb => (
                      <div key={fb.id} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs">
                        {fb.correct_prediction
                          ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <span className="text-gray-700 font-medium">
                          {fb.correct_prediction ? 'Correct' : `Incorrect — ${fb.issue_type || 'Issue reported'}`}
                        </span>
                        {fb.actual_crop_type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{fb.actual_crop_type}</span>
                        )}
                        <span className="ml-auto text-gray-400 flex-shrink-0">{fmtDate(fb.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Feedback Form */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" /> Submit Feedback
              </h2>
              <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">

                {/* Correct / Incorrect toggle */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2.5">Is the AI prediction correct?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, correct: true }))}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        form.correct
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" /> Yes, Correct
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, correct: false }))}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        !form.correct
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <XCircle className="w-4 h-4" /> No, Incorrect
                    </button>
                  </div>
                </div>

                {/* Conditional fields when incorrect */}
                {!form.correct && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Issue Type</label>
                      <select value={form.issue_type} onChange={e => setForm(p => ({ ...p, issue_type: e.target.value }))} className={inputCls}>
                        <option value="">Select issue…</option>
                        {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Actual Crop Type (Ground Truth)</label>
                      <select value={form.actual_crop_type} onChange={e => setForm(p => ({ ...p, actual_crop_type: e.target.value }))} className={inputCls}>
                        <option value="">Select actual crop…</option>
                        {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">This data will be used to retrain the AI model</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Actual Yield Observed (t/ha)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.actual_yield}
                        onChange={e => setForm(p => ({ ...p, actual_yield: e.target.value }))}
                        placeholder="e.g. 4.2"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Field Notes (optional)</label>
                  <textarea
                    value={form.ground_notes}
                    onChange={e => setForm(p => ({ ...p, ground_notes: e.target.value }))}
                    placeholder="Describe what you observed in the field…"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>
        )}

        {!selectedFarm && (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-gray-700 font-semibold">Select a farm to submit feedback</p>
            <p className="text-gray-400 text-sm mt-1">Your feedback helps the AI model learn and improve over time</p>
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}
