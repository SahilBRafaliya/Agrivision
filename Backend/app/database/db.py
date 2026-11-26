from sqlalchemy import create_engine, Column, String, Float, Boolean, DateTime, Text, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

from config.settings import settings

Base = declarative_base()

class Farm(Base):
    __tablename__ = "farms"

    id = Column(String, primary_key=True)
    farm_name = Column(String, nullable=False)
    crop_type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    boundary_geojson = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    owner_id = Column(String, nullable=True)  # user_id of the farmer who registered this farm

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True)
    farm_id = Column(String, nullable=False)
    scene_id = Column(String, nullable=True)
    correct_prediction = Column(Boolean, nullable=False)
    issue_type = Column(String, nullable=True)
    # Ground-truth fields for HIL retraining
    actual_crop_type = Column(String, nullable=True)
    actual_yield_observed = Column(Float, nullable=True)
    ground_notes = Column(Text, nullable=True)
    observation_date = Column(String, nullable=True)
    used_for_training = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class VegetationIndex(Base):
    __tablename__ = "vegetation_indices"

    id = Column(String, primary_key=True)
    farm_id = Column(String, nullable=False)
    scene_id = Column(String, nullable=True)
    date = Column(String, nullable=False)          # YYYY-MM-DD
    ndvi_mean = Column(Float, nullable=False)
    ndvi_min = Column(Float, nullable=True)
    ndvi_max = Column(Float, nullable=True)
    ndvi_std = Column(Float, nullable=True)
    ndwi_mean = Column(Float, nullable=True)
    evi_mean = Column(Float, nullable=True)
    health_score = Column(Float, nullable=True)
    crop_type = Column(String, nullable=True)
    yield_prediction = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="farmer")     # farmer | agronomist | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String, primary_key=True)
    version = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # crop | yield
    accuracy = Column(Float, nullable=True)
    trained_on_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Database setup
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
    _run_migrations()

def _run_migrations():
    """Safe column-level migrations for SQLite (ALTER TABLE ADD COLUMN IF NOT EXISTS)."""
    migrations = [
        ("feedback",           "used_for_training",     "BOOLEAN DEFAULT 0"),
        ("feedback",           "scene_id",              "TEXT"),
        ("feedback",           "actual_crop_type",      "TEXT"),
        ("feedback",           "actual_yield_observed", "REAL"),
        ("feedback",           "ground_notes",          "TEXT"),
        ("feedback",           "observation_date",      "TEXT"),
        ("vegetation_indices", "created_at",            "DATETIME"),
        ("vegetation_indices", "crop_type",             "TEXT"),
        ("vegetation_indices", "yield_prediction",      "REAL"),
        ("farms",              "owner_id",              "TEXT"),
    ]
    with engine.connect() as conn:
        for table, column, col_def in migrations:
            try:
                conn.execute(
                    __import__('sqlalchemy').text(
                        f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"
                    )
                )
                conn.commit()
                print(f"Migration applied: {table}.{column}")
            except Exception:
                # Column already exists — safe to ignore
                pass
