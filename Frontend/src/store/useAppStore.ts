import { create } from 'zustand';
import { farmAPI, feedbackAPI, satelliteAPI, aiAPI } from '../services/api';
import type { Feedback as APIFeedback } from '../services/api';

// Calculate farm size from boundary (simplified calculation)
const calculateFarmSize = (boundary: any): number => {
  if (!boundary || !boundary.coordinates || !boundary.coordinates[0]) {
    return 50; // Default size in acres
  }
  
  // Simple calculation: estimate area from bounding box
  const coords = boundary.coordinates[0];
  if (coords.length < 4) return 50;
  
  // Find min/max lat/lng
  const lats = coords.map((c: number[]) => c[1]);
  const lngs = coords.map((c: number[]) => c[0]);
  
  const latDiff = Math.max(...lats) - Math.min(...lats);
  const lngDiff = Math.max(...lngs) - Math.min(...lngs);
  
  // Rough conversion to acres (very simplified)
  const area = latDiff * lngDiff * 111000 * 111000 / 4046.86; // Convert degrees to meters, then to acres
  
  return Math.round(area) || 50;
};

export interface Farm {
  id: string;
  name: string;
  cropType: string;
  size: number;
  latitude: number;
  longitude: number;
  boundary: Record<string, unknown> | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: 'ndvi_drop' | 'water_stress' | 'disease' | 'general';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
  timestamp: string;
  farmId?: string;
}

export interface Feedback {
  id: string;
  farmId: string;
  sceneId?: string;
  correct: boolean;
  reason?: string;
  actualCropType?: string;
  actualYieldObserved?: number;
  groundNotes?: string;
  observationDate?: string;
  usedForTraining?: boolean;
  timestamp: string;
}

export interface STACScene {
  id: string;
  collection: string;
  datetime: string;
  cloudCover: number;
  bands: string[];
  bbox: number[];
  thumbnail?: string;
}

interface AppState {
  // Map
  selectedLayer: string;
  setSelectedLayer: (layer: string) => void;
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  pixelInfo: { lat: number; lng: number; ndvi: number; crop: string; health: number; confidence: number } | null;
  setPixelInfo: (info: AppState['pixelInfo']) => void;

  // Farms
  farms: Farm[];
  selectedFarmId: string | null;
  setSelectedFarmId: (id: string | null) => void;
  addFarm: (farm: Farm) => void;
  removeFarm: (id: string) => void;
  loadFarms: () => Promise<void>;

  // Alerts
  alerts: Alert[];
  loadAlerts: () => Promise<void>;

  // Feedback
  feedbacks: Feedback[];
  addFeedback: (feedback: Feedback) => void;
  loadFeedbacks: () => Promise<void>;

  // STAC
  stacResults: STACScene[];
  setStacResults: (results: STACScene[]) => void;
  activeScene: STACScene | null;
  setActiveScene: (scene: STACScene | null) => void;
  searchSatellite: (bbox: number[], dateFrom: string, dateTo: string) => Promise<void>;

  // Timeline
  timelineDate: string;
  setTimelineDate: (date: string) => void;

  // Portal
  activePortal: 'satellite' | 'farmer';
  setActivePortal: (portal: 'satellite' | 'farmer') => void;

  // AI Analysis
  getAIAnalysis: (sceneId: string) => Promise<any>;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedLayer: 'true-color',
  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  mapCenter: [72.83, 21.17],
  setMapCenter: (center) => set({ mapCenter: center }),
  mapZoom: 6,
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  pixelInfo: null,
  setPixelInfo: (info) => set({ pixelInfo: info }),

  farms: [],
  selectedFarmId: null,
  setSelectedFarmId: (id) => set({ selectedFarmId: id }),
  addFarm: async (farm) => {
    try {
      await farmAPI.addFarm({
        farm_name: farm.name,
        crop_type: farm.cropType,
        latitude: farm.latitude,
        longitude: farm.longitude,
        boundary_geojson: farm.boundary,
      });
      // Reload farms after adding
      get().loadFarms();
    } catch (error) {
      console.error('Failed to add farm:', error);
    }
  },
  removeFarm: async (id) => {
    try {
      await farmAPI.deleteFarm(id);
      set((s) => ({ farms: s.farms.filter((f) => f.id !== id) }));
    } catch (error) {
      console.error('Failed to delete farm:', error);
    }
  },
  loadFarms: async () => {
    try {
      const farms = await farmAPI.getFarms();
      set({ farms: farms.map(f => ({
        id: f.id,
        name: f.farm_name,
        cropType: f.crop_type,
        size: calculateFarmSize(f.boundary_geojson) || 50, // Calculate from boundary or use default
        latitude: f.latitude,
        longitude: f.longitude,
        boundary: f.boundary_geojson,
        createdAt: f.created_at,
      }))});
    } catch (error) {
      console.error('Failed to load farms:', error);
      // Keep existing farms if API fails
    }
  },

  alerts: [
    // Default alerts to show while API loads
    { id: 'alert-demo-1', type: 'ndvi_drop' as const, title: 'Low NDVI Detected', description: 'Health score below threshold', severity: 'medium' as const, latitude: 21.17, longitude: 72.83, timestamp: '2025-03-07T10:00:00Z', farmId: 'demo-1' },
    { id: 'alert-demo-2', type: 'water_stress' as const, title: 'Water Stress Warning', description: 'Possible irrigation needed', severity: 'low' as const, latitude: 21.30, longitude: 73.10, timestamp: '2025-03-07T14:00:00Z', farmId: 'demo-2' },
  ],
  loadAlerts: async () => {
    // Generate alerts from AI analysis for now
    try {
      const farms = get().farms;
      const alerts: Alert[] = [];
      
      for (const farm of farms.slice(0, 3)) {
        const analysis = await aiAPI.getAnalysis(`farm-${farm.id}`);
        if (analysis.health_score < 50) {
          alerts.push({
            id: `alert-${farm.id}`,
            type: 'ndvi_drop',
            title: 'Low Health Detected',
            description: `Health score is ${analysis.health_score.toFixed(1)} at ${farm.name}`,
            severity: 'medium',
            latitude: farm.latitude,
            longitude: farm.longitude,
            timestamp: new Date().toISOString(),
            farmId: farm.id,
          });
        }
      }
      
      set({ alerts });
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  },

  feedbacks: [],
  addFeedback: async (feedback) => {
    const selectedFarmId = get().selectedFarmId;
    const resolvedFarmId = feedback.farmId || selectedFarmId || get().farms[0]?.id || 'default-farm';
    try {
      const result = await feedbackAPI.submitFeedback({
        farm_id: resolvedFarmId,
        scene_id: feedback.sceneId,
        correct_prediction: feedback.correct,
        issue_type: feedback.reason,
        actual_crop_type: feedback.actualCropType,
        actual_yield_observed: feedback.actualYieldObserved,
        ground_notes: feedback.groundNotes,
        observation_date: feedback.observationDate,
      });
      set(state => ({
        feedbacks: [...state.feedbacks, {
          ...feedback,
          id: result.feedback_id,
          farmId: resolvedFarmId,
          timestamp: new Date().toISOString(),
        }],
      }));
    } catch (error) {
      console.error('Failed to add feedback:', error);
      set(state => ({
        feedbacks: [...state.feedbacks, {
          ...feedback,
          id: `fb-${Date.now()}`,
          farmId: resolvedFarmId,
          timestamp: new Date().toISOString(),
        }],
      }));
    }
  },
  loadFeedbacks: async () => {
    try {
      const data: APIFeedback[] = await feedbackAPI.getFeedback();
      const feedbacks: Feedback[] = data.map(f => ({
        id: f.id,
        farmId: f.farm_id,
        sceneId: f.scene_id,
        correct: f.correct_prediction,
        reason: f.issue_type,
        actualCropType: f.actual_crop_type,
        actualYieldObserved: f.actual_yield_observed,
        groundNotes: f.ground_notes,
        observationDate: f.observation_date,
        usedForTraining: f.used_for_training,
        timestamp: f.timestamp,
      }));
      set({ feedbacks });
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
    }
  },

  stacResults: [],
  setStacResults: (results) => set({ stacResults: results }),
  activeScene: null,
  setActiveScene: (scene) => set({ activeScene: scene }),
  searchSatellite: async (bbox, dateFrom, dateTo) => {
    try {
      const scenes = await satelliteAPI.searchSatellite(bbox, dateFrom, dateTo);
      const stacScenes: STACScene[] = scenes.map(s => ({
        id: s.scene_id,
        collection: s.collection,
        datetime: s.datetime,
        cloudCover: s.cloud_percentage,
        bands: s.available_bands,
        bbox: s.bbox,
      }));
      set({ stacResults: stacScenes });
    } catch (error) {
      console.error('Failed to search satellite:', error);
    }
  },

  timelineDate: '2025-06-01',
  setTimelineDate: (date) => set({ timelineDate: date }),

  activePortal: 'satellite',
  setActivePortal: (portal) => set({ activePortal: portal }),

  getAIAnalysis: async (sceneId: string) => {
    try {
      const analysis = await aiAPI.getAnalysis(sceneId);
      return analysis;
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      return null;
    }
  },
}));
