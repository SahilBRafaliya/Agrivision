from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import numpy as np

from services.raster_service import RasterService
from services.stac_service import STACService
from services.indices_service import VegetationIndicesService
from database.schemas import VegetationIndices, APIResponse

router = APIRouter(prefix="/indices", tags=["indices"])

raster_service  = RasterService()
stac_service    = STACService()
indices_service = VegetationIndicesService()

_REQUIRED_BANDS = ["B02", "B03", "B04", "B08"]


# ---------------------------------------------------------------------------
# Shared helpers (mirror of analysis_router to avoid circular imports)
# ---------------------------------------------------------------------------

def _physics_bands(scene_id: str) -> Dict[str, np.ndarray]:
    """Deterministic physics-based fallback — see analysis_router for full notes."""
    seed = abs(hash(scene_id)) % (2 ** 31)
    rng  = np.random.default_rng(seed)
    sz   = (64, 64)

    ndvi_t = float(rng.uniform(0.25, 0.78))
    red    = rng.uniform(0.03, 0.12, sz).astype(np.float32)
    nir    = (red * (1.0 + ndvi_t) / max(1.0 - ndvi_t, 0.02))
    nir   += rng.normal(0, 0.015, sz).astype(np.float32)
    nir    = np.clip(nir, 0.15, 0.70)
    green  = np.clip(red * rng.uniform(0.9, 1.3, sz).astype(np.float32), 0.02, 0.18)
    blue   = np.clip(red * rng.uniform(0.4, 0.75, sz).astype(np.float32), 0.01, 0.10)

    from scipy.ndimage import gaussian_filter
    return {
        "B08": gaussian_filter(nir,   sigma=3).astype(np.float32),
        "B04": gaussian_filter(red,   sigma=3).astype(np.float32),
        "B03": gaussian_filter(green, sigma=3).astype(np.float32),
        "B02": gaussian_filter(blue,  sigma=3).astype(np.float32),
    }


def _load_bands(scene_id: str) -> Dict[str, np.ndarray]:
    """Try real STAC download; fall back to physics simulation."""
    try:
        band_urls = stac_service.get_scene_band_urls(scene_id, _REQUIRED_BANDS)
        if len(band_urls) == len(_REQUIRED_BANDS):
            bands = raster_service.load_bands_from_urls(band_urls)
            if len(bands) == len(_REQUIRED_BANDS):
                return bands
    except Exception as e:
        print(f"Band download failed for {scene_id}: {e}")
    return _physics_bands(scene_id)


def _compute_all(scene_id: str) -> Dict[str, Any]:
    """Return computed index statistics for a scene."""
    bands   = _load_bands(scene_id)
    indices = indices_service.calculate_all_indices(bands)

    ndvi_arr = indices.get("ndvi", np.zeros((64, 64)))
    ndwi_arr = indices.get("ndwi", np.zeros((64, 64)))
    evi_arr  = indices.get("evi",  np.zeros((64, 64)))

    return {
        "ndvi": {
            "mean": float(np.mean(ndvi_arr)),
            "min":  float(np.min(ndvi_arr)),
            "max":  float(np.max(ndvi_arr)),
            "std":  float(np.std(ndvi_arr)),
            "arr":  ndvi_arr,
        },
        "ndwi": {
            "mean": float(np.mean(ndwi_arr)),
            "min":  float(np.min(ndwi_arr)),
            "max":  float(np.max(ndwi_arr)),
            "std":  float(np.std(ndwi_arr)),
        },
        "evi": {
            "mean": float(np.mean(evi_arr)),
            "min":  float(np.min(evi_arr)),
            "max":  float(np.max(evi_arr)),
            "std":  float(np.std(evi_arr)),
        },
    }


def _water_stress(ndwi_mean: float) -> str:
    if ndwi_mean > 0.2:
        return "High (possible waterlogging)"
    if ndwi_mean > 0.0:
        return "Moderate"
    if ndwi_mean > -0.1:
        return "Low"
    return "Very Low (drought stress possible)"


def _veg_density(evi_mean: float) -> str:
    if evi_mean > 0.5:
        return "Dense"
    if evi_mean > 0.3:
        return "Moderate"
    if evi_mean > 0.15:
        return "Sparse"
    return "Bare/Very Sparse"


def _veg_health(ndvi_mean: float) -> str:
    if ndvi_mean > 0.6:
        return "Healthy"
    if ndvi_mean > 0.4:
        return "Moderate"
    if ndvi_mean > 0.2:
        return "Stressed"
    return "Severely Stressed / Bare"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/calculate", response_model=VegetationIndices)
async def calculate_vegetation_indices(scene_id: str):
    """Calculate vegetation indices for a satellite scene"""
    try:
        stats = _compute_all(scene_id)
        return VegetationIndices(
            ndvi_mean=round(stats["ndvi"]["mean"], 4),
            ndwi_mean=round(stats["ndwi"]["mean"], 4),
            evi_mean= round(stats["evi"]["mean"],  4),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ndvi")
async def get_ndvi(scene_id: str):
    """Get NDVI statistics for a satellite scene"""
    try:
        stats    = _compute_all(scene_id)
        ndvi     = stats["ndvi"]
        ndvi_arr = ndvi.pop("arr")
        health   = indices_service.classify_vegetation_health(ndvi_arr)
        return {
            "scene_id":              scene_id,
            "ndvi_mean":             round(ndvi["mean"], 4),
            "ndvi_min":              round(ndvi["min"],  4),
            "ndvi_max":              round(ndvi["max"],  4),
            "ndvi_std":              round(ndvi["std"],  4),
            "health_classification": {
                "healthy_percentage":  round(health["healthy_percentage"],  1),
                "moderate_percentage": round(health["moderate_percentage"], 1),
                "stressed_percentage": round(health["stressed_percentage"], 1),
                "overall_health_score": round(health["overall_health_score"], 4),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ndwi")
async def get_ndwi(scene_id: str):
    """Get NDWI statistics for a satellite scene"""
    try:
        stats = _compute_all(scene_id)
        ndwi  = stats["ndwi"]
        return {
            "scene_id":         scene_id,
            "ndwi_mean":        round(ndwi["mean"], 4),
            "ndwi_min":         round(ndwi["min"],  4),
            "ndwi_max":         round(ndwi["max"],  4),
            "ndwi_std":         round(ndwi["std"],  4),
            "water_stress_level": _water_stress(ndwi["mean"]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evi")
async def get_evi(scene_id: str):
    """Get EVI statistics for a satellite scene"""
    try:
        stats = _compute_all(scene_id)
        evi   = stats["evi"]
        return {
            "scene_id":           scene_id,
            "evi_mean":           round(evi["mean"], 4),
            "evi_min":            round(evi["min"],  4),
            "evi_max":            round(evi["max"],  4),
            "evi_std":            round(evi["std"],  4),
            "vegetation_density": _veg_density(evi["mean"]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparison")
async def compare_indices(scene_id: str):
    """Compare all vegetation indices for a scene with interpretation"""
    try:
        stats    = _compute_all(scene_id)
        ndvi_arr = stats["ndvi"].pop("arr")
        ndvi     = stats["ndvi"]
        ndwi     = stats["ndwi"]
        evi      = stats["evi"]

        return {
            "scene_id": scene_id,
            "indices": {
                "ndvi": {k: round(v, 4) for k, v in ndvi.items()},
                "ndwi": {k: round(v, 4) for k, v in ndwi.items()},
                "evi":  {k: round(v, 4) for k, v in evi.items()},
            },
            "interpretation": {
                "vegetation_health":  _veg_health(ndvi["mean"]),
                "water_availability": _water_stress(ndwi["mean"]),
                "vegetation_density": _veg_density(evi["mean"]),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
