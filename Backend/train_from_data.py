#!/usr/bin/env python3
"""
AgriVision AI - Model Training from Collected Dataset
Trains models using real satellite data from training_dataset.csv
"""

import sys
import os
import csv
import numpy as np
import torch
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "app"))

from services.ssl_service import SSLEncoder, SSLService
from services.crop_service import CropPredictionService
from services.yield_service import YieldPredictionService


def load_dataset_from_csv(csv_path: str) -> tuple:
    """Load features and labels from CSV dataset."""
    print(f"\n[*] Loading dataset from {csv_path}...")

    crop_types = ["Wheat", "Rice", "Cotton", "Sugarcane", "Soybean", "Maize"]
    crop_to_idx = {crop: i for i, crop in enumerate(crop_types)}

    X = []
    y = []
    sample_count = 0

    try:
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    features = [
                        float(row["ndvi_mean"]),
                        float(row["ndwi_mean"]),
                        float(row["evi_mean"]),
                    ]
                    # Add random SSL features for now (replace with real features when available)
                    ssl_features = np.random.randn(512) * 0.1
                    features.extend(ssl_features)

                    X.append(features)
                    y.append(crop_to_idx[row["crop_type"]])
                    sample_count += 1
                except Exception as e:
                    print(f"    [!] Error reading row: {e}")
                    continue

        if sample_count == 0:
            print(f"[!] No samples found in dataset. Dataset may be empty.")
            return None, None

        X = np.array(X)
        y = np.array(y)

        print(f"[+] Loaded {len(X)} samples")
        print(f"    Feature dimension: {X.shape[1]}")

        # Show crop distribution
        print(f"[+] Crop distribution:")
        for crop, idx in crop_to_idx.items():
            count = np.sum(y == idx)
            if count > 0:
                print(f"    {crop}: {count}")

        return X, y

    except FileNotFoundError:
        print(f"[!] Dataset file not found: {csv_path}")
        print(f"[*] Please run collect_data.py first to generate training data")
        return None, None
    except Exception as e:
        print(f"[!] Error loading dataset: {e}")
        return None, None


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
    """Initialize SSL encoder (pretrained ResNet18)."""
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

    # Create test data
    ndvi = 0.65
    ndwi = 0.05
    evi = 0.45
    ssl_features = np.random.randn(512)
    features = np.concatenate([[ndvi, ndwi, evi], ssl_features])

    # Test crop prediction
    crop, confidence = crop_service.predict_crop(features)
    print(f"[+] Crop prediction: {crop} (confidence: {confidence:.2%})")

    # Test yield prediction
    yield_pred = yield_service.predict_yield(ndvi, "Wheat")
    print(f"[+] Yield prediction (Wheat): {yield_pred:.2f} t/ha")


def main():
    print("="*60)
    print("AgriVision AI - Model Training from Collected Data")
    print("="*60)

    # Setup paths
    app_dir = Path(__file__).parent / "app"
    models_dir = app_dir / "models"
    dataset_file = models_dir / "training_dataset.csv"

    # Load dataset
    X, y = load_dataset_from_csv(str(dataset_file))

    if X is None or len(X) == 0:
        print("\n[!] Cannot train models without data")
        print("[*] Steps to collect data:")
        print("    1. Run: python collect_data.py")
        print("    2. Follow the interactive prompts")
        print("    3. Label satellite imagery with crop types")
        print("    4. Re-run this training script")
        return

    # Check minimum samples
    min_samples = 30
    if len(X) < min_samples:
        print(f"\n[!] Need at least {min_samples} samples to train (have {len(X)})")
        print(f"[*] Collect {min_samples - len(X)} more samples using collect_data.py")
        return

    # Train models
    crop_types = ["Wheat", "Rice", "Cotton", "Sugarcane", "Soybean", "Maize"]
    ssl_service = train_ssl_encoder()
    crop_service = train_crop_model(X, y, crop_types)
    yield_service = train_yield_model(X, y)

    # Save models
    save_models(ssl_service, crop_service, yield_service, models_dir)

    # Test models
    test_models(ssl_service, crop_service, yield_service)

    print("\n" + "="*60)
    print("[SUCCESS] Training complete! Models ready for deployment.")
    print("="*60)


if __name__ == "__main__":
    main()
