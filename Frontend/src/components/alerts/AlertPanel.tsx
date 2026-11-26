import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle, Droplets, Bug, MapPin, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { aiAPI } from '@/services/api';

const iconMap = {
  ndvi_drop: AlertTriangle,
  water_stress: Droplets,
  disease: Bug,
  general: AlertTriangle,
};

const severityColors = {
  high: 'border-l-destructive bg-destructive/5',
  medium: 'border-l-warning bg-warning/5',
  low: 'border-l-primary bg-primary/5',
};

export function AlertPanel() {
  const { alerts, farms, setMapCenter, setMapZoom, loadAlerts } = useAppStore();
  const [generatingAlerts, setGeneratingAlerts] = useState(false);

  // Generate alerts based on real farm analysis
  const generateAlerts = async () => {
    setGeneratingAlerts(true);
    try {
      const newAlerts = [];
      
      for (const farm of farms.slice(0, 3)) {
        try {
          const analysis = await aiAPI.getAnalysis(`alert-${farm.id}-${Date.now()}`);
          
          // Generate alerts based on analysis results
          if (analysis.health_score < 40) {
            newAlerts.push({
              id: `alert-${farm.id}-${Date.now()}`,
              type: 'ndvi_drop',
              title: 'Critical Health Decline',
              description: `Health score dropped to ${analysis.health_score.toFixed(1)}% at ${farm.name}`,
              severity: 'high',
              latitude: farm.latitude,
              longitude: farm.longitude,
              timestamp: new Date().toISOString(),
              farmId: farm.id,
            });
          } else if (analysis.ndwi < -0.2) {
            newAlerts.push({
              id: `water-${farm.id}-${Date.now()}`,
              type: 'water_stress',
              title: 'Water Stress Detected',
              description: `NDWI indicates water deficiency at ${farm.name}`,
              severity: 'medium',
              latitude: farm.latitude,
              longitude: farm.longitude,
              timestamp: new Date().toISOString(),
              farmId: farm.id,
            });
          } else if (analysis.health_score < 60) {
            newAlerts.push({
              id: `monitor-${farm.id}-${Date.now()}`,
              type: 'general',
              title: 'Health Monitoring Required',
              description: `Health score below optimal at ${farm.name}`,
              severity: 'low',
              latitude: farm.latitude,
              longitude: farm.longitude,
              timestamp: new Date().toISOString(),
              farmId: farm.id,
            });
          }
        } catch (error) {
          console.error('Failed to generate alert for farm:', farm.id, error);
        }
      }
      
      // In a real app, you'd send these to the backend
      await loadAlerts(); // Refresh alerts from backend
      
    } catch (error) {
      console.error('Failed to generate alerts:', error);
    } finally {
      setGeneratingAlerts(false);
    }
  };

  const handleZoom = (lat: number, lng: number) => {
    setMapCenter([lng, lat]);
    setMapZoom(14);
  };

  return (
    <div className="space-y-3">
      {/* Generate Alerts Button */}
      <div className="flex justify-end">
        <Button 
          onClick={generateAlerts} 
          disabled={generatingAlerts || farms.length === 0}
          size="sm"
          className="text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${generatingAlerts ? 'animate-spin' : ''}`} />
          {generatingAlerts ? 'Generating...' : 'Generate Alerts'}
        </Button>
      </div>

      {alerts.length === 0 && !generatingAlerts && (
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active alerts</p>
          <p className="text-xs text-muted-foreground mt-1">Generate alerts based on farm analysis</p>
        </div>
      )}

      {alerts.map((alert) => {
        const Icon = iconMap[alert.type];
        return (
          <div key={alert.id} className={`card-elevated border-l-4 p-4 ${severityColors[alert.severity]}`}>
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${
                alert.severity === 'high' ? 'text-destructive' : alert.severity === 'medium' ? 'text-warning' : 'text-primary'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
                  <span className={`text-[10px] font-medium uppercase ${
                    alert.severity === 'high' ? 'badge-danger' : alert.severity === 'medium' ? 'badge-warning' : 'badge-success'
                  }`}>{alert.severity}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{new Date(alert.timestamp).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleZoom(alert.latitude, alert.longitude)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />View on Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
