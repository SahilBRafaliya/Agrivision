import { AppLayout } from '@/components/layout/AppLayout';
import { STACExplorer } from '@/components/stac/STACExplorer';
import { SatelliteMap } from '@/components/dashboard/SatelliteMap';

export default function SatelliteExplorerPage() {
  return (
    <AppLayout>
      <div className="h-full flex">
        <div className="w-80 border-r border-border shrink-0 overflow-hidden">
          <STACExplorer />
        </div>
        <div className="flex-1">
          <SatelliteMap />
        </div>
      </div>
    </AppLayout>
  );
}
