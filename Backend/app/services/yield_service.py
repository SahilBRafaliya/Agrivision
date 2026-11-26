import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from typing import Dict, Tuple

# FAO STAT 2022 / ICAR reference yields for India (t/ha)
# (national_average, high-input irrigated potential)
# Sugarcane is fresh cane weight, all others are grain/seed weight.
_CROP_PARAMS: Dict[str, Tuple[float, float]] = {
    "Wheat":     (3.5,  6.0),
    "Rice":      (4.2,  7.0),
    "Cotton":    (1.8,  3.2),   # seed cotton
    "Sugarcane": (68.0, 95.0),  # fresh cane t/ha
    "Soybean":   (1.3,  2.8),
    "Maize":     (3.2,  7.5),
}


class YieldPredictionService:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self._initialize_model()

    def _initialize_model(self):
        try:
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
            )
            print("Yield prediction model initialized")
        except Exception as e:
            print(f"Error initializing yield model: {e}")

    def train_model(self, X: np.ndarray, y: np.ndarray):
        try:
            X_scaled = self.scaler.fit_transform(X)
            self.model.fit(X_scaled, y)
            self.is_trained = True
            print(f"Yield model trained with {len(X)} samples")
        except Exception as e:
            print(f"Error training yield model: {e}")

    def predict_yield(self, ndvi_mean: float, crop_type: str = "Wheat") -> float:
        try:
            if not self.is_trained:
                return self._formula_yield(ndvi_mean, crop_type)
            features = self._create_features(ndvi_mean, crop_type)
            features_scaled = self.scaler.transform([features])
            return float(self.model.predict(features_scaled)[0])
        except Exception as e:
            print(f"Error predicting yield: {e}")
            return self._formula_yield(ndvi_mean, crop_type)

    def _create_features(self, ndvi_mean: float, crop_type: str) -> np.ndarray:
        crop_encoding = {
            "Wheat":     [1, 0, 0, 0, 0, 0],
            "Rice":      [0, 1, 0, 0, 0, 0],
            "Cotton":    [0, 0, 1, 0, 0, 0],
            "Sugarcane": [0, 0, 0, 1, 0, 0],
            "Soybean":   [0, 0, 0, 0, 1, 0],
            "Maize":     [0, 0, 0, 0, 0, 1],
        }
        return np.array([ndvi_mean] + crop_encoding.get(crop_type, [1, 0, 0, 0, 0, 0]))

    def _formula_yield(self, ndvi_mean: float, crop_type: str) -> float:
        """
        NDVI-scaled yield estimate anchored to FAO reference values.

        Linearly interpolates between national average (at NDVI = 0.25) and
        irrigated potential (at NDVI = 0.80), based on the well-established
        positive NDVI–yield relationship (Lobell et al. 2003, IARI regional
        calibrations).
        """
        avg, potential = _CROP_PARAMS.get(crop_type, (3.5, 6.0))
        ndvi_low, ndvi_high = 0.25, 0.80
        t = float(np.clip((ndvi_mean - ndvi_low) / (ndvi_high - ndvi_low), 0.0, 1.0))
        return round(avg + t * (potential - avg), 2)

    def predict_yield_from_indices(self, indices: Dict[str, float], crop_type: str = "Wheat") -> float:
        ndvi_mean = indices.get("ndvi_mean", 0.5)
        return self.predict_yield(ndvi_mean, crop_type)

    def save_model(self, path: str):
        try:
            with open(path, "wb") as f:
                pickle.dump({"model": self.model, "scaler": self.scaler, "is_trained": self.is_trained}, f)
            print(f"Yield model saved to {path}")
        except Exception as e:
            print(f"Error saving yield model: {e}")

    def load_model(self, path: str):
        try:
            if os.path.exists(path):
                with open(path, "rb") as f:
                    data = pickle.load(f)
                self.model = data["model"]
                self.scaler = data["scaler"]
                self.is_trained = data["is_trained"]
                print(f"Yield model loaded from {path}")
        except Exception as e:
            print(f"Error loading yield model: {e}")

    def get_yield_statistics(self, predictions: list) -> Dict[str, float]:
        if not predictions:
            return {}
        return {
            "mean_yield": float(np.mean(predictions)),
            "min_yield":  float(np.min(predictions)),
            "max_yield":  float(np.max(predictions)),
            "std_yield":  float(np.std(predictions)),
        }
