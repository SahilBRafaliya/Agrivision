import numpy as np
from typing import List, Tuple, Dict, Any
import json

def validate_bbox(bbox: List[float]) -> bool:
    """Validate bounding box coordinates"""
    if len(bbox) != 4:
        return False
    
    min_lon, min_lat, max_lon, max_lat = bbox
    
    # Check longitude range
    if not (-180 <= min_lon <= 180) or not (-180 <= max_lon <= 180):
        return False
    
    # Check latitude range
    if not (-90 <= min_lat <= 90) or not (-90 <= max_lat <= 90):
        return False
    
    # Check if min < max
    if min_lon >= max_lon or min_lat >= max_lat:
        return False
    
    return True

def normalize_coordinates(lat: float, lon: float) -> Tuple[float, float]:
    """Normalize coordinates to valid ranges"""
    lat = max(-90, min(90, lat))
    lon = max(-180, min(180, lon))
    return lat, lon

def calculate_area_from_bbox(bbox: List[float]) -> float:
    """Calculate approximate area from bounding box in square kilometers"""
    min_lon, min_lat, max_lon, max_lat = bbox
    
    # Rough approximation (1 degree ≈ 111 km)
    lat_diff = max_lat - min_lat
    lon_diff = max_lon - min_lon
    
    area_km2 = lat_diff * lon_diff * 111 * 111
    
    return area_km2

def format_date(date_str: str) -> str:
    """Format date string to YYYY-MM-DD"""
    try:
        from datetime import datetime
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")
    except:
        return date_str

def create_geojson_point(lat: float, lon: float) -> Dict[str, Any]:
    """Create GeoJSON point feature"""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": {}
    }

def create_geojson_polygon(coordinates: List[List[Tuple[float, float]]]) -> Dict[str, Any]:
    """Create GeoJSON polygon feature"""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": coordinates
        },
        "properties": {}
    }

def validate_geojson(geojson: Dict[str, Any]) -> bool:
    """Validate GeoJSON structure"""
    try:
        if not isinstance(geojson, dict):
            return False
        
        if "type" not in geojson or "geometry" not in geojson:
            return False
        
        geometry = geojson["geometry"]
        if "type" not in geometry or "coordinates" not in geometry:
            return False
        
        return True
    except:
        return False

def interpolate_missing_values(data: np.ndarray, method: str = "linear") -> np.ndarray:
    """Interpolate missing values in array"""
    if method == "linear":
        from scipy import interpolate
        mask = ~np.isnan(data)
        if np.sum(mask) > 1:
            interp = interpolate.interp1d(np.where(mask)[0], data[mask], kind='linear', bounds_error=False, fill_value='extrapolate')
            return interp(np.arange(len(data)))
    
    # Fallback: fill with mean
    return np.where(np.isnan(data), np.nanmean(data), data)

def calculate_statistics(data: np.ndarray) -> Dict[str, float]:
    """Calculate comprehensive statistics for array"""
    return {
        "mean": float(np.mean(data)),
        "median": float(np.median(data)),
        "std": float(np.std(data)),
        "min": float(np.min(data)),
        "max": float(np.max(data)),
        "percentile_25": float(np.percentile(data, 25)),
        "percentile_75": float(np.percentile(data, 75)),
        "count": int(data.size),
        "has_nan": bool(np.isnan(data).any())
    }

def safe_json_loads(json_str: str) -> Dict[str, Any]:
    """Safely load JSON string"""
    try:
        return json.loads(json_str)
    except:
        return {}

def safe_json_dumps(obj: Any) -> str:
    """Safely dump object to JSON string"""
    try:
        return json.dumps(obj, default=str)
    except:
        return "{}"
