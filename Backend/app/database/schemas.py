from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Farm Models
class FarmCreate(BaseModel):
    farm_name: str
    crop_type: str
    latitude: float
    longitude: float
    boundary_geojson: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

class Farm(BaseModel):
    id: str
    farm_name: str
    crop_type: str
    latitude: float
    longitude: float
    boundary_geojson: Optional[Dict[str, Any]] = None
    created_at: str
    owner_id: Optional[str] = None

# Admin-specific schemas
class AdminUserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    farm_count: int = 0

class FarmWithOwner(BaseModel):
    id: str
    farm_name: str
    crop_type: str
    latitude: float
    longitude: float
    owner_id: Optional[str] = None
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: str
    latest_ndvi: Optional[float] = None
    latest_health: Optional[float] = None

class ModelStatus(BaseModel):
    name: str
    status: str
    trained: bool
    accuracy: Optional[float] = None
    samples_used: int = 0
    last_trained: Optional[str] = None

class SystemHealth(BaseModel):
    status: str
    database: str
    version: str
    total_users: int
    total_farms: int
    total_feedback: int

class FarmerInsight(BaseModel):
    farm_id: str
    farm_name: str
    crop_type: str
    ndvi: float
    ndwi: float
    health_score: float
    yield_prediction: float
    status: str
    issues: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    expected_outcomes: List[str]

# STAC Models
class STACSearchRequest(BaseModel):
    bbox: List[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    date_from: str = Field(..., description="YYYY-MM-DD")
    date_to: str = Field(..., description="YYYY-MM-DD")
    cloud_cover_max: float = Field(default=30.0, description="Maximum cloud cover percentage")

class STACScene(BaseModel):
    scene_id: str
    datetime: str
    collection: str
    available_bands: List[str]
    cloud_percentage: float
    bbox: List[float]

# Vegetation Indices
class VegetationIndices(BaseModel):
    ndvi_mean: float
    ndwi_mean: float
    evi_mean: float

# AI Analysis
class CropPrediction(BaseModel):
    crop_type: str
    confidence: float

class YieldPrediction(BaseModel):
    yield_prediction: float  # ton/hectare

class AIAnalysis(BaseModel):
    crop_type: str
    health_score: float
    ndvi: float
    ndwi: float
    yield_prediction: float

# Feedback Models
class FeedbackCreate(BaseModel):
    farm_id: str
    scene_id: Optional[str] = None
    correct_prediction: bool
    issue_type: Optional[str] = None
    # Ground-truth values for HIL retraining
    actual_crop_type: Optional[str] = None
    actual_yield_observed: Optional[float] = None
    ground_notes: Optional[str] = None
    observation_date: Optional[str] = None

class Feedback(BaseModel):
    id: str
    farm_id: str
    scene_id: Optional[str] = None
    correct_prediction: bool
    issue_type: Optional[str] = None
    actual_crop_type: Optional[str] = None
    actual_yield_observed: Optional[float] = None
    ground_notes: Optional[str] = None
    observation_date: Optional[str] = None
    used_for_training: bool = False
    timestamp: datetime

# Vegetation Index History
class VegetationIndexRecord(BaseModel):
    id: str
    farm_id: str
    scene_id: Optional[str] = None
    date: str
    ndvi_mean: float
    ndvi_min: Optional[float] = None
    ndvi_max: Optional[float] = None
    ndvi_std: Optional[float] = None
    ndwi_mean: Optional[float] = None
    evi_mean: Optional[float] = None
    health_score: Optional[float] = None
    crop_type: Optional[str] = None
    yield_prediction: Optional[float] = None

# Auth / User Models
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "farmer"
    admin_key: Optional[str] = None  # required when role == "admin"

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Response Models
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
