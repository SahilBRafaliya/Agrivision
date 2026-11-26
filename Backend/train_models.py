#!/usr/bin/env python3
"""
AgriVision AI Model Training Script
Trains SSL encoder, crop classifier, and yield predictor models.
"""

import sys
import os
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from services.ssl_service import SSLEncoder, SSLService
from services.crop_service import CropPredictionService
from services.yield_service import YieldPredictionService


def generate_synthetic_data(n_samples=500):
    """Generate synthetic training data for crop and yield models."""
    print(f"\n[*] Generating {n_samples} synthetic samples...")

    # Crop classes: [Wheat, Rice, Cotton, Sugarcane, Soybean, Maize]
    crop_types = ["Wheat", "Rice", "Cotton", "Sugarcane", "Soybean", "Maize"]
    crop_to_idx = {crop: i for i, crop in enumerate(crop_types)}

    # Spectral signatures for each crop (NDVI, NDWI, EVI mean values)
    spectral_ranges = {
        "Wheat":     {"ndvi": (0.60, 0.85), "ndwi": (-0.3, 0.0), "evi": (0.35, 0.65)},
        "Rice":      {"ndvi": (0.50, 0.75), "ndwi": (0.0, 0.4),  "evi": (0.30, 0.60)},
        "Cotton":    {"ndvi": (0.40, 0.65), "ndwi": (-0.2, 0.1), "evi": (0.25, 0.50)},
        "Sugarcane": {"ndvi": (0.50, 0.70), "ndwi": (-0.1, 0.2), "evi": (0.30, 0.55)},
        "Soybean":   {"ndvi": (0.40, 0.70), "ndwi": (-0.3, 0.0), "evi": (0.20, 0.50)},
        "Maize":     {"ndvi": (0.55, 0.80), "ndwi": (-0.2, 0.1), "evi": (0.35, 0.65)},
    }

    # FAO reference yields (t/ha)
    yield_ranges = {
        "Wheat":     (2.5, 7.0),
        "Rice":      (3.0, 8.0),
        "Cotton":    (1.0, 3.5),
        "Sugarcane": (50.0, 100.0),
        "Soybean":   (0.8, 3.5),
        "Maize":     (2.0, 8.5),
    }

    X_crop = []
    y_crop = []
    X_yield = []
    y_yield = []

    # Generate samples per crop
    samples_per_crop = n_samples // len(crop_types)

    for crop in crop_types:
        ranges = spectral_ranges[crop]
        yield_range = yield_ranges[crop]

        for _ in range(samples_per_crop):
            # Random spectral indices
            ndvi = np.random.uniform(*ranges["ndvi"])
            ndwi = np.random.uniform(*ranges["ndwi"])
            evi = np.random.uniform(*ranges["evi"])

            # Random SSL features (512-dim)
            ssl_features = np.random.randn(512) * 0.1 + np.random.randn(512)

            # Combine into feature vector
            features = np.concatenate([[ndvi, ndwi, evi], ssl_features])

            X_crop.append(features)
            y_crop.append(crop_to_idx[crop])

            X_yield.append(features)
            y_yield.append(np.random.uniform(*yield_range))

    X_crop = np.array(X_crop)
    y_crop = np.array(y_crop)
    X_yield = np.array(X_yield)
    y_yield = np.array(y_yield)

    print(f"[+] Generated {len(X_crop)} crop samples and {len(X_yield)} yield samples")
    print(f"    Feature dimension: {X_crop.shape[1]}")

    return X_crop, y_crop, X_yield, y_yield, crop_types


def train_crop_model(X, y, crop_types):
    """Train crop classification model."""
    print("\n[*] Training Crop Classification Model...")

    service = CropPredictionService()
    service.train_model(X, y)

    # Get feature importance
    importance = service.get_feature_importance()
    if importance:
        print(f"[+] Feature importance:")
        top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
        for feat, imp in top_features:
            print(f"    {feat}: {imp:.4f}")

    return service


def train_yield_model(X, y):
    """Train yield prediction model."""
    print("\n[*] Training Yield Prediction Model...")

    service = YieldPredictionService()
    service.train_model(X, y)

    print(f"[+] Yield model trained successfully")

    return service


def train_ssl_encoder():
    """Initialize and save SSL encoder (pretrained ResNet18)."""
    print("\n[*] Initializing SSL Feature Encoder (ResNet18)...")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"    Using device: {device}")

    service = SSLService()
    print(f"[+] SSL encoder initialized")
    print(f"    Feature dimension: 512")

    return service


def save_models(ssl_service, crop_service, yield_service, models_dir):
    """Save all trained models."""
    print("\n[*] Saving Models...")

    models_dir = Path(models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    # Save SSL encoder
    ssl_path = models_dir / "ssl_encoder.pth"
    ssl_service.save_encoder(str(ssl_path))
    print(f"[+] SSL encoder -> {ssl_path}")

    # Save crop model
    crop_path = models_dir / "crop_model.pkl"
    crop_service.save_model(str(crop_path))
    print(f"[+] Crop model -> {crop_path}")

    # Save yield model
    yield_path = models_dir / "yield_model.pkl"
    yield_service.save_model(str(yield_path))
    print(f"[+] Yield model -> {yield_path}")


def test_models(ssl_service, crop_service, yield_service):
    """Test the trained models."""
    print("\n[*] Testing Models...")

    # Create synthetic test data
    ndvi = 0.65
    ndwi = 0.05
    evi = 0.45
    ssl_features = np.random.randn(512)
    features = np.concatenate([[ndvi, ndwi, evi], ssl_features])

    # Test crop prediction
    crop, confidence = crop_service.predict_crop(features)
    print(f"[+] Crop prediction: {crop} (confidence: {confidence:.2%})")

    # Test yield prediction
    yield_pred = yield_service.predict_yield(ndvi, crop)
    print(f"[+] Yield prediction ({crop}): {yield_pred:.2f} t/ha")


def main():
    print("=" * 60)
    print("AgriVision AI - Model Training")
    print("=" * 60)

    # Setup paths
    app_dir = Path(__file__).parent / "app"
    models_dir = app_dir / "models"

    # Generate synthetic data
    X_crop, y_crop, X_yield, y_yield, crop_types = generate_synthetic_data(n_samples=500)

    # Train models
    ssl_service = train_ssl_encoder()
    crop_service = train_crop_model(X_crop, y_crop, crop_types)
    yield_service = train_yield_model(X_yield, y_yield)

    # Save models
    save_models(ssl_service, crop_service, yield_service, models_dir)

    # Test models
    test_models(ssl_service, crop_service, yield_service)

    print("\n" + "=" * 60)
    print("[SUCCESS] Training complete! Models ready for deployment.")
    print("=" * 60)


if __name__ == "__main__":
    main()
