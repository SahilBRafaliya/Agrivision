import { AppLayout } from '@/components/layout/AppLayout';
import { FarmForm } from '@/components/farm/FarmForm';
import { FarmList } from '@/components/farm/FarmList';
import { SatelliteMap } from '@/components/dashboard/SatelliteMap';
import { useState } from 'react';
import { Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FarmMonitoringPage() {
  const [tab, setTab] = useState<'list' | 'register'>('list');

  return (
    <AppLayout>
      <div className="h-full flex">
        {/* Left panel */}
        <div className="w-96 border-r border-border shrink-0 flex flex-col bg-popover">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold mb-3">Farm Management</h2>
            <div className="flex gap-2">
              <Button
                variant={tab === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab('list')}
                className="text-xs"
              >
                <List className="w-3 h-3 mr-1" />Farms
              </Button>
              <Button
                variant={tab === 'register' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab('register')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />Register
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'list' ? <FarmList /> : <FarmForm onClose={() => setTab('list')} />}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <SatelliteMap />
        </div>
      </div>
    </AppLayout>
  );
}
