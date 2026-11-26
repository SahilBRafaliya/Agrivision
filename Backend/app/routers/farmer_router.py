"""
Farmer-specific endpoints: insights, recommendations, and solutions.
All routes require authentication. Farmers see only their own data.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import numpy as np

from database.db import get_db, Farm, User, VegetationIndex, Feedback
from routers.auth_router import get_current_user
from routers.analysis_router import _load_bands
from services.indices_service import VegetationIndicesService
from services.crop_service import CropPredictionService
from services.yield_service import YieldPredictionService
from services.ssl_service import SSLService

router = APIRouter(prefix="/farmer", tags=["farmer"])

indices_service = VegetationIndicesService()
crop_service    = CropPredictionService()
yield_service   = YieldPredictionService()
ssl_service     = SSLService()


# ---------------------------------------------------------------------------
# Recommendation engine
# ---------------------------------------------------------------------------

def _ndvi_status(ndvi: float) -> Dict[str, str]:
    if ndvi < 0.20:
        return {"level": "critical",  "label": "Critical — Very Low Vegetation",     "color": "red"}
    if ndvi < 0.35:
        return {"level": "severe",    "label": "Severe Stress — Significant Loss",   "color": "orange"}
    if ndvi < 0.50:
        return {"level": "moderate",  "label": "Moderate Stress — Below Optimal",    "color": "yellow"}
    if ndvi < 0.65:
        return {"level": "fair",      "label": "Fair — Slightly Below Optimal",      "color": "lime"}
    if ndvi < 0.80:
        return {"level": "good",      "label": "Good — Healthy Crop",               "color": "green"}
    return              {"level": "excellent","label": "Excellent — Peak Health",          "color": "emerald"}


def _ndwi_status(ndwi: float) -> Dict[str, str]:
    if ndwi < -0.30:
        return {"level": "drought",     "label": "Severe Drought Stress"}
    if ndwi < -0.10:
        return {"level": "deficit",     "label": "Moderate Water Deficit"}
    if ndwi < 0.10:
        return {"level": "adequate",    "label": "Adequate Water Status"}
    if ndwi < 0.25:
        return {"level": "moist",       "label": "Well Watered"}
    return          {"level": "waterlogged", "label": "Excess Moisture — Waterlogging Risk"}


_CROP_ADVICE: Dict[str, Dict[str, str]] = {
    "Wheat": {
        "good":      "Maintain current fertilisation schedule. Apply potassium (30 kg K₂O/ha) before grain fill.",
        "moderate":  "Apply nitrogen top-dressing (40 kg urea/ha). Ensure adequate irrigation at jointing stage.",
        "stressed":  "Immediate irrigation required. Scout for aphid and rust disease. Apply foliar micronutrients.",
    },
    "Rice": {
        "good":      "Maintain 5 cm flood depth. Monitor for blast disease when weather is humid.",
        "moderate":  "Restore flood level. Apply split nitrogen (50 kg/ha). Check for stem borer.",
        "stressed":  "Emergency flood restoration. Apply zinc sulphate (25 kg/ha). Scout for brown plant hopper.",
    },
    "Cotton": {
        "good":      "Monitor for bollworm at boll development. Apply potassium foliar spray.",
        "moderate":  "Increase irrigation frequency. Apply balanced fertiliser. Scout for jassid and whitefly.",
        "stressed":  "Emergency drip irrigation. Apply growth regulator (mepiquat). Check for root rot.",
    },
    "Sugarcane": {
        "good":      "Maintain earthing-up. Apply potassium before grand growth stage.",
        "moderate":  "Increase irrigation. Apply nitrogen (60 kg/ha). Monitor for red rot disease.",
        "stressed":  "Emergency irrigation. Apply trash mulching. Scout for top borer and white grub.",
    },
    "Soybean": {
        "good":      "Maintain nodule activity. Apply sulphur (20 kg/ha) at pod fill.",
        "moderate":  "Increase irrigation at R3-R5 stages. Apply micronutrients (Boron 0.1%). Scout for pod borer.",
        "stressed":  "Emergency irrigation. Apply Rhizobium bio-fertiliser. Check for charcoal rot.",
    },
    "Maize": {
        "good":      "Maintain irrigation at tasseling and silking. Apply potassium for grain fill.",
        "moderate":  "Apply split nitrogen (60 kg/ha). Increase irrigation at silking. Monitor for fall armyworm.",
        "stressed":  "Emergency irrigation. Apply zinc sulphate foliar spray. Scout for stem borer.",
    },
}


def _generate_recommendations(
    ndvi: float,
    ndwi: float,
    evi: float,
    crop_type: str,
    health_score: float,
    yield_pred: float,
) -> Dict[str, Any]:
    ndvi_st  = _ndvi_status(ndvi)
    ndwi_st  = _ndwi_status(ndwi)
    level    = ndvi_st["level"]
    crop_adv = _CROP_ADVICE.get(crop_type, _CROP_ADVICE["Wheat"])

    # Map level to advice category
    if level in ("critical", "severe"):
        crop_specific = crop_adv.get("stressed", "")
    elif level in ("moderate", "fair"):
        crop_specific = crop_adv.get("moderate", "")
    else:
        crop_specific = crop_adv.get("good", "")

    issues: List[Dict] = []
    recommendations: List[Dict] = []
    outcomes: List[str] = []

    # NDVI-based issues & recommendations
    if level == "critical":
        issues.append({"severity": "critical", "issue": "Critical Vegetation Loss", "detail": f"NDVI={ndvi:.2f} — possible crop failure or complete bare soil"})
        recommendations.append({"priority": 1, "action": "Emergency Intervention", "detail": "Immediate field inspection required. Check for crop failure, pest outbreak, or equipment damage.", "effort": "Immediate"})
        recommendations.append({"priority": 2, "action": "Emergency Irrigation", "detail": "Apply 60–80 mm irrigation if water is available.", "effort": "Within 24 hours"})
        outcomes.append("With emergency irrigation: NDVI recovery of +0.10–0.20 expected in 2–3 weeks")
        outcomes.append(f"Current yield risk: High — projected loss of 30–50% vs potential")
    elif level == "severe":
        issues.append({"severity": "high", "issue": "Severe Crop Stress", "detail": f"NDVI={ndvi:.2f} — significant production loss expected"})
        recommendations.append({"priority": 1, "action": "Increase Irrigation by 40%", "detail": "Apply additional 40–60 mm irrigation. Check soil moisture at 15 cm depth.", "effort": "Within 48 hours"})
        recommendations.append({"priority": 2, "action": "Apply NPK Fertiliser", "detail": "120:60:60 kg N:P:K per hectare in split doses.", "effort": "This week"})
        outcomes.append("With proper irrigation + fertilisation: +0.12–0.18 NDVI improvement over 3 weeks")
        outcomes.append(f"Yield recovery potential: 15–25% above current projection ({yield_pred:.1f} t/ha)")
    elif level == "moderate":
        issues.append({"severity": "medium", "issue": "Moderate Vegetation Stress", "detail": f"NDVI={ndvi:.2f} — below expected for this growth stage"})
        recommendations.append({"priority": 1, "action": "Increase Irrigation by 20%", "detail": "Raise irrigation frequency. Target soil moisture at field capacity.", "effort": "Next 3 days"})
        recommendations.append({"priority": 2, "action": "Nitrogen Top-Dressing", "detail": "Apply 40 kg urea/ha as foliar or soil application.", "effort": "This week"})
        outcomes.append("Expected NDVI improvement: +0.08–0.12 within 2 weeks with recommended actions")
        outcomes.append(f"Yield impact: +8–12% above current projection")
    elif level == "fair":
        issues.append({"severity": "low", "issue": "Slightly Below Optimal", "detail": f"NDVI={ndvi:.2f} — minor intervention recommended"})
        recommendations.append({"priority": 1, "action": "Foliar Micronutrient Spray", "detail": "Apply Fe, Zn, Mn micronutrient mix. Improves photosynthetic efficiency.", "effort": "Next week"})
        outcomes.append("Expected improvement: +0.03–0.06 NDVI, +3–5% yield benefit")
    else:
        recommendations.append({"priority": 1, "action": "Maintain Current Practices", "detail": crop_specific, "effort": "Ongoing"})
        outcomes.append(f"Crop is performing well. Yield projection: {yield_pred:.1f} t/ha — above average")

    # Water stress issues
    if ndwi_st["level"] == "drought":
        issues.append({"severity": "high", "issue": "Severe Drought Stress", "detail": f"NDWI={ndwi:.2f} — critical water deficit detected"})
        recommendations.append({"priority": 1, "action": "Emergency Irrigation", "detail": "Apply 60–80 mm water immediately. Check irrigation system for blockages.", "effort": "Immediate"})
        outcomes.append("With proper irrigation: NDWI should improve to > -0.1 within 5–7 days")
    elif ndwi_st["level"] == "deficit":
        issues.append({"severity": "medium", "issue": "Water Deficit", "detail": f"NDWI={ndwi:.2f} — moderate water stress"})
        recommendations.append({"priority": 2, "action": "Increase Irrigation by 25–30%", "detail": "Raise irrigation frequency or duration by 25–30%.", "effort": "Next 3 days"})
    elif ndwi_st["level"] == "waterlogged":
        issues.append({"severity": "medium", "issue": "Waterlogging Risk", "detail": f"NDWI={ndwi:.2f} — excess moisture may damage roots"})
        recommendations.append({"priority": 1, "action": "Improve Field Drainage", "detail": "Create drainage channels. Delay next irrigation cycle.", "effort": "Immediate"})
        outcomes.append("Improving drainage will reduce root rot risk and improve nutrient uptake")

    # Crop-specific advice always included
    recommendations.append({"priority": 3, "action": f"Crop-Specific Care ({crop_type})", "detail": crop_specific, "effort": "This season"})

    return {
        "ndvi_status":  ndvi_st,
        "ndwi_status":  ndwi_st,
        "issues":        sorted(issues, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["severity"], 4)),
        "recommendations": sorted(recommendations, key=lambda x: x["priority"]),
        "expected_outcomes": outcomes,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def farmer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Summary dashboard for the logged-in farmer"""
    farms = db.query(Farm).filter(Farm.owner_id == current_user.id).all()
    farm_summaries = []

    for farm in farms:
        latest = (
            db.query(VegetationIndex)
            .filter(VegetationIndex.farm_id == farm.id)
            .order_by(VegetationIndex.date.desc())
            .first()
        )
        feedback_count = db.query(Feedback).filter(Feedback.farm_id == farm.id).count()
        farm_summaries.append({
            "farm_id":      farm.id,
            "farm_name":    farm.farm_name,
            "crop_type":    farm.crop_type,
            "latitude":     farm.latitude,
            "longitude":    farm.longitude,
            "created_at":   farm.created_at,
            "latest_ndvi":   latest.ndvi_mean   if latest else None,
            "latest_health": latest.health_score if latest else None,
            "latest_yield":  latest.yield_prediction if latest else None,
            "last_updated":  latest.date          if latest else None,
            "feedback_count": feedback_count,
        })

    # Overall stats
    all_ndvi    = [s["latest_ndvi"]   for s in farm_summaries if s["latest_ndvi"]   is not None]
    all_health  = [s["latest_health"] for s in farm_summaries if s["latest_health"] is not None]

    return {
        "farmer": {"id": current_user.id, "name": current_user.full_name, "email": current_user.email},
        "stats": {
            "total_farms":   len(farms),
            "avg_ndvi":      round(np.mean(all_ndvi),   3) if all_ndvi  else None,
            "avg_health":    round(np.mean(all_health), 1) if all_health else None,
        },
        "farms": farm_summaries,
    }


@router.get("/insights/{farm_id}")
async def farm_insights(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full AI analysis + actionable recommendations for a specific farm"""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role != "admin" and farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        scene_id = f"farm-{farm_id}"
        bands    = _load_bands(scene_id)
        indices  = indices_service.calculate_all_indices(bands)

        ndvi_arr = indices.get("ndvi", np.zeros((64, 64)))
        ndwi_arr = indices.get("ndwi", np.zeros((64, 64)))
        evi_arr  = indices.get("evi",  np.zeros((64, 64)))

        ndvi = float(np.mean(ndvi_arr))
        ndwi = float(np.mean(ndwi_arr))
        evi  = float(np.mean(evi_arr))

        ssl_feats   = ssl_service.extract_features_from_bands(bands)
        feat_vec    = ssl_service.create_feature_vector(indices, ssl_feats)
        crop_type, confidence = crop_service.predict_crop(feat_vec)
        yield_pred  = yield_service.predict_yield(ndvi, farm.crop_type)
        health      = float(np.clip(ndvi * 100, 5, 95))
        health_cls  = indices_service.classify_vegetation_health(ndvi_arr)

        recs = _generate_recommendations(ndvi, ndwi, evi, farm.crop_type, health, yield_pred)

        return {
            "farm": {
                "id": farm.id, "name": farm.farm_name,
                "crop_type": farm.crop_type,
                "latitude": farm.latitude, "longitude": farm.longitude,
            },
            "analysis": {
                "ndvi":             round(ndvi, 4),
                "ndwi":             round(ndwi, 4),
                "evi":              round(evi, 4),
                "health_score":     round(health, 1),
                "yield_prediction": round(yield_pred, 2),
                "predicted_crop":   crop_type,
                "confidence":       round(confidence, 3),
                "health_breakdown": health_cls,
            },
            "insights": recs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{farm_id}")
async def farm_history_summary(
    farm_id: str,
    days: int = 180,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """NDVI history for a farmer's farm"""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role != "admin" and farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    records = (
        db.query(VegetationIndex)
        .filter(VegetationIndex.farm_id == farm_id)
        .order_by(VegetationIndex.date.asc())
        .all()
    )
    return [
        {
            "date": r.date,
            "ndvi_mean": r.ndvi_mean,
            "ndwi_mean": r.ndwi_mean,
            "evi_mean":  r.evi_mean,
            "health_score": r.health_score,
            "yield_prediction": r.yield_prediction,
            "crop_type": r.crop_type,
        }
        for r in records
    ]
