from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database.db import get_db, Feedback
from database.schemas import FeedbackCreate, Feedback as FeedbackSchema, APIResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _row_to_schema(feedback: Feedback) -> FeedbackSchema:
    return FeedbackSchema(
        id=feedback.id,
        farm_id=feedback.farm_id,
        scene_id=feedback.scene_id,
        correct_prediction=feedback.correct_prediction,
        issue_type=feedback.issue_type,
        actual_crop_type=feedback.actual_crop_type,
        actual_yield_observed=feedback.actual_yield_observed,
        ground_notes=feedback.ground_notes,
        observation_date=feedback.observation_date,
        used_for_training=feedback.used_for_training or False,
        timestamp=feedback.timestamp,
    )


@router.post("/submit", response_model=APIResponse)
async def submit_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Submit farmer feedback with optional ground-truth values for HIL retraining"""
    try:
        feedback_id = f"fb-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

        db_feedback = Feedback(
            id=feedback_id,
            farm_id=feedback.farm_id,
            scene_id=feedback.scene_id,
            correct_prediction=feedback.correct_prediction,
            issue_type=feedback.issue_type,
            actual_crop_type=feedback.actual_crop_type,
            actual_yield_observed=feedback.actual_yield_observed,
            ground_notes=feedback.ground_notes,
            observation_date=feedback.observation_date or datetime.utcnow().strftime("%Y-%m-%d"),
            used_for_training=False,
            timestamp=datetime.utcnow(),
        )

        db.add(db_feedback)
        db.commit()
        db.refresh(db_feedback)

        return APIResponse(
            success=True,
            message="Feedback submitted successfully",
            data={"feedback_id": feedback_id},
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[FeedbackSchema])
async def get_feedback(db: Session = Depends(get_db)):
    """Get all feedback"""
    try:
        return [_row_to_schema(f) for f in db.query(Feedback).all()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/farm/{farm_id}", response_model=List[FeedbackSchema])
async def get_farm_feedback(farm_id: str, db: Session = Depends(get_db)):
    """Get feedback for a specific farm"""
    try:
        rows = db.query(Feedback).filter(Feedback.farm_id == farm_id).all()
        return [_row_to_schema(f) for f in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=dict)
async def get_feedback_analytics(db: Session = Depends(get_db)):
    """Get feedback analytics"""
    try:
        all_feedbacks = db.query(Feedback).all()

        total_reports = len(all_feedbacks)
        correct_count = sum(1 for f in all_feedbacks if f.correct_prediction)
        incorrect_count = total_reports - correct_count
        accuracy = (correct_count / total_reports * 100) if total_reports > 0 else 0

        issue_stats: dict = {}
        for fb in all_feedbacks:
            if not fb.correct_prediction and fb.issue_type:
                issue_stats[fb.issue_type] = issue_stats.get(fb.issue_type, 0) + 1

        # Count how many samples have ground-truth labels (usable for retraining)
        labeled_count = sum(
            1 for f in all_feedbacks
            if not f.correct_prediction and f.actual_crop_type
        )

        return {
            "total_reports": total_reports,
            "correct_predictions": correct_count,
            "incorrect_predictions": incorrect_count,
            "model_accuracy": round(accuracy, 2),
            "issue_breakdown": issue_stats,
            "labeled_for_training": labeled_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training_data")
async def get_training_data(db: Session = Depends(get_db)):
    """
    Return ground-truth labeled samples ready for HIL retraining.
    Only returns feedback that has an actual_crop_type and has not yet been used for training.
    """
    try:
        rows = (
            db.query(Feedback)
            .filter(
                Feedback.actual_crop_type.isnot(None),
                Feedback.used_for_training == False,  # noqa: E712
            )
            .all()
        )

        samples = [
            {
                "feedback_id": f.id,
                "farm_id": f.farm_id,
                "scene_id": f.scene_id,
                "actual_crop_type": f.actual_crop_type,
                "actual_yield_observed": f.actual_yield_observed,
                "issue_type": f.issue_type,
                "observation_date": f.observation_date,
            }
            for f in rows
        ]

        return {"sample_count": len(samples), "samples": samples}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{feedback_id}", response_model=APIResponse)
async def delete_feedback(feedback_id: str, db: Session = Depends(get_db)):
    """Delete feedback"""
    try:
        feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()

        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")

        db.delete(feedback)
        db.commit()

        return APIResponse(success=True, message="Feedback deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
