"""
Admin-only endpoints.  All routes require authentication + role == "admin".
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import time

from database.db import get_db, User, Farm, Feedback, VegetationIndex, ModelVersion
from database.schemas import AdminUserOut, FarmWithOwner, ModelStatus, SystemHealth, APIResponse
from routers.auth_router import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

_SERVER_START = time.time()


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ---------------------------------------------------------------------------
# System Health
# ---------------------------------------------------------------------------

@router.get("/system-health", response_model=SystemHealth)
async def system_health(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Platform health overview"""
    try:
        total_users    = db.query(User).count()
        total_farms    = db.query(Farm).count()
        total_feedback = db.query(Feedback).count()

        # Quick DB connectivity check
        db_status = "healthy"
        try:
            db.execute(__import__("sqlalchemy").text("SELECT 1"))
        except Exception:
            db_status = "error"

        return SystemHealth(
            status="healthy",
            database=db_status,
            version="1.0.0",
            total_users=total_users,
            total_farms=total_farms,
            total_feedback=total_feedback,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[AdminUserOut])
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """List all registered users with their farm counts"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        farm_count = db.query(Farm).filter(Farm.owner_id == u.id).count()
        result.append(AdminUserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            farm_count=farm_count,
        ))
    return result


@router.put("/users/{user_id}/status", response_model=APIResponse)
async def toggle_user_status(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(_require_admin),
):
    """Toggle a user's active status"""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    state = "activated" if user.is_active else "deactivated"
    return APIResponse(success=True, message=f"User {state} successfully")


@router.delete("/users/{user_id}", response_model=APIResponse)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(_require_admin),
):
    """Delete a user (cannot delete yourself)"""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return APIResponse(success=True, message="User deleted successfully")


# ---------------------------------------------------------------------------
# Farm Overview (all farms with owner info)
# ---------------------------------------------------------------------------

@router.get("/farms", response_model=List[FarmWithOwner])
async def list_all_farms(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """All farms with owner info and latest NDVI"""
    farms = db.query(Farm).all()
    result = []
    for f in farms:
        owner = db.query(User).filter(User.id == f.owner_id).first() if f.owner_id else None
        latest = (
            db.query(VegetationIndex)
            .filter(VegetationIndex.farm_id == f.id)
            .order_by(VegetationIndex.date.desc())
            .first()
        )
        result.append(FarmWithOwner(
            id=f.id,
            farm_name=f.farm_name,
            crop_type=f.crop_type,
            latitude=f.latitude,
            longitude=f.longitude,
            owner_id=f.owner_id,
            owner_email=owner.email if owner else None,
            owner_name=owner.full_name if owner else None,
            created_at=f.created_at,
            latest_ndvi=latest.ndvi_mean if latest else None,
            latest_health=latest.health_score if latest else None,
        ))
    return result


# ---------------------------------------------------------------------------
# Feedback Overview
# ---------------------------------------------------------------------------

@router.get("/feedback")
async def list_all_feedback(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """All feedback submissions with analytics"""
    rows = db.query(Feedback).order_by(Feedback.timestamp.desc()).all()
    total = len(rows)
    correct = sum(1 for r in rows if r.correct_prediction)
    labeled = sum(1 for r in rows if r.actual_crop_type and not r.correct_prediction)
    used    = sum(1 for r in rows if r.used_for_training)

    issue_breakdown: Dict[str, int] = {}
    for r in rows:
        if r.issue_type:
            issue_breakdown[r.issue_type] = issue_breakdown.get(r.issue_type, 0) + 1

    feedback_list = [
        {
            "id": r.id,
            "farm_id": r.farm_id,
            "scene_id": r.scene_id,
            "correct_prediction": r.correct_prediction,
            "issue_type": r.issue_type,
            "actual_crop_type": r.actual_crop_type,
            "actual_yield_observed": r.actual_yield_observed,
            "ground_notes": r.ground_notes,
            "used_for_training": r.used_for_training,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in rows
    ]

    return {
        "analytics": {
            "total": total,
            "correct": correct,
            "incorrect": total - correct,
            "accuracy": round(correct / total * 100, 1) if total else 0,
            "labeled_for_training": labeled,
            "used_for_training": used,
            "issue_breakdown": issue_breakdown,
        },
        "feedback": feedback_list,
    }


# ---------------------------------------------------------------------------
# ML Model Status
# ---------------------------------------------------------------------------

@router.get("/model-status")
async def model_status(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Status of all ML models"""
    import os
    from config.settings import settings

    def _file_info(path: str):
        if os.path.exists(path):
            mtime = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M")
            return True, mtime
        return False, None

    crop_exists, crop_mtime   = _file_info(settings.crop_model_path)
    yield_exists, yield_mtime = _file_info(settings.yield_model_path)
    ssl_exists, ssl_mtime     = _file_info(settings.ssl_encoder_path)

    # Training history from model_versions table
    versions = db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).limit(10).all()

    # Feedback counts
    ready_to_train = db.query(Feedback).filter(
        Feedback.actual_crop_type.isnot(None),
        Feedback.used_for_training == False,  # noqa: E712
    ).count()
    crop_feedback_used = db.query(Feedback).filter(Feedback.used_for_training == True).count()  # noqa: E712

    # VegetationIndex records = number of times AI analysis has run
    ndvi_records = db.query(VegetationIndex).count()

    def _samples_from_pkl(path: str) -> int:
        """Read actual training sample count from a fitted sklearn RandomForest .pkl file."""
        try:
            import pickle as _pickle
            with open(path, "rb") as f:
                data = _pickle.load(f)
            m = data.get("model")
            if m and hasattr(m, "estimators_") and m.estimators_:
                # Root node n_node_samples == bootstrap sample size == training set size
                return int(m.estimators_[0].tree_.n_node_samples[0])
        except Exception:
            pass
        return 0

    crop_pkl_samples  = _samples_from_pkl(settings.crop_model_path)  if crop_exists  else 0
    yield_pkl_samples = _samples_from_pkl(settings.yield_model_path) if yield_exists else 0

    # Persist initial baseline into ModelVersion on first call so it survives retraining
    import uuid as _uuid

    def _ensure_baseline(model_type: str, pkl_samples: int):
        existing = db.query(ModelVersion).filter(ModelVersion.model_type == model_type).first()
        if not existing and pkl_samples > 0:
            db.add(ModelVersion(
                id=str(_uuid.uuid4()),
                version="1.0-initial",
                model_type=model_type,
                accuracy=None,
                trained_on_count=pkl_samples,
            ))
            db.commit()

    _ensure_baseline("crop",  crop_pkl_samples)
    _ensure_baseline("yield", yield_pkl_samples)

    # Baseline = count from first-ever ModelVersion record (survives retraining)
    def _baseline(model_type: str) -> int:
        v = (
            db.query(ModelVersion)
            .filter(ModelVersion.model_type == model_type)
            .order_by(ModelVersion.created_at.asc())
            .first()
        )
        return v.trained_on_count if v else 0

    # Cumulative = initial training baseline + every HIL feedback sample used since
    crop_samples  = _baseline("crop")  + crop_feedback_used
    yield_samples = max(_baseline("yield"), ndvi_records)
    ssl_samples   = ndvi_records  # SSL runs on every AI analysis (pre-trained ResNet-18)

    return {
        "models": [
            {
                "name": "Crop Prediction (RandomForest)",
                "type": "crop",
                "trained": crop_exists,
                "file_path": settings.crop_model_path,
                "last_saved": crop_mtime,
                "samples_used": crop_samples,
            },
            {
                "name": "Yield Prediction (RandomForest)",
                "type": "yield",
                "trained": yield_exists,
                "file_path": settings.yield_model_path,
                "last_saved": yield_mtime,
                "samples_used": yield_samples,
            },
            {
                "name": "SSL Encoder (ResNet-18)",
                "type": "ssl",
                "trained": ssl_exists,
                "file_path": settings.ssl_encoder_path,
                "last_saved": ssl_mtime,
                "samples_used": ssl_samples,
            },
        ],
        "training_queue": {
            "feedback_ready": ready_to_train,
            "total_trained_on": crop_feedback_used,
        },
        "version_history": [
            {
                "id": v.id,
                "version": v.version,
                "model_type": v.model_type,
                "accuracy": v.accuracy,
                "trained_on_count": v.trained_on_count,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
    }


# ---------------------------------------------------------------------------
# Analytics Overview
# ---------------------------------------------------------------------------

@router.get("/analytics")
async def analytics_overview(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Comprehensive platform analytics"""
    total_users  = db.query(User).count()
    total_farms  = db.query(Farm).count()
    total_fb     = db.query(Feedback).count()
    correct_fb   = db.query(Feedback).filter(Feedback.correct_prediction == True).count()  # noqa: E712
    labeled_fb   = db.query(Feedback).filter(Feedback.actual_crop_type.isnot(None)).count()

    # Crop type distribution
    farms = db.query(Farm).all()
    crop_dist: Dict[str, int] = {}
    for f in farms:
        crop_dist[f.crop_type] = crop_dist.get(f.crop_type, 0) + 1

    # Latest NDVI records summary
    ndvi_records = db.query(VegetationIndex).order_by(VegetationIndex.date.desc()).limit(50).all()
    avg_ndvi   = round(sum(r.ndvi_mean for r in ndvi_records) / len(ndvi_records), 3) if ndvi_records else 0
    avg_health = round(sum(r.health_score for r in ndvi_records if r.health_score) / max(1, sum(1 for r in ndvi_records if r.health_score)), 1)

    return {
        "users":    {"total": total_users, "farmers": db.query(User).filter(User.role == "farmer").count(), "admins": db.query(User).filter(User.role == "admin").count()},
        "farms":    {"total": total_farms, "crop_distribution": crop_dist},
        "feedback": {"total": total_fb, "correct": correct_fb, "accuracy": round(correct_fb / total_fb * 100, 1) if total_fb else 0, "labeled": labeled_fb},
        "ndvi":     {"avg_ndvi": avg_ndvi, "avg_health": avg_health, "total_records": len(ndvi_records)},
    }


# ---------------------------------------------------------------------------
# Retrain trigger
# ---------------------------------------------------------------------------

@router.post("/retrain", response_model=APIResponse)
async def trigger_retrain(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Trigger HIL model retraining from admin panel"""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://localhost:8000/ai/retrain", timeout=120)
            data = resp.json()
        return APIResponse(success=data.get("success", False), message=data.get("message", ""), data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
