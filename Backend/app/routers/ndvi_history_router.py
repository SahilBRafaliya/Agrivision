from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import math
import uuid

from database.db import get_db, VegetationIndex, Farm
from database.schemas import VegetationIndexRecord, APIResponse
from services.yield_service import _CROP_PARAMS

router = APIRouter(prefix="/indices", tags=["vegetation-history"])

# ---------------------------------------------------------------------------
# Crop phenology: Gaussian growing-season NDVI curves for India
# peak_month: 0=Jan … 11=Dec (calendar month of NDVI peak)
# peak_v:     NDVI at peak of season
# trough_v:   NDVI at off-season / fallow
# sigma_months: approximate half-width of the growing season
# ---------------------------------------------------------------------------
_PHENOLOGY = {
    # Rabi (winter) crop — sown Oct, peaks Jan–Feb, harvested Mar
    "Wheat":     dict(peak_month=1,  peak_v=0.77, trough_v=0.15, sigma=2.0),
    # Kharif (monsoon) crop — transplanted Jun, peaks Aug–Sep, harvested Nov
    "Rice":      dict(peak_month=8,  peak_v=0.72, trough_v=0.14, sigma=2.0),
    # Kharif — Apr to Oct, relatively broad season
    "Cotton":    dict(peak_month=7,  peak_v=0.58, trough_v=0.12, sigma=2.5),
    # Ratoon / plant crop — near-perennial, mild seasonal variation
    "Sugarcane": dict(peak_month=3,  peak_v=0.65, trough_v=0.42, sigma=4.0),
    # Kharif — Jun to Oct
    "Soybean":   dict(peak_month=8,  peak_v=0.62, trough_v=0.10, sigma=1.8),
    # Kharif — May to Sep (short season)
    "Maize":     dict(peak_month=7,  peak_v=0.68, trough_v=0.12, sigma=1.8),
}
_DEFAULT_PHENOLOGY = _PHENOLOGY["Wheat"]


def _crop_ndvi(calendar_month: int, crop_type: str, rng) -> float:
    """
    Return a physically plausible NDVI for the given calendar month based on
    the crop's published phenological curve.

    Uses a Gaussian centred on the growing-season peak, with wrap-around
    distance so the transition across Dec–Jan is handled correctly.
    Adds small observation noise (±0.03) to mimic cloud/sensor variability.
    """
    p = _PHENOLOGY.get(crop_type, _DEFAULT_PHENOLOGY)
    peak = p["peak_month"]
    diff = min(abs(calendar_month - peak), 12 - abs(calendar_month - peak))
    season_factor = math.exp(-(diff ** 2) / (2.0 * p["sigma"] ** 2))
    ndvi = p["trough_v"] + (p["peak_v"] - p["trough_v"]) * season_factor
    ndvi += float(rng.uniform(-0.03, 0.03))
    return round(max(0.05, min(0.95, ndvi)), 3)


def _ndwi_from_ndvi(ndvi: float, rng) -> float:
    """
    NDWI is positively correlated with crop water content which tracks NDVI,
    but with a lower baseline.  Typical range for crops: -0.15 to 0.25.
    """
    # Empirical linear relationship from MODIS/Sentinel-2 crop studies
    ndwi = ndvi * 0.35 - 0.12 + float(rng.uniform(-0.03, 0.03))
    return round(max(-0.30, min(0.40, ndwi)), 3)


def _evi_from_ndvi(ndvi: float, rng) -> float:
    """
    EVI tracks NDVI but is suppressed relative to it due to the canopy
    background correction.  Typical ratio EVI/NDVI ≈ 0.65–0.80 for crops.
    """
    evi = ndvi * float(rng.uniform(0.65, 0.80)) + float(rng.uniform(-0.02, 0.02))
    return round(max(0.02, min(0.90, evi)), 3)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/history/{farm_id}", response_model=List[VegetationIndexRecord])
async def get_farm_ndvi_history(farm_id: str, days: int = 365, db: Session = Depends(get_db)):
    """Get NDVI history for a specific farm"""
    try:
        records = (
            db.query(VegetationIndex)
            .filter(VegetationIndex.farm_id == farm_id)
            .order_by(VegetationIndex.date.asc())
            .all()
        )

        if not records:
            # Look up the farm's crop type to generate the correct phenology
            farm = db.query(Farm).filter(Farm.id == farm_id).first()
            crop_type = farm.crop_type if farm else "Wheat"
            return _generate_seed_history(farm_id, crop_type, db)

        return [
            VegetationIndexRecord(
                id=r.id,
                farm_id=r.farm_id,
                scene_id=r.scene_id,
                date=r.date,
                ndvi_mean=r.ndvi_mean,
                ndvi_min=r.ndvi_min,
                ndvi_max=r.ndvi_max,
                ndvi_std=r.ndvi_std,
                ndwi_mean=r.ndwi_mean,
                evi_mean=r.evi_mean,
                health_score=r.health_score,
                crop_type=r.crop_type,
                yield_prediction=r.yield_prediction,
            )
            for r in records
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/{farm_id}", response_model=APIResponse)
async def save_ndvi_record(
    farm_id: str,
    record: VegetationIndexRecord,
    db: Session = Depends(get_db),
):
    """Save a new vegetation index record for a farm"""
    try:
        db_record = VegetationIndex(
            id=str(uuid.uuid4()),
            farm_id=farm_id,
            scene_id=record.scene_id,
            date=record.date,
            ndvi_mean=record.ndvi_mean,
            ndvi_min=record.ndvi_min,
            ndvi_max=record.ndvi_max,
            ndvi_std=record.ndvi_std,
            ndwi_mean=record.ndwi_mean,
            evi_mean=record.evi_mean,
            health_score=record.health_score,
            crop_type=record.crop_type,
            yield_prediction=record.yield_prediction,
        )
        db.add(db_record)
        db.commit()
        return APIResponse(success=True, message="Record saved", data={"id": db_record.id})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/all/summary")
async def get_all_farms_summary(db: Session = Depends(get_db)):
    """Get latest NDVI for all farms"""
    try:
        farms   = db.query(Farm).all()
        summary = []
        for farm in farms:
            latest = (
                db.query(VegetationIndex)
                .filter(VegetationIndex.farm_id == farm.id)
                .order_by(VegetationIndex.date.desc())
                .first()
            )
            summary.append({
                "farm_id":      farm.id,
                "farm_name":    farm.farm_name,
                "crop_type":    farm.crop_type,
                "latest_ndvi":   latest.ndvi_mean   if latest else None,
                "latest_health": latest.health_score if latest else None,
                "latest_date":   latest.date         if latest else None,
            })
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Seed-history generator
# ---------------------------------------------------------------------------

def _generate_seed_history(
    farm_id: str,
    crop_type: str,
    db: Session,
) -> List[VegetationIndexRecord]:
    """
    Generate and persist 12 months of realistic NDVI history using crop-specific
    phenological curves.  Called only when a farm has no recorded history.
    """
    import numpy as np
    rng = np.random.default_rng(abs(hash(farm_id)) % (2 ** 31))

    # Pull FAO reference yield params for this crop
    avg_yield, potential_yield = _CROP_PARAMS.get(crop_type, (3.5, 6.0))

    records    = []
    base_date  = datetime.now() - timedelta(days=365)

    for i in range(12):
        month_date     = base_date + timedelta(days=30 * i)
        calendar_month = month_date.month - 1  # 0-indexed

        ndvi  = _crop_ndvi(calendar_month, crop_type, rng)
        ndwi  = _ndwi_from_ndvi(ndvi, rng)
        evi   = _evi_from_ndvi(ndvi, rng)

        # Health score: NDVI * 100, rounded — no artificial noise
        health = round(float(np.clip(ndvi * 100, 5.0, 95.0)), 1)

        # NDVI spread: typical within-field std for crops is 0.04–0.12
        ndvi_std = round(float(rng.uniform(0.04, 0.10)), 3)

        # Yield estimate anchored to FAO values
        t = float(np.clip((ndvi - 0.25) / (0.80 - 0.25), 0.0, 1.0))
        yield_est = round(avg_yield + t * (potential_yield - avg_yield), 2)

        record_id = str(uuid.uuid4())
        db_record = VegetationIndex(
            id=record_id,
            farm_id=farm_id,
            date=month_date.strftime("%Y-%m-%d"),
            ndvi_mean=ndvi,
            ndvi_min=round(max(0.0, ndvi - ndvi_std * 2), 3),
            ndvi_max=round(min(1.0, ndvi + ndvi_std * 2), 3),
            ndvi_std=ndvi_std,
            ndwi_mean=ndwi,
            evi_mean=evi,
            health_score=health,
            crop_type=crop_type,
            yield_prediction=yield_est,
        )
        db.add(db_record)
        records.append(
            VegetationIndexRecord(
                id=record_id,
                farm_id=farm_id,
                date=db_record.date,
                ndvi_mean=ndvi,
                ndvi_min=db_record.ndvi_min,
                ndvi_max=db_record.ndvi_max,
                ndvi_std=ndvi_std,
                ndwi_mean=ndwi,
                evi_mean=evi,
                health_score=health,
                crop_type=crop_type,
                yield_prediction=yield_est,
            )
        )

    db.commit()
    return records
