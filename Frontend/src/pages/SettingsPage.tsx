import { AppLayout } from '@/components/layout/AppLayout';
import { Settings, User, Bell, Palette, Database, Key, Save, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { farms, alerts } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    profile: {
      name: 'Dr. Priya Sharma',
      email: 'priya@agrivision.ai',
      organization: 'AgriVision Research Lab',
    },
    api: {
      stacEndpoint: 'https://earth-search.aws.element84.com/v1',
      mapboxToken: 'pk.xxxx',
      backendUrl: 'http://localhost:8000',
    },
    notifications: {
      ndviAlerts: true,
      waterStressAlerts: true,
      diseaseDetection: true,
      newSatelliteScenes: true,
      farmerFeedback: false,
    },
    system: {
      autoRefresh: true,
      refreshInterval: 300, // seconds
      enableAnimations: true,
      debugMode: false,
    }
  });

  // Load settings from backend on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // In a real app, you'd fetch from backend
      // const settings = await settingsAPI.getSettings();
      // setConfig(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // In a real app, you'd save to backend
      // await settingsAPI.saveSettings(config);
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (endpoint: string) => {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed');
      }
    } catch (error) {
      toast.error('Connection failed');
      console.error('Connection test failed:', error);
    }
  };

  const sections = [
    {
      icon: User, title: 'Profile',
      content: (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Name</label>
            <Input 
              value={config.profile.name}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profile: { ...prev.profile, name: e.target.value }
              }))}
              className="h-9 text-sm" 
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Email</label>
            <Input 
              value={config.profile.email}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profile: { ...prev.profile, email: e.target.value }
              }))}
              className="h-9 text-sm" 
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Organization</label>
            <Input 
              value={config.profile.organization}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profile: { ...prev.profile, organization: e.target.value }
              }))}
              className="h-9 text-sm" 
            />
          </div>
        </div>
      ),
    },
    {
      icon: Key, title: 'API Configuration',
      content: (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">STAC API Endpoint</label>
            <div className="flex gap-2">
              <Input 
                value={config.api.stacEndpoint}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  api: { ...prev.api, stacEndpoint: e.target.value }
                }))}
                className="h-9 text-sm font-mono flex-1" 
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => testConnection(config.api.stacEndpoint)}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Mapbox Token</label>
            <Input 
              type="password" 
              value={config.api.mapboxToken}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                api: { ...prev.api, mapboxToken: e.target.value }
              }))}
              className="h-9 text-sm font-mono" 
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Backend API URL</label>
            <div className="flex gap-2">
              <Input 
                value={config.api.backendUrl}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  api: { ...prev.api, backendUrl: e.target.value }
                }))}
                className="h-9 text-sm font-mono flex-1" 
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => testConnection(`${config.api.backendUrl}/health`)}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Bell, title: 'Notifications',
      content: (
        <div className="space-y-3">
          {Object.entries({
            'NDVI Drop Alerts': 'ndviAlerts',
            'Water Stress Alerts': 'waterStressAlerts', 
            'Disease Detection': 'diseaseDetection',
            'New Satellite Scenes': 'newSatelliteScenes',
            'Farmer Feedback': 'farmerFeedback'
          }).map(([label, key]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch 
                checked={config.notifications[key as keyof typeof config.notifications]}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, [key]: checked }
                }))}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Database, title: 'System',
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Refresh Data</span>
            <Switch 
              checked={config.system.autoRefresh}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                system: { ...prev.system, autoRefresh: checked }
              }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Refresh Interval (seconds)</label>
            <Input 
              type="number" 
              value={config.system.refreshInterval}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                system: { ...prev.system, refreshInterval: Number(e.target.value) }
              }))}
              className="h-9 text-sm" 
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable Animations</span>
            <Switch 
              checked={config.system.enableAnimations}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                system: { ...prev.system, enableAnimations: checked }
              }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Debug Mode</span>
            <Switch 
              checked={config.system.debugMode}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                system: { ...prev.system, debugMode: checked }
              }))}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
          {sections.map((s) => (
            <div key={s.title} className="card-elevated p-5">
              <div className="flex items-center gap-2 mb-4">
                <s.icon className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">{s.title}</h2>
              </div>
              {s.content}
            </div>
          ))}
          <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        </div>
      </div>
    </AppLayout>
  );
}
