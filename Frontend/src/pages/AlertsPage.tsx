import { AppLayout } from '@/components/layout/AppLayout';
import { AlertPanel } from '@/components/alerts/AlertPanel';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function AlertsPage() {
  const { alerts } = useAppStore();
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <h1 className="text-lg font-bold">Active Alerts</h1>
                <p className="text-sm text-muted-foreground">{alerts.length} alerts • {highCount} critical</p>
              </div>
            </div>
          </div>
          <AlertPanel />
        </div>
      </div>
    </AppLayout>
  );
}
