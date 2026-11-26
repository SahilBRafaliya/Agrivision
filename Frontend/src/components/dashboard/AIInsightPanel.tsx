import { useAppStore } from '@/store/useAppStore';
import { Wheat, Heart, Droplets, TrendingUp, Bug, Sparkles } from 'lucide-react';

export function AIInsightPanel() {
  const { pixelInfo } = useAppStore();

  const insights = [
    { icon: Wheat, label: 'Crop Type', value: 'Wheat', detail: 'Confidence: 87%', accent: 'text-primary' },
    { icon: Heart, label: 'Health Score', value: '82%', detail: 'Good condition', accent: 'text-water' },
    { icon: Droplets, label: 'Water Stress', value: 'Low', detail: 'Adequate moisture', accent: 'text-water' },
    { icon: TrendingUp, label: 'Yield Estimate', value: '3.1 ton/ha', detail: 'Above average', accent: 'text-primary' },
    { icon: Bug, label: 'Disease Risk', value: 'Low', detail: 'No anomalies', accent: 'text-success' },
  ];

  return (
    <div className="w-72 bg-popover border-l border-border flex flex-col overflow-y-auto shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">AI Insights</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Real-time crop intelligence</p>
      </div>

      <div className="p-3 space-y-2 flex-1">
        {insights.map((item) => (
          <div key={item.label} className="stat-card">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-muted ${item.accent}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pixel Inspector */}
      {pixelInfo && (
        <div className="p-3 border-t border-border animate-slide-in-right">
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            Pixel Inspector
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinates</span>
              <span className="font-mono">{pixelInfo.lat}°, {pixelInfo.lng}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NDVI</span>
              <span className="font-semibold text-primary">{pixelInfo.ndvi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crop</span>
              <span className="font-medium">{pixelInfo.crop}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Health</span>
              <span className="font-medium">{pixelInfo.health}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence</span>
              <span className="badge-success">{pixelInfo.confidence}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
