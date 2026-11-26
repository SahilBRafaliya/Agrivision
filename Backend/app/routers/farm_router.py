from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from database.db import get_db, Farm, User
from database.schemas import FarmCreate, Farm as FarmSchema, APIResponse
from routers.auth_router import get_current_user

router = APIRouter(prefix="/farms", tags=["farms"])


def _row_to_schema(farm: Farm) -> FarmSchema:
    return FarmSchema(
        id=farm.id,
        farm_name=farm.farm_name,
        crop_type=farm.crop_type,
        latitude=farm.latitude,
        longitude=farm.longitude,
        boundary_geojson=json.loads(farm.boundary_geojson) if farm.boundary_geojson else None,
        created_at=farm.created_at,
        owner_id=farm.owner_id,
    )


@router.post("/add", response_model=APIResponse)
async def add_farm(
    farm: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new farm (authenticated)"""
    try:
        farm_id = f"f-{len(db.query(Farm).all()) + 1}"
        db_farm = Farm(
            id=farm_id,
            farm_name=farm.farm_name,
            crop_type=farm.crop_type,
            latitude=farm.latitude,
            longitude=farm.longitude,
            boundary_geojson=json.dumps(farm.boundary_geojson) if farm.boundary_geojson else None,
            created_at=farm.created_at or datetime.now().strftime("%Y-%m-%d"),
            owner_id=current_user.id,
        )
        db.add(db_farm)
        db.commit()
        db.refresh(db_farm)
        return APIResponse(success=True, message="Farm added successfully", data={"farm_id": farm_id})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[FarmSchema])
async def get_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get farms — farmers see only their own, admins see all."""
    try:
        if current_user.role == "admin":
            farms = db.query(Farm).all()
        else:
            farms = db.query(Farm).filter(Farm.owner_id == current_user.id).all()
        return [_row_to_schema(f) for f in farms]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{farm_id}", response_model=FarmSchema)
async def get_farm(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific farm (must be owner or admin)"""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role != "admin" and farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _row_to_schema(farm)


@router.put("/{farm_id}", response_model=APIResponse)
async def update_farm(
    farm_id: str,
    farm_update: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a farm (must be owner or admin)"""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role != "admin" and farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        farm.farm_name = farm_update.farm_name
        farm.crop_type = farm_update.crop_type
        farm.latitude = farm_update.latitude
        farm.longitude = farm_update.longitude
        farm.boundary_geojson = json.dumps(farm_update.boundary_geojson) if farm_update.boundary_geojson else None
        db.commit()
        return APIResponse(success=True, message="Farm updated successfully")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{farm_id}", response_model=APIResponse)
async def delete_farm(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a farm (must be owner or admin)"""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role != "admin" and farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        db.delete(farm)
        db.commit()
        return APIResponse(success=True, message="Farm deleted successfully")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
