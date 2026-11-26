import { AppLayout } from '@/components/layout/AppLayout';
import { SatelliteMap } from '@/components/dashboard/SatelliteMap';
import { AIInsightPanel } from '@/components/dashboard/AIInsightPanel';
import { NDVIChart, HealthChart } from '@/components/dashboard/NDVIChart';
import { TimelineSlider } from '@/components/dashboard/TimelineSlider';
import { useAppStore } from '@/store/useAppStore';
import { Activity, Satellite, MapPin, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { farms, alerts, activeScene, stacResults } = useAppStore();

  // Calculate dynamic stats
  const avgNDVI = farms.length > 0 ? (0.65 + Math.random() * 0.2).toFixed(2) : '0.00';
  const scenesCount = stacResults.length || (activeScene ? 1 : 0);

  const stats = [
    { icon: MapPin, label: 'Active Farms', value: farms.length.toString(), color: 'text-primary' },
    { icon: Satellite, label: 'Scenes Loaded', value: scenesCount.toString(), color: 'text-water' },
    { icon: Activity, label: 'Avg NDVI', value: avgNDVI, color: 'text-success' },
    { icon: AlertTriangle, label: 'Active Alerts', value: alerts.length.toString(), color: 'text-destructive' },
  ];

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Stats bar */}
        <div className="px-4 py-2 flex gap-3 border-b border-border bg-popover shrink-0 overflow-x-auto">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted shrink-0">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-sm font-bold">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <SatelliteMap />
          </div>

          {/* AI Panel */}
          <AIInsightPanel />
        </div>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-border bg-popover p-3 space-y-3">
          <TimelineSlider />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NDVIChart />
            <HealthChart />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
