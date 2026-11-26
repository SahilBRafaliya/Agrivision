import time
import rasterio
from rasterio.enums import Resampling
import numpy as np
import requests
from typing import Optional, Tuple

_PC_TOKEN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a"

class RasterService:
    def __init__(self):
        self._sas_token: str = ""
        self._token_expiry: float = 0.0

    # ------------------------------------------------------------------
    # Planetary Computer SAS signing
    # ------------------------------------------------------------------

    def _get_sas_token(self) -> str:
        if time.time() < self._token_expiry:
            return self._sas_token
        try:
            r = requests.get(_PC_TOKEN_URL, timeout=10)
            if r.ok:
                data = r.json()
                self._sas_token = data.get("token", "")
                self._token_expiry = time.time() + 3000  # refresh before 1 h expiry
        except Exception as e:
            print(f"Warning: could not refresh PC SAS token: {e}")
        return self._sas_token

    def _sign_url(self, href: str) -> str:
        """Append a SAS token to Azure Blob Storage URLs from Planetary Computer."""
        if not href or "blob.core.windows.net" not in href:
            return href
        token = self._get_sas_token()
        if not token:
            return href
        sep = "&" if "?" in href else "?"
        return f"{href}{sep}{token}"

    # ------------------------------------------------------------------
    # Band downloading
    # ------------------------------------------------------------------

    def download_band(self, url: str, out_size: int = 256) -> Optional[np.ndarray]:
        """
        Download a Sentinel-2 L2A band as a float32 array in 0–1 reflectance.
        Uses rasterio COG virtual reads so only the required tiles are fetched.
        """
        if not url:
            return None
        try:
            signed = self._sign_url(url)
            with rasterio.open(signed) as src:
                data = src.read(
                    1,
                    out_shape=(out_size, out_size),
                    resampling=Resampling.bilinear,
                )
            # Sentinel-2 L2A stores surface reflectance as 0–10 000 integers
            data = data.astype(np.float32) / 10000.0
            return np.clip(data, 0.0, 1.0)
        except Exception as e:
            print(f"Error downloading band from {url}: {e}")
            return None

    def load_bands_from_urls(self, band_urls: dict, out_size: int = 256) -> dict:
        """Load multiple bands; returns only bands that downloaded successfully."""
        bands = {}
        for name, url in band_urls.items():
            arr = self.download_band(url, out_size)
            if arr is not None:
                bands[name] = arr
        return bands

    # ------------------------------------------------------------------
    # Image creation & statistics
    # ------------------------------------------------------------------

    def create_true_color_image(
        self,
        red_band: np.ndarray,
        green_band: np.ndarray,
        blue_band: np.ndarray,
    ) -> np.ndarray:
        try:
            rgb = np.stack([red_band, green_band, blue_band], axis=2)
            out = np.zeros_like(rgb)
            for i in range(3):
                ch = rgb[:, :, i]
                lo, hi = np.percentile(ch, 2), np.percentile(ch, 98)
                if hi > lo:
                    out[:, :, i] = np.clip((ch - lo) / (hi - lo) * 255, 0, 255)
            return out.astype(np.uint8)
        except Exception as e:
            print(f"Error creating true color image: {e}")
            return np.zeros((100, 100, 3), dtype=np.uint8)

    def get_band_statistics(self, band: np.ndarray) -> dict:
        return {
            "min":  float(np.min(band)),
            "max":  float(np.max(band)),
            "mean": float(np.mean(band)),
            "std":  float(np.std(band)),
        }

    def resample_bands(self, bands: dict, target_shape: Tuple[int, int]) -> dict:
        from scipy.ndimage import zoom
        resampled = {}
        for name, data in bands.items():
            if data.shape != target_shape:
                scale = (target_shape[0] / data.shape[0], target_shape[1] / data.shape[1])
                resampled[name] = zoom(data, scale, order=0)
            else:
                resampled[name] = data
        return resampled
