import { AppLayout } from '@/components/layout/AppLayout';
import { FarmerFeedbackPanel } from '@/components/farmer/FarmerFeedbackPanel';
import { Leaf } from 'lucide-react';

export default function FarmerPortalPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Farmer Portal</h1>
              <p className="text-sm text-muted-foreground">Review AI predictions and provide feedback to improve accuracy</p>
            </div>
          </div>
          <FarmerFeedbackPanel />
        </div>
      </div>
    </AppLayout>
  );
}
