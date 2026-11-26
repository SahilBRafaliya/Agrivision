import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from typing import Dict, Tuple, List


class CropPredictionService:
    def __init__(self):
        self.crop_types = ["Wheat", "Rice", "Cotton", "Sugarcane", "Soybean", "Maize"]
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self._initialize_model()

    def _initialize_model(self):
        try:
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
            )
            print("Crop prediction model initialized")
        except Exception as e:
            print(f"Error initializing crop model: {e}")

    def train_model(self, X: np.ndarray, y: np.ndarray):
        try:
            X_scaled = self.scaler.fit_transform(X)
            self.model.fit(X_scaled, y)
            self.is_trained = True
            print(f"Model trained with {len(X)} samples")
        except Exception as e:
            print(f"Error training crop model: {e}")

    def predict_crop(self, features: np.ndarray) -> Tuple[str, float]:
        try:
            if not self.is_trained:
                return self._spectral_prediction(features)
            if features.ndim == 1:
                features = features.reshape(1, -1)
            features_scaled = self.scaler.transform(features)
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]
            confidence = float(np.max(probabilities))
            return prediction, confidence
        except Exception as e:
            print(f"Error predicting crop: {e}")
            return self._spectral_prediction(features)

    def _spectral_prediction(self, features: np.ndarray) -> Tuple[str, float]:
        """
        Spectral-index-based crop inference using typical Sentinel-2 signatures.

        Features are expected as [ndvi_mean, ndwi_mean, evi_mean, ...].
        Confidence is intentionally moderate because reliable classification
        requires a trained model with ground-truth labels.

        Spectral anchors (peak growing season, India):
          Rice:      NDVI 0.50–0.75, NDWI > 0  (flooded paddies raise water signal)
          Wheat:     NDVI 0.60–0.85, NDWI negative, EVI > 0.35
          Cotton:    NDVI 0.40–0.65, EVI moderate
          Sugarcane: NDVI 0.50–0.70, stable through season
          Soybean:   NDVI 0.40–0.70, NDWI slightly negative
          Maize:     NDVI 0.55–0.80, EVI high
        """
        ndvi = float(features[0]) if len(features) > 0 else 0.5
        ndwi = float(features[1]) if len(features) > 1 else 0.0
        evi  = float(features[2]) if len(features) > 2 else ndvi * 0.8

        scores: Dict[str, float] = {
            "Rice":      0.20 + max(0.0, ndwi * 0.60) + max(0.0, (0.68 - ndvi) * 0.30),
            "Wheat":     0.20 + max(0.0, (ndvi - 0.50) * 0.70) + max(0.0, evi * 0.25) - abs(ndwi + 0.10) * 0.25,
            "Cotton":    0.15 + max(0.0, (evi - 0.20) * 0.55)  + max(0.0, (0.58 - ndvi) * 0.35),
            "Sugarcane": 0.15 + max(0.0, ndvi * 0.35)          + max(0.0, evi * 0.20),
            "Soybean":   0.10 + max(0.0, (ndvi - 0.35) * 0.50) + max(0.0, evi * 0.15) - max(0.0, ndwi * 0.10),
            "Maize":     0.15 + max(0.0, (ndvi - 0.45) * 0.65) + max(0.0, evi * 0.30),
        }

        crop_type = max(scores, key=scores.get)
        total = sum(scores.values())
        n = len(scores)
        # Normalised confidence: winner's share relative to a uniform distribution
        confidence = round(min((scores[crop_type] / total) * n, 0.82), 3) if total > 0 else 0.45
        return crop_type, confidence

    def save_model(self, path: str):
        try:
            with open(path, "wb") as f:
                pickle.dump({
                    "model": self.model,
                    "scaler": self.scaler,
                    "is_trained": self.is_trained,
                    "crop_types": self.crop_types,
                }, f)
            print(f"Crop model saved to {path}")
        except Exception as e:
            print(f"Error saving crop model: {e}")

    def load_model(self, path: str):
        try:
            if os.path.exists(path):
                with open(path, "rb") as f:
                    data = pickle.load(f)
                self.model = data["model"]
                self.scaler = data["scaler"]
                self.is_trained = data["is_trained"]
                self.crop_types = data["crop_types"]
                print(f"Crop model loaded from {path}")
        except Exception as e:
            print(f"Error loading crop model: {e}")

    def get_feature_importance(self) -> Dict[str, float]:
        if not self.is_trained or self.model is None:
            return {}
        try:
            importance = self.model.feature_importances_
            feature_names = ["ndvi_mean", "ndwi_mean", "evi_mean"] + [
                f"ssl_{i}" for i in range(len(importance) - 3)
            ]
            return dict(zip(feature_names, importance))
        except Exception as e:
            print(f"Error getting feature importance: {e}")
            return {}
