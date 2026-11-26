import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ThumbsUp, ThumbsDown, Send, Wheat, Heart, Droplets, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { aiAPI, feedbackAPI } from '@/services/api';

const ISSUE_OPTIONS = ['Pest Attack', 'Crop Disease', 'Water Shortage', 'Flood Damage', 'Harvest Completed', 'Other'];
const CROP_OPTIONS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Soybean', 'Maize'];

export function FarmerFeedbackPanel() {
  const { addFeedback, feedbacks, farms, selectedFarmId, setSelectedFarmId, pixelInfo, activeScene } = useAppStore();

  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [actualCropType, setActualCropType] = useState('');
  const [actualYield, setActualYield] = useState('');
  const [groundNotes, setGroundNotes] = useState('');
  const [aiReport, setAiReport] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [retraining, setRetraining] = useState(false);

  const activeFarm = farms.find(f => f.id === selectedFarmId) || farms[0] || null;

  // Load AI report for the active farm / scene
  useEffect(() => {
    if (pixelInfo) {
      setAiReport(pixelInfo);
    } else {
      loadAIReport();
    }
  }, [pixelInfo, activeFarm, activeScene]);

  // Load real analytics from backend
  useEffect(() => {
    loadAnalytics();
  }, [feedbacks.length]);

  const loadAIReport = async () => {
    try {
      const sceneId = activeScene?.id || (activeFarm ? `farm-${activeFarm.id}` : 'default-farm-analysis');
      const analysis = await aiAPI.getAnalysis(sceneId);
      setAiReport({
        crop_type: analysis.crop_type,
        health_score: analysis.health_score,
        ndvi: analysis.ndvi,
        yield_prediction: analysis.yield_prediction,
      });
    } catch {
      setAiReport(null);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await feedbackAPI.getAnalytics();
      setAnalytics(data);
    } catch {
      // Fall back to computing from local state
    }
  };

  const handleSubmit = async () => {
    if (feedbackState === 'idle') return;
    if (!activeFarm) {
      toast.error('Please select a farm first');
      return;
    }

    try {
      const sceneId = activeScene?.id || `farm-${activeFarm.id}`;
      await addFeedback({
        id: `fb-${Date.now()}`,
        farmId: activeFarm.id,
        sceneId,
        correct: feedbackState === 'correct',
        reason: feedbackState === 'incorrect' ? selectedIssue : undefined,
        actualCropType: feedbackState === 'incorrect' && actualCropType ? actualCropType : undefined,
        actualYieldObserved: feedbackState === 'incorrect' && actualYield ? parseFloat(actualYield) : undefined,
        groundNotes: groundNotes || undefined,
        observationDate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
      });

      toast.success('Feedback submitted!', {
        description: feedbackState === 'correct'
          ? 'Thank you — prediction confirmed.'
          : `Ground truth recorded: ${actualCropType || selectedIssue || 'issue reported'}.`,
      });

      setFeedbackState('idle');
      setSelectedIssue('');
      setActualCropType('');
      setActualYield('');
      setGroundNotes('');
      loadAnalytics();
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const result = await aiAPI.retrainModel();
      if (result.success) {
        toast.success(`Model retrained on ${result.samples_used} sample(s)`, {
          description: result.crop_types_seen ? `Crops learned: ${result.crop_types_seen.join(', ')}` : undefined,
        });
        loadAnalytics();
      } else {
        toast.warning(result.message);
      }
    } catch {
      toast.error('Retraining failed — check backend logs');
    } finally {
      setRetraining(false);
    }
  };

  // Analytics — prefer backend data, fall back to local computation
  const totalReports = analytics?.total_reports ?? feedbacks.length;
  const correctCount = analytics?.correct_predictions ?? feedbacks.filter(f => f.correct).length;
  const modelAccuracy = analytics?.model_accuracy ?? (totalReports > 0 ? Math.round((correctCount / totalReports) * 100) : 0);
  const labeledForTraining = analytics?.labeled_for_training ?? 0;

  return (
    <div className="space-y-6">

      {/* Farm selector */}
      {farms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Farm</h3>
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={selectedFarmId || activeFarm?.id || ''}
            onChange={e => setSelectedFarmId(e.target.value)}
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name} — {f.cropType}</option>
            ))}
          </select>
        </div>
      )}

      {/* AI Crop Health Report */}
      <div>
        <h3 className="text-sm font-semibold mb-3">AI Crop Health Report</h3>
        {activeFarm ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Wheat,      label: 'Predicted Crop',  value: aiReport?.crop_type || activeFarm.cropType,                       color: 'text-primary'  },
              { icon: Heart,      label: 'Health Score',     value: `${Math.round(aiReport?.health_score ?? 82)}%`,                   color: 'text-water'    },
              { icon: Droplets,   label: 'NDVI',             value: (aiReport?.ndvi ?? 0.68).toFixed(2),                              color: 'text-success'  },
              { icon: TrendingUp, label: 'Yield Estimate',   value: `${(aiReport?.yield_prediction ?? 3.1).toFixed(1)} ton/ha`,       color: 'text-primary'  },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <item.icon className={`w-4 h-4 ${item.color} mb-1`} />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add a farm to see AI predictions.</p>
        )}
      </div>

      {/* Feedback Buttons */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Is this prediction correct?</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setFeedbackState('correct')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              feedbackState === 'correct'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            Correct
          </button>
          <button
            onClick={() => setFeedbackState('incorrect')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              feedbackState === 'incorrect'
                ? 'border-destructive bg-destructive/5 text-destructive'
                : 'border-border text-muted-foreground hover:border-destructive/50'
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            Incorrect
          </button>
        </div>
      </div>

      {/* Ground-truth inputs (shown when prediction is wrong) */}
      {feedbackState === 'incorrect' && (
        <div className="space-y-4 animate-slide-in-right">

          <div>
            <h3 className="text-sm font-semibold mb-2">What issue did you observe?</h3>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_OPTIONS.map(issue => (
                <button
                  key={issue}
                  onClick={() => setSelectedIssue(issue)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selectedIssue === issue
                      ? 'border-destructive bg-destructive/5 text-destructive'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>

          {/* Actual crop type — this is the ground-truth label for HIL retraining */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Actual crop growing on this field?</h3>
            <div className="grid grid-cols-3 gap-2">
              {CROP_OPTIONS.map(crop => (
                <button
                  key={crop}
                  onClick={() => setActualCropType(crop === actualCropType ? '' : crop)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    actualCropType === crop
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This will be used to retrain the AI model.</p>
          </div>

          {/* Actual yield (optional) */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Actual yield observed (ton/ha, optional)</h3>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 3.2"
              value={actualYield}
              onChange={e => setActualYield(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Free-text ground notes */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Field notes (optional)</h3>
            <textarea
              rows={2}
              placeholder="e.g. Irrigation applied last week, soil moisture low, signs of aphid infestation..."
              value={groundNotes}
              onChange={e => setGroundNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
      )}

      {feedbackState !== 'idle' && (
        <Button onClick={handleSubmit} className="w-full">
          <Send className="w-4 h-4 mr-2" />
          Submit Feedback
        </Button>
      )}

      {/* HIL Retrain Button */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium">Human-in-the-Loop Retraining</p>
          <span className="text-xs text-muted-foreground">{labeledForTraining} sample(s) ready</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Once you have submitted corrections with the actual crop type, click Retrain to improve the AI model.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleRetrain}
          disabled={retraining}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${retraining ? 'animate-spin' : ''}`} />
          {retraining ? 'Retraining…' : 'Retrain AI Model'}
        </Button>
      </div>

      {/* Analytics */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Feedback Analytics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Total Reports</p>
            <p className="text-xl font-bold">{totalReports}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Model Accuracy</p>
            <p className="text-xl font-bold text-primary">{modelAccuracy}%</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Correct</p>
            <p className="text-xl font-bold text-success">{correctCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Incorrect</p>
            <p className="text-xl font-bold text-destructive">{totalReports - correctCount}</p>
          </div>
        </div>

        {analytics?.issue_breakdown && Object.keys(analytics.issue_breakdown).length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium mb-2">Issue Breakdown:</p>
            <div className="space-y-1 text-xs">
              {Object.entries(analytics.issue_breakdown).map(([issue, count]) => (
                <div key={issue} className="flex justify-between">
                  <span>{issue}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
