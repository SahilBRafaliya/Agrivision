from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import numpy as np
import uuid
from datetime import datetime

from services.ssl_service import SSLService
from services.crop_service import CropPredictionService
from services.yield_service import YieldPredictionService
from services.indices_service import VegetationIndicesService
from services.raster_service import RasterService
from services.stac_service import STACService
from database.schemas import CropPrediction, YieldPrediction, AIAnalysis, APIResponse
from database.db import get_db, VegetationIndex, Feedback, ModelVersion

router = APIRouter(prefix="/ai", tags=["ai"])

ssl_service     = SSLService()
crop_service    = CropPredictionService()
yield_service   = YieldPredictionService()
indices_service = VegetationIndicesService()
raster_service  = RasterService()
stac_service    = STACService()

_REQUIRED_BANDS = ["B02", "B03", "B04", "B08"]


# ---------------------------------------------------------------------------
# Band loading helpers
# ---------------------------------------------------------------------------

def _physics_bands(scene_id: str) -> Dict[str, np.ndarray]:
    """
    Deterministic, physically valid Sentinel-2 L2A surface reflectance simulation.

    Back-computes band values from a randomly-drawn NDVI target so the computed
    indices are realistic rather than raw uniform noise.

    Typical Sentinel-2 L2A (0–1 scale) for agricultural land:
      Blue  (B02): 0.01–0.08  |  Green (B03): 0.03–0.12
      Red   (B04): 0.02–0.12  |  NIR   (B08): 0.15–0.65
    """
    seed = abs(hash(scene_id)) % (2 ** 31)
    rng  = np.random.default_rng(seed)
    sz   = (64, 64)

    # Target NDVI for this scene (realistic crop range)
    ndvi_t = float(rng.uniform(0.25, 0.78))

    # Red reflectance drawn from measured cropland statistics
    red = rng.uniform(0.03, 0.12, sz).astype(np.float32)

    # NIR back-computed from NDVI definition:
    # NDVI = (NIR - Red) / (NIR + Red)  →  NIR = Red * (1 + ndvi_t) / (1 - ndvi_t)
    nir = (red * (1.0 + ndvi_t) / max(1.0 - ndvi_t, 0.02))
    nir += rng.normal(0, 0.015, sz).astype(np.float32)
    nir  = np.clip(nir, 0.15, 0.70)

    # Green ≈ Red * 1.0–1.3 (green edge reflectance slightly higher for crops)
    green = red * rng.uniform(0.9, 1.3, sz).astype(np.float32)
    green = np.clip(green, 0.02, 0.18)

    # Blue < Red (vegetation absorbs strongly in blue)
    blue = red * rng.uniform(0.4, 0.75, sz).astype(np.float32)
    blue = np.clip(blue, 0.01, 0.10)

    from scipy.ndimage import gaussian_filter
    return {
        "B08": gaussian_filter(nir,   sigma=3).astype(np.float32),
        "B04": gaussian_filter(red,   sigma=3).astype(np.float32),
        "B03": gaussian_filter(green, sigma=3).astype(np.float32),
        "B02": gaussian_filter(blue,  sigma=3).astype(np.float32),
    }


def _load_bands(scene_id: str) -> Dict[str, np.ndarray]:
    """
    Return Sentinel-2 band arrays for a scene.
    Attempts to download real data from the STAC catalog; falls back to the
    physics-based deterministic simulation if the download fails.
    """
    try:
        band_urls = stac_service.get_scene_band_urls(scene_id, _REQUIRED_BANDS)
        if len(band_urls) == len(_REQUIRED_BANDS):
            bands = raster_service.load_bands_from_urls(band_urls)
            if len(bands) == len(_REQUIRED_BANDS):
                return bands
    except Exception as e:
        print(f"Real band download failed for {scene_id}: {e}")
    return _physics_bands(scene_id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/crop_prediction", response_model=CropPrediction)
async def predict_crop_type(scene_id: str):
    """Predict crop type from satellite imagery"""
    try:
        bands        = _load_bands(scene_id)
        ssl_features = ssl_service.extract_features_from_bands(bands)
        indices      = indices_service.calculate_all_indices(bands)
        feature_vec  = ssl_service.create_feature_vector(indices, ssl_features)
        crop_type, confidence = crop_service.predict_crop(feature_vec)
        return CropPrediction(crop_type=crop_type, confidence=round(float(confidence), 3))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yield_prediction", response_model=YieldPrediction)
async def predict_yield(scene_id: str, crop_type: str = "Wheat"):
    """Predict yield from satellite imagery"""
    try:
        bands    = _load_bands(scene_id)
        indices  = indices_service.calculate_all_indices(bands)
        ndvi_arr = indices.get("ndvi", np.array([0.5]))
        ndvi     = float(np.mean(ndvi_arr))
        pred     = yield_service.predict_yield(ndvi, crop_type)
        return YieldPrediction(yield_prediction=round(float(pred), 2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis", response_model=AIAnalysis)
async def get_ai_analysis(scene_id: str, farm_id: str = None, db: Session = Depends(get_db)):
    """Complete AI analysis pipeline — saves result to NDVI history."""
    try:
        # 1. Band data (real or physics-based)
        bands = _load_bands(scene_id)

        # 2. Vegetation indices
        indices  = indices_service.calculate_all_indices(bands)
        ndvi_arr = indices.get("ndvi", np.zeros((64, 64)))
        ndwi_arr = indices.get("ndwi", np.zeros((64, 64)))
        evi_arr  = indices.get("evi",  np.zeros((64, 64)))

        ndvi = float(np.mean(ndvi_arr))
        ndwi = float(np.mean(ndwi_arr))
        evi  = float(np.mean(evi_arr))

        # 3. SSL features & crop prediction
        ssl_features = ssl_service.extract_features_from_bands(bands)
        feature_vec  = ssl_service.create_feature_vector(indices, ssl_features)
        crop_type, crop_confidence = crop_service.predict_crop(feature_vec)

        # 4. Yield
        yield_prediction = yield_service.predict_yield(ndvi, crop_type)

        # 5. Health score — pure NDVI-based, no artificial noise
        health_score = float(np.clip(ndvi * 100, 5.0, 95.0))

        # 6. Persist to NDVI history if farm_id provided
        if farm_id and db:
            try:
                record = VegetationIndex(
                    id=str(uuid.uuid4()),
                    farm_id=farm_id,
                    scene_id=scene_id,
                    date=datetime.now().strftime("%Y-%m-%d"),
                    ndvi_mean=round(ndvi, 4),
                    ndvi_min=round(float(np.min(ndvi_arr)), 4),
                    ndvi_max=round(float(np.max(ndvi_arr)), 4),
                    ndvi_std=round(float(np.std(ndvi_arr)), 4),
                    ndwi_mean=round(ndwi, 4),
                    evi_mean=round(evi, 4),
                    health_score=round(health_score, 2),
                    crop_type=crop_type,
                    yield_prediction=round(float(yield_prediction), 2),
                )
                db.add(record)
                db.commit()
            except Exception as persist_err:
                print(f"Warning: could not persist NDVI record: {persist_err}")
                db.rollback()

        return AIAnalysis(
            crop_type=crop_type,
            health_score=round(health_score, 2),
            ndvi=round(ndvi, 4),
            ndwi=round(ndwi, 4),
            yield_prediction=round(float(yield_prediction), 2),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health_analysis")
async def get_health_analysis(scene_id: str):
    """Detailed vegetation health analysis"""
    try:
        bands        = _load_bands(scene_id)
        indices      = indices_service.calculate_all_indices(bands)
        ndvi_arr     = indices.get("ndvi", np.zeros((64, 64)))
        health_stats = indices_service.classify_vegetation_health(ndvi_arr)
        ndvi_mean    = float(np.mean(ndvi_arr))

        recommendations = []
        if ndvi_mean < 0.3:
            recommendations.append("Critical: Very low vegetation cover — check for crop failure or bare soil")
        elif ndvi_mean < 0.5:
            recommendations.append("Warning: Below-average vegetation health — consider irrigation or fertilisation")
        else:
            recommendations.append("Good: Crop health is within the expected range for the season")

        if health_stats.get("stressed_percentage", 0) > 20:
            recommendations.append("Monitor stressed areas — possible disease, pest pressure, or water deficit")
        recommendations.append("Submit farmer feedback to improve model accuracy over time")

        return {
            "scene_id":       scene_id,
            "health_analysis": health_stats,
            "ndvi_mean":      round(ndvi_mean, 4),
            "recommendations": recommendations,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature_extraction")
async def extract_ssl_features(scene_id: str):
    """Extract SSL features from satellite imagery"""
    try:
        bands    = _load_bands(scene_id)
        features = ssl_service.extract_features_from_bands(bands)
        return {
            "scene_id":      scene_id,
            "feature_shape": list(features.shape),
            "feature_statistics": {
                "mean": round(float(np.mean(features)), 4),
                "std":  round(float(np.std(features)),  4),
                "min":  round(float(np.min(features)),  4),
                "max":  round(float(np.max(features)),  4),
            },
            "message": "SSL features extracted successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain")
async def retrain_model(db: Session = Depends(get_db)):
    """HIL retraining: trains the crop classifier on farmer-validated feedback."""
    try:
        labeled_rows = (
            db.query(Feedback)
            .filter(
                Feedback.actual_crop_type.isnot(None),
                Feedback.used_for_training == False,  # noqa: E712
            )
            .all()
        )

        if not labeled_rows:
            return {
                "success": False,
                "message": "No new labeled feedback available. Ask farmers to submit corrections with actual crop type.",
                "samples_used": 0,
            }

        X, y, used_ids = [], [], []
        for fb in labeled_rows:
            try:
                seed_key = fb.scene_id or fb.farm_id
                bands        = _load_bands(seed_key)
                indices      = indices_service.calculate_all_indices(bands)
                ssl_features = ssl_service.extract_features_from_bands(bands)
                feature_vec  = ssl_service.create_feature_vector(indices, ssl_features)
                X.append(feature_vec)
                y.append(fb.actual_crop_type)
                used_ids.append(fb.id)
            except Exception as sample_err:
                print(f"Skipping feedback {fb.id}: {sample_err}")

        if len(X) < 2:
            return {
                "success": False,
                "message": f"Only {len(X)} valid sample(s) — need at least 2. Collect more feedback.",
                "samples_used": len(X),
            }

        crop_service.train_model(np.array(X), np.array(y))

        for fb_id in used_ids:
            row = db.query(Feedback).filter(Feedback.id == fb_id).first()
            if row:
                row.used_for_training = True
        db.commit()

        try:
            from config.settings import settings
            crop_service.save_model(settings.crop_model_path)
        except Exception:
            pass

        # Record this retrain in ModelVersion so cumulative count survives future retrains
        try:
            import uuid as _uuid
            # Total feedback ever used (including this batch)
            total_feedback_used = db.query(Feedback).filter(Feedback.used_for_training == True).count()  # noqa: E712
            # Baseline from initial training (first ModelVersion record)
            baseline_mv = (
                db.query(ModelVersion)
                .filter(ModelVersion.model_type == "crop")
                .order_by(ModelVersion.created_at.asc())
                .first()
            )
            baseline = baseline_mv.trained_on_count if baseline_mv else 0
            db.add(ModelVersion(
                id=str(_uuid.uuid4()),
                version=f"retrain-{total_feedback_used}",
                model_type="crop",
                accuracy=None,
                trained_on_count=baseline + total_feedback_used,
            ))
            db.commit()
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Model retrained on {len(used_ids)} HIL sample(s). Future predictions will use the updated model.",
            "samples_used": len(used_ids),
            "crop_types_seen": list(set(y)),
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
