import { useAppStore } from '@/store/useAppStore';
import { MapPin, Trash2, Brain, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiAPI } from '@/services/api';

export function FarmList() {
  const { farms, removeFarm, setMapCenter, setMapZoom, getAIAnalysis, setPixelInfo } = useAppStore();

  const handleView = (lat: number, lng: number) => {
    setMapCenter([lng, lat]);
    setMapZoom(12);
  };

  const handleAIAnalysis = async (farm: any) => {
    try {
      // Generate scene ID based on farm location
      const sceneId = `farm-${farm.id}-${Date.now()}`;
      const analysis = await aiAPI.getAnalysis(sceneId);
      
      if (analysis) {
        setPixelInfo({
          lat: farm.latitude,
          lng: farm.longitude,
          ndvi: parseFloat(analysis.ndvi.toFixed(2)),
          crop: analysis.crop_type,
          health: Math.round(analysis.health_score),
          confidence: Math.round((analysis.health_score / 100) * 85 + 10),
        });
      }
    } catch (error) {
      console.error('Failed to get AI analysis for farm:', error);
    }
  };

  const handleDelete = async (farmId: string) => {
    if (window.confirm('Are you sure you want to delete this farm?')) {
      await removeFarm(farmId);
    }
  };

  return (
    <div className="space-y-3">
      {farms.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No farms registered yet.</p>
      )}
      {farms.map((farm) => (
        <div key={farm.id} className="card-elevated p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wheat className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{farm.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{farm.cropType} • {farm.size} acres</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {farm.latitude.toFixed(4)}°N, {farm.longitude.toFixed(4)}°E
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => handleView(farm.latitude, farm.longitude)}>
              <MapPin className="w-3 h-3 mr-1" />View on Map
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAIAnalysis(farm)}>
              <Brain className="w-3 h-3 mr-1" />AI Analysis
            </Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(farm.id)}>
              <Trash2 className="w-3 h-3 mr-1" />Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
