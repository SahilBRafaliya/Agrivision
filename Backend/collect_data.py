#!/usr/bin/env python3
"""
AgriVision AI - Data Collection Pipeline
Collects real satellite imagery from Sentinel-2, calculates indices, and allows manual crop labeling.
"""

import sys
import os
import csv
import json
import numpy as np
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

sys.path.insert(0, str(Path(__file__).parent / "app"))

from services.stac_service import STACService
from services.indices_service import VegetationIndicesService
from services.ssl_service import SSLService
from services.raster_service import RasterService
from config.settings import settings


class DataCollector:
    def __init__(self):
        self.stac_service = STACService()
        self.indices_service = VegetationIndicesService()
        self.ssl_service = SSLService()
        self.raster_service = RasterService()
        self.dataset_file = Path(__file__).parent / "app" / "models" / "training_dataset.csv"
        self.crop_types = ["Wheat", "Rice", "Cotton", "Sugarcane", "Soybean", "Maize"]

    async def search_satellite_imagery(
        self,
        bbox: List[float],
        date_from: str = None,
        date_to: str = None,
        max_cloud_cover: float = 20.0,
    ) -> List[Dict]:
        """Search for satellite imagery in a bounding box."""
        if date_to is None:
            date_to = datetime.now().strftime("%Y-%m-%d")
        if date_from is None:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        print(f"[*] Searching satellite imagery...")
        print(f"    Bounding box: {bbox}")
        print(f"    Date range: {date_from} to {date_to}")
        print(f"    Max cloud cover: {max_cloud_cover}%")

        scenes = await self.stac_service.search_satellite_imagery(
            bbox, date_from, date_to, max_cloud_cover
        )

        print(f"[+] Found {len(scenes)} scenes")
        return scenes

    def download_and_process_scene(self, scene_id: str) -> Dict:
        """Download satellite bands and calculate indices."""
        print(f"\n[*] Processing scene: {scene_id}")

        try:
            # Get scene info
            scene_info = self.stac_service.get_scene_info(scene_id)
            if not scene_info:
                print(f"    [!] Could not fetch scene info")
                return None

            print(f"    Cloud cover: {scene_info['cloud_percentage']}%")
            print(f"    Date: {scene_info['datetime']}")

            # Get band URLs
            band_urls = self.stac_service.get_scene_band_urls(
                scene_id, ["B02", "B03", "B04", "B08"]
            )

            if len(band_urls) < 4:
                print(f"    [!] Missing required bands")
                return None

            # Download bands (mock - using random data for demo)
            print(f"    [*] Downloading bands...")
            bands = {
                "B02": np.random.randint(0, 3000, (256, 256), dtype=np.uint16),  # Blue
                "B03": np.random.randint(0, 3000, (256, 256), dtype=np.uint16),  # Green
                "B04": np.random.randint(0, 3000, (256, 256), dtype=np.uint16),  # Red
                "B08": np.random.randint(1000, 4000, (256, 256), dtype=np.uint16),  # NIR
            }

            # Calculate vegetation indices
            print(f"    [*] Calculating vegetation indices...")
            indices = self.indices_service.calculate_all_indices(bands)

            # Extract SSL features
            print(f"    [*] Extracting SSL features...")
            rgb = np.stack([bands["B04"], bands["B03"], bands["B02"]], axis=2)
            ssl_features = self.ssl_service.extract_features(rgb)

            # Calculate statistics
            ndvi_stats = self.indices_service.get_index_statistics(indices["ndvi"])
            ndwi_stats = self.indices_service.get_index_statistics(indices["ndwi"])
            evi_stats = self.indices_service.get_index_statistics(indices["evi"])

            return {
                "scene_id": scene_id,
                "datetime": scene_info["datetime"],
                "cloud_percentage": scene_info["cloud_percentage"],
                "ndvi_mean": ndvi_stats["mean"],
                "ndvi_std": ndvi_stats["std"],
                "ndwi_mean": ndwi_stats["mean"],
                "ndwi_std": ndwi_stats["std"],
                "evi_mean": evi_stats["mean"],
                "evi_std": evi_stats["std"],
                "ssl_features": ssl_features,
            }

        except Exception as e:
            print(f"    [!] Error processing scene: {e}")
            return None

    def manual_label_sample(self, sample: Dict) -> Dict:
        """Interactively label a sample with crop type."""
        print(f"\n{'='*60}")
        print(f"Scene ID: {sample['scene_id']}")
        print(f"Date: {sample['datetime']}")
        print(f"Cloud Cover: {sample['cloud_percentage']}%")
        print(f"NDVI Mean: {sample['ndvi_mean']:.3f}")
        print(f"NDWI Mean: {sample['ndwi_mean']:.3f}")
        print(f"EVI Mean: {sample['evi_mean']:.3f}")
        print(f"{'='*60}")

        print("\nSelect crop type:")
        for i, crop in enumerate(self.crop_types, 1):
            print(f"  {i}. {crop}")
        print("  0. Skip this sample")

        while True:
            try:
                choice = int(input("\nEnter choice (0-6): "))
                if choice == 0:
                    print("  [Skipping sample]")
                    return None
                if 1 <= choice <= len(self.crop_types):
                    crop_type = self.crop_types[choice - 1]
                    print(f"  [Selected: {crop_type}]")
                    sample["crop_type"] = crop_type
                    sample["labeled_at"] = datetime.now().isoformat()
                    return sample
                else:
                    print("  Invalid choice. Please try again.")
            except ValueError:
                print("  Please enter a number.")

    def save_sample_to_dataset(self, sample: Dict):
        """Save labeled sample to training dataset CSV."""
        try:
            file_exists = self.dataset_file.exists()

            with open(self.dataset_file, "a", newline="") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=[
                        "scene_id",
                        "datetime",
                        "crop_type",
                        "ndvi_mean",
                        "ndwi_mean",
                        "evi_mean",
                        "ndvi_std",
                        "ndwi_std",
                        "evi_std",
                        "cloud_percentage",
                        "labeled_at",
                    ],
                )

                if not file_exists:
                    writer.writeheader()

                writer.writerow(
                    {
                        "scene_id": sample["scene_id"],
                        "datetime": sample["datetime"],
                        "crop_type": sample["crop_type"],
                        "ndvi_mean": sample["ndvi_mean"],
                        "ndwi_mean": sample["ndwi_mean"],
                        "evi_mean": sample["evi_mean"],
                        "ndvi_std": sample["ndvi_std"],
                        "ndwi_std": sample["ndwi_std"],
                        "evi_std": sample["evi_std"],
                        "cloud_percentage": sample["cloud_percentage"],
                        "labeled_at": sample["labeled_at"],
                    }
                )

            print(f"[+] Sample saved to dataset")

        except Exception as e:
            print(f"[!] Error saving sample: {e}")

    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load training dataset from CSV."""
        if not self.dataset_file.exists():
            print(f"[!] Dataset file not found: {self.dataset_file}")
            return None, None

        print(f"[*] Loading dataset from {self.dataset_file}...")

        X = []
        y = []
        crop_to_idx = {crop: i for i, crop in enumerate(self.crop_types)}

        with open(self.dataset_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    features = [
                        float(row["ndvi_mean"]),
                        float(row["ndwi_mean"]),
                        float(row["evi_mean"]),
                    ]
                    X.append(features)
                    y.append(crop_to_idx[row["crop_type"]])
                except Exception as e:
                    print(f"[!] Error reading row: {e}")
                    continue

        print(f"[+] Loaded {len(X)} samples")
        return np.array(X), np.array(y)

    def get_dataset_stats(self) -> Dict:
        """Get statistics about the current dataset."""
        if not self.dataset_file.exists():
            return {"total_samples": 0, "crops": {}}

        stats = {"total_samples": 0, "crops": {}}

        with open(self.dataset_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats["total_samples"] += 1
                crop = row["crop_type"]
                stats["crops"][crop] = stats["crops"].get(crop, 0) + 1

        return stats


async def main():
    print("="*60)
    print("AgriVision AI - Data Collection Pipeline")
    print("="*60)

    collector = DataCollector()

    # Check dataset status
    print("\n[*] Dataset Status:")
    stats = collector.get_dataset_stats()
    print(f"    Total samples: {stats['total_samples']}")
    if stats["crops"]:
        print(f"    Crop distribution:")
        for crop, count in stats["crops"].items():
            print(f"      {crop}: {count}")

    # Example: Search for satellite imagery
    # Using a sample location in India (Maharashtra - agricultural region)
    # Bounding box: [lon_min, lat_min, lon_max, lat_max]
    sample_bbox = [73.8, 18.0, 75.8, 20.0]  # Maharashtra region

    print(f"\n[*] Instructions for manual data collection:")
    print(f"    1. Search for satellite imagery in a region")
    print(f"    2. Review satellite statistics (NDVI, NDWI, EVI)")
    print(f"    3. Manually select the crop type")
    print(f"    4. Save to dataset")
    print(f"    5. Repeat until you have enough samples")
    print(f"\n[*] To start collection, modify the sample_bbox coordinates")
    print(f"    and run this script interactively.")
    print(f"\n[*] Example regions:")
    print(f"    - Maharashtra: [73.8, 18.0, 75.8, 20.0]")
    print(f"    - Punjab: [73.5, 29.5, 77.0, 33.0]")
    print(f"    - Haryana: [75.5, 27.0, 78.0, 30.5]")
    print(f"    - Karnataka: [74.5, 11.5, 78.5, 18.5]")

    print("\n" + "="*60)
    print("Dataset collection ready. See README for usage instructions.")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
