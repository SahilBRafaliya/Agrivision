import { AppLayout } from '@/components/layout/AppLayout';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Reports</h1>
              <p className="text-sm text-muted-foreground">Generate and export farm analysis reports</p>
            </div>
          </div>
          <ReportGenerator />
        </div>
      </div>
    </AppLayout>
  );
}
