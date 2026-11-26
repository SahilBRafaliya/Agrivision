const API_BASE_URL = 'http://localhost:8000';

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('agrivision_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeader() });

// ── Types ──────────────────────────────────────────────────────────────────

export interface Farm {
  id: string;
  farm_name: string;
  crop_type: string;
  latitude: number;
  longitude: number;
  boundary_geojson?: any;
  created_at: string;
  owner_id?: string;
}

export interface Feedback {
  id: string;
  farm_id: string;
  scene_id?: string;
  correct_prediction: boolean;
  issue_type?: string;
  actual_crop_type?: string;
  actual_yield_observed?: number;
  ground_notes?: string;
  observation_date?: string;
  used_for_training?: boolean;
  timestamp: string;
}

export interface FeedbackAnalytics {
  total_reports: number;
  correct_predictions: number;
  incorrect_predictions: number;
  model_accuracy: number;
  issue_breakdown: Record<string, number>;
}

export interface STACScene {
  scene_id: string;
  datetime: string;
  collection: string;
  available_bands: string[];
  cloud_percentage: number;
  bbox: number[];
}

export interface AIAnalysis {
  crop_type: string;
  health_score: number;
  ndvi: number;
  ndwi: number;
  yield_prediction: number;
}

export interface VegetationIndices {
  ndvi_mean: number;
  ndwi_mean: number;
  evi_mean: number;
}

export interface NDVIRecord {
  id?: string;
  farm_id?: string;
  date: string;
  ndvi_mean: number;
  ndvi_min?: number;
  ndvi_max?: number;
  ndwi_mean?: number;
  evi_mean?: number;
  health_score?: number;
  crop_type?: string;
  yield_prediction?: number;
}

// ── Farm API ──────────────────────────────────────────────────────────────

export const farmAPI = {
  async getFarms(): Promise<Farm[]> {
    const res = await fetch(`${API_BASE_URL}/farms/`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to fetch farms');
    return res.json();
  },

  async addFarm(farm: Omit<Farm, 'id' | 'created_at'>): Promise<{ farm_id: string }> {
    const res = await fetch(`${API_BASE_URL}/farms/add`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(farm),
    });
    if (!res.ok) throw new Error('Failed to add farm');
    return res.json();
  },

  async deleteFarm(farmId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/farms/${farmId}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete farm');
  },
};

// ── Feedback API ──────────────────────────────────────────────────────────

export const feedbackAPI = {
  async submitFeedback(feedback: Omit<Feedback, 'id' | 'timestamp' | 'used_for_training'>): Promise<{ feedback_id: string }> {
    const res = await fetch(`${API_BASE_URL}/feedback/submit`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(feedback),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  async getFeedback(): Promise<Feedback[]> {
    const res = await fetch(`${API_BASE_URL}/feedback/`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to fetch feedback');
    return res.json();
  },

  async getAnalytics(): Promise<FeedbackAnalytics> {
    const res = await fetch(`${API_BASE_URL}/feedback/analytics`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getFarmFeedback(farmId: string): Promise<Feedback[]> {
    const res = await fetch(`${API_BASE_URL}/feedback/farm/${farmId}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to fetch farm feedback');
    return res.json();
  },
};

// ── Satellite API ─────────────────────────────────────────────────────────

export const satelliteAPI = {
  async searchSatellite(bbox: number[], dateFrom: string, dateTo: string): Promise<STACScene[]> {
    const params = new URLSearchParams({ bbox: bbox.join(','), date_from: dateFrom, date_to: dateTo });
    const res = await fetch(`${API_BASE_URL}/satellite/search?${params}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to search satellite imagery');
    return res.json();
  },

  async getTrueColor(sceneId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/satellite/true_color?scene_id=${sceneId}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to get true color image');
    return res.blob();
  },
};

// ── AI Analysis API ───────────────────────────────────────────────────────

export const aiAPI = {
  async getAnalysis(sceneId: string, farmId?: string): Promise<AIAnalysis> {
    const params = farmId ? `?scene_id=${sceneId}&farm_id=${farmId}` : `?scene_id=${sceneId}`;
    const res = await fetch(`${API_BASE_URL}/ai/analysis${params}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to get AI analysis');
    return res.json();
  },

  async getCropPrediction(sceneId: string) {
    const res = await fetch(`${API_BASE_URL}/ai/crop_prediction?scene_id=${sceneId}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to get crop prediction');
    return res.json();
  },

  async getYieldPrediction(sceneId: string, cropType: string) {
    const res = await fetch(`${API_BASE_URL}/ai/yield_prediction?scene_id=${sceneId}&crop_type=${cropType}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to get yield prediction');
    return res.json();
  },

  async retrainModel() {
    const res = await fetch(`${API_BASE_URL}/ai/retrain`, { method: 'POST', headers: authHeader() });
    if (!res.ok) throw new Error('Failed to retrain model');
    return res.json();
  },
};

// ── NDVI History API ──────────────────────────────────────────────────────

export const ndviHistoryAPI = {
  async getFarmHistory(farmId: string, days = 365): Promise<NDVIRecord[]> {
    const res = await fetch(`${API_BASE_URL}/indices/history/${farmId}?days=${days}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to fetch NDVI history');
    return res.json();
  },

  async getAllSummary(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/indices/history/all/summary`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
  },
};

// ── Vegetation Indices API ────────────────────────────────────────────────

export const indicesAPI = {
  async calculateIndices(sceneId: string): Promise<VegetationIndices> {
    const res = await fetch(`${API_BASE_URL}/indices/calculate?scene_id=${sceneId}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to calculate indices');
    return res.json();
  },

  async getNDVI(sceneId: string) {
    const res = await fetch(`${API_BASE_URL}/indices/ndvi?scene_id=${sceneId}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed to get NDVI');
    return res.json();
  },
};

// ── Admin API ─────────────────────────────────────────────────────────────

export const adminAPI = {
  async systemHealth() {
    const res = await fetch(`${API_BASE_URL}/admin/system-health`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async listUsers() {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async toggleUserStatus(userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PUT', headers: authHeader(),
    });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async deleteUser(userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE', headers: authHeader(),
    });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async listFarms() {
    const res = await fetch(`${API_BASE_URL}/admin/farms`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async getFeedback() {
    const res = await fetch(`${API_BASE_URL}/admin/feedback`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async modelStatus() {
    const res = await fetch(`${API_BASE_URL}/admin/model-status`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async analytics() {
    const res = await fetch(`${API_BASE_URL}/admin/analytics`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async retrain() {
    const res = await fetch(`${API_BASE_URL}/admin/retrain`, { method: 'POST', headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
};

// ── Farmer API ────────────────────────────────────────────────────────────

export const farmerAPI = {
  async dashboard() {
    const res = await fetch(`${API_BASE_URL}/farmer/dashboard`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async insights(farmId: string) {
    const res = await fetch(`${API_BASE_URL}/farmer/insights/${farmId}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  async history(farmId: string, days = 180) {
    const res = await fetch(`${API_BASE_URL}/farmer/history/${farmId}?days=${days}`, { headers: authHeader() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
};
