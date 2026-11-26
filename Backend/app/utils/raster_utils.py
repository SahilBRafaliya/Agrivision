import numpy as np
import rasterio
from rasterio.transform import from_bounds
from typing import Tuple, Dict, Any
import io

def create_mock_raster_data(shape: Tuple[int, int], band_type: str = "vegetation") -> np.ndarray:
    """Create mock raster data for testing"""
    height, width = shape
    
    if band_type == "vegetation":
        # Simulate vegetation-like patterns
        x = np.linspace(0, 4*np.pi, width)
        y = np.linspace(0, 4*np.pi, height)
        X, Y = np.meshgrid(x, y)
        
        # Create patterns that look like vegetation
        data = 0.3 + 0.2 * np.sin(X/2) * np.cos(Y/2) + 0.1 * np.random.randn(height, width)
        
    elif band_type == "water":
        # Simulate water-like patterns (lower values)
        x = np.linspace(0, 2*np.pi, width)
        y = np.linspace(0, 2*np.pi, height)
        X, Y = np.meshgrid(x, y)
        
        data = 0.1 + 0.05 * np.sin(X) * np.cos(Y) + 0.02 * np.random.randn(height, width)
        
    else:
        # Generic pattern
        data = np.random.rand(height, width) * 0.4 + 0.1
    
    # Ensure values are in reasonable range
    data = np.clip(data, 0, 1)
    
    return data

def create_georeferenced_raster(data: np.ndarray, bbox: List[float], output_path: str = None) -> bytes:
    """Create a georeferenced raster from data"""
    try:
        height, width = data.shape
        min_lon, min_lat, max_lon, max_lat = bbox
        
        # Create transform
        transform = from_bounds(min_lon, min_lat, max_lon, max_lat, width, height)
        
        # Create in-memory raster
        if output_path:
            # Write to file
            with rasterio.open(
                output_path,
                'w',
                driver='GTiff',
                height=height,
                width=width,
                count=1,
                dtype=data.dtype,
                crs='EPSG:4326',
                transform=transform
            ) as dst:
                dst.write(data, 1)
            return None
        else:
            # Return as bytes
            with io.BytesIO() as buffer:
                with rasterio.open(
                    buffer,
                    'w',
                    driver='GTiff',
                    height=height,
                    width=width,
                    count=1,
                    dtype=data.dtype,
                    crs='EPSG:4326',
                    transform=transform
                ) as dst:
                    dst.write(data, 1)
                return buffer.getvalue()
    
    except Exception as e:
        print(f"Error creating georeferenced raster: {e}")
        return None

def resample_array(data: np.ndarray, target_shape: Tuple[int, int], method: str = "nearest") -> np.ndarray:
    """Resample array to target shape"""
    try:
        from scipy.ndimage import zoom
        height, width = data.shape
        target_height, target_width = target_shape
        
        scale_factor = (target_height / height, target_width / width)
        
        if method == "nearest":
            order = 0
        elif method == "bilinear":
            order = 1
        elif method == "cubic":
            order = 3
        else:
            order = 0
        
        return zoom(data, scale_factor, order=order)
    
    except Exception as e:
        print(f"Error resampling array: {e}")
        # Fallback: simple resize
        from PIL import Image
        img = Image.fromarray(data)
        img_resized = img.resize((target_shape[1], target_shape[0]), Image.NEAREST)
        return np.array(img_resized)

def apply_gaussian_filter(data: np.ndarray, sigma: float = 1.0) -> np.ndarray:
    """Apply Gaussian filter to smooth data"""
    try:
        from scipy.ndimage import gaussian_filter
        return gaussian_filter(data, sigma=sigma)
    except:
        return data

def calculate_histogram(data: np.ndarray, bins: int = 256) -> Tuple[np.ndarray, np.ndarray]:
    """Calculate histogram of raster data"""
    try:
        hist, bin_edges = np.histogram(data.flatten(), bins=bins, range=(data.min(), data.max()))
        return hist, bin_edges
    except:
        return np.array([]), np.array([])

def normalize_array(data: np.ndarray, method: str = "minmax") -> np.ndarray:
    """Normalize array values"""
    try:
        if method == "minmax":
            min_val = np.min(data)
            max_val = np.max(data)
            if max_val > min_val:
                return (data - min_val) / (max_val - min_val)
            else:
                return np.zeros_like(data)
        
        elif method == "zscore":
            mean_val = np.mean(data)
            std_val = np.std(data)
            if std_val > 0:
                return (data - mean_val) / std_val
            else:
                return np.zeros_like(data)
        
        else:
            return data
    
    except:
        return data

def detect_outliers(data: np.ndarray, method: str = "iqr") -> np.ndarray:
    """Detect outliers in raster data"""
    try:
        if method == "iqr":
            q1 = np.percentile(data, 25)
            q3 = np.percentile(data, 75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            return (data < lower_bound) | (data > upper_bound)
        
        elif method == "zscore":
            z_scores = np.abs((data - np.mean(data)) / np.std(data))
            return z_scores > 3
        
        else:
            return np.zeros_like(data, dtype=bool)
    
    except:
        return np.zeros_like(data, dtype=bool)

def create_composite_image(bands: Dict[str, np.ndarray], rgb_bands: List[str] = ["B04", "B03", "B02"]) -> np.ndarray:
    """Create RGB composite from multiple bands"""
    try:
        if len(rgb_bands) != 3:
            raise ValueError("RGB bands must be exactly 3 bands")
        
        # Get the specified bands
        red_band = bands.get(rgb_bands[0])
        green_band = bands.get(rgb_bands[1])
        blue_band = bands.get(rgb_bands[2])
        
        if None in [red_band, green_band, blue_band]:
            raise ValueError("One or more RGB bands not found")
        
        # Ensure all bands have the same shape
        target_shape = red_band.shape
        green_band = resample_array(green_band, target_shape)
        blue_band = resample_array(blue_band, target_shape)
        
        # Stack bands
        rgb = np.stack([red_band, green_band, blue_band], axis=2)
        
        # Normalize to 0-255
        rgb_normalized = np.zeros_like(rgb)
        for i in range(3):
            band = rgb[:, :, i]
            band_normalized = normalize_array(band, "minmax") * 255
            rgb_normalized[:, :, i] = band_normalized
        
        return rgb_normalized.astype(np.uint8)
    
    except Exception as e:
        print(f"Error creating composite image: {e}")
        return np.zeros((100, 100, 3), dtype=np.uint8)
