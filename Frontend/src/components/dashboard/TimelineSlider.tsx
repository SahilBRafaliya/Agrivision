import { useAppStore } from '@/store/useAppStore';
import { Calendar } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const months = ['Jan 2024', 'Apr 2024', 'Jul 2024', 'Oct 2024', 'Jan 2025', 'Apr 2025', 'Jul 2025', 'Oct 2025', 'Dec 2025'];

export function TimelineSlider() {
  const { timelineDate, setTimelineDate } = useAppStore();

  const handleChange = (value: number[]) => {
    const idx = Math.round(value[0] / 12.5);
    const monthMap = ['2024-01', '2024-04', '2024-07', '2024-10', '2025-01', '2025-04', '2025-07', '2025-10', '2025-12'];
    setTimelineDate(monthMap[idx] || '2025-06');
  };

  return (
    <div className="card-elevated p-3 flex items-center gap-4">
      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <Slider defaultValue={[50]} max={100} step={1} onValueChange={handleChange} className="w-full" />
        <div className="flex justify-between mt-1">
          {months.map((m, i) => (
            <span key={i} className="text-[9px] text-muted-foreground">{i % 2 === 0 ? m : ''}</span>
          ))}
        </div>
      </div>
      <span className="text-xs font-mono text-foreground shrink-0">{timelineDate}</span>
    </div>
  );
}
