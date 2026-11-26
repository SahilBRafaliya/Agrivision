import numpy as np
from typing import Dict, Tuple

class VegetationIndicesService:
    def __init__(self):
        pass
    
    def calculate_ndvi(self, red_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
        """
        Calculate Normalized Difference Vegetation Index (NDVI)
        
        NDVI = (NIR - RED) / (NIR + RED)
        
        Args:
            red_band: Red band (B04)
            nir_band: Near Infrared band (B08)
        
        Returns:
            NDVI array
        """
        try:
            # Avoid division by zero
            denominator = nir_band + red_band
            ndvi = np.where(denominator != 0, (nir_band - red_band) / denominator, 0)
            
            # Clip to valid range [-1, 1]
            ndvi = np.clip(ndvi, -1, 1)
            
            return ndvi
        except Exception as e:
            print(f"Error calculating NDVI: {e}")
            return np.zeros_like(red_band)
    
    def calculate_ndwi(self, green_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
        """
        Calculate Normalized Difference Water Index (NDWI)
        
        NDWI = (GREEN - NIR) / (GREEN + NIR)
        
        Args:
            green_band: Green band (B03)
            nir_band: Near Infrared band (B08)
        
        Returns:
            NDWI array
        """
        try:
            # Avoid division by zero
            denominator = green_band + nir_band
            ndwi = np.where(denominator != 0, (green_band - nir_band) / denominator, 0)
            
            # Clip to valid range [-1, 1]
            ndwi = np.clip(ndwi, -1, 1)
            
            return ndwi
        except Exception as e:
            print(f"Error calculating NDWI: {e}")
            return np.zeros_like(green_band)
    
    def calculate_evi(self, red_band: np.ndarray, nir_band: np.ndarray, blue_band: np.ndarray) -> np.ndarray:
        """
        Calculate Enhanced Vegetation Index (EVI)
        
        EVI = 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
        
        Args:
            red_band: Red band (B04)
            nir_band: Near Infrared band (B08)
            blue_band: Blue band (B02)
        
        Returns:
            EVI array
        """
        try:
            # Avoid division by zero
            denominator = nir_band + 6 * red_band - 7.5 * blue_band + 1
            evi = np.where(denominator != 0, 2.5 * (nir_band - red_band) / denominator, 0)
            
            # Clip to reasonable range
            evi = np.clip(evi, -1, 1)
            
            return evi
        except Exception as e:
            print(f"Error calculating EVI: {e}")
            return np.zeros_like(red_band)
    
    def calculate_all_indices(self, bands: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """
        Calculate all vegetation indices
        
        Args:
            bands: Dictionary containing band arrays
        
        Returns:
            Dictionary containing all calculated indices
        """
        indices = {}
        
        try:
            # Check if required bands are available
            if 'B04' in bands and 'B08' in bands:
                indices['ndvi'] = self.calculate_ndvi(bands['B04'], bands['B08'])
            
            if 'B03' in bands and 'B08' in bands:
                indices['ndwi'] = self.calculate_ndwi(bands['B03'], bands['B08'])
            
            if 'B02' in bands and 'B04' in bands and 'B08' in bands:
                indices['evi'] = self.calculate_evi(bands['B04'], bands['B08'], bands['B02'])
        
        except Exception as e:
            print(f"Error calculating indices: {e}")
        
        return indices
    
    def get_index_statistics(self, index_array: np.ndarray) -> Dict[str, float]:
        """Get statistics for a vegetation index"""
        return {
            "mean": float(np.mean(index_array)),
            "min": float(np.min(index_array)),
            "max": float(np.max(index_array)),
            "std": float(np.std(index_array))
        }
    
    def classify_vegetation_health(self, ndvi: np.ndarray) -> Dict[str, float]:
        """
        Classify vegetation health based on NDVI values
        
        Args:
            ndvi: NDVI array
        
        Returns:
            Dictionary with health statistics
        """
        try:
            # NDVI-based classification
            healthy = np.sum(ndvi > 0.6) / ndvi.size * 100
            moderate = np.sum((ndvi >= 0.3) & (ndvi <= 0.6)) / ndvi.size * 100
            stressed = np.sum(ndvi < 0.3) / ndvi.size * 100
            
            return {
                "healthy_percentage": healthy,
                "moderate_percentage": moderate,
                "stressed_percentage": stressed,
                "overall_health_score": float(np.mean(ndvi))
            }
        except Exception as e:
            print(f"Error classifying vegetation health: {e}")
            return {
                "healthy_percentage": 0.0,
                "moderate_percentage": 0.0,
                "stressed_percentage": 0.0,
                "overall_health_score": 0.0
            }
