import pystac_client
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from config.settings import settings


class STACService:
    def __init__(self):
        self.catalog = pystac_client.Client.open(settings.stac_endpoint)
        self.collection = "sentinel-2-l2a"
        self._items_base = f"{settings.stac_endpoint}/collections/{self.collection}/items"

    # ------------------------------------------------------------------
    # Item metadata
    # ------------------------------------------------------------------

    def _fetch_item(self, scene_id: str) -> Optional[Dict]:
        """Fetch a single STAC item's full metadata from the catalog."""
        try:
            r = requests.get(f"{self._items_base}/{scene_id}", timeout=15)
            if r.ok:
                return r.json()
        except Exception as e:
            print(f"Error fetching STAC item {scene_id}: {e}")
        return None

    def get_scene_band_urls(self, scene_id: str, bands: List[str]) -> Dict[str, str]:
        """Return {band: href} for the requested bands of a scene."""
        item = self._fetch_item(scene_id)
        if not item:
            return {}
        assets = item.get("assets", {})
        return {b: assets[b]["href"] for b in bands if b in assets}

    def get_scene_asset_url(self, scene_id: str, band: str) -> str:
        urls = self.get_scene_band_urls(scene_id, [band])
        return urls.get(band, "")

    def get_scene_info(self, scene_id: str) -> Optional[Dict[str, Any]]:
        """Return scene metadata (datetime, cloud cover, bbox, bands)."""
        item = self._fetch_item(scene_id)
        if not item:
            return None
        props = item.get("properties", {})
        return {
            "scene_id":           item.get("id", scene_id),
            "collection":         item.get("collection", self.collection),
            "datetime":           props.get("datetime", ""),
            "cloud_percentage":   props.get("eo:cloud_cover", 0.0),
            "processing_level":   props.get("processing:level", "L2A"),
            "instrument":         props.get("platform", "sentinel-2"),
            "available_bands":    [k for k in item.get("assets", {}) if k.startswith("B")],
            "spatial_resolution": "10m",
            "bbox":               item.get("bbox", []),
        }

    # ------------------------------------------------------------------
    # STAC search
    # ------------------------------------------------------------------

    async def search_satellite_imagery(
        self,
        bbox: List[float],
        date_from: str,
        date_to: str,
        cloud_cover_max: float = 30.0,
    ) -> List[Dict[str, Any]]:
        """Search Sentinel-2 L2A imagery via the STAC catalog."""
        try:
            start = datetime.strptime(date_from, "%Y-%m-%d")
            end   = datetime.strptime(date_to,   "%Y-%m-%d")
            search = self.catalog.search(
                collections=[self.collection],
                bbox=bbox,
                datetime=f"{start.isoformat()}/{end.isoformat()}",
                query={"eo:cloud_cover": {"lt": cloud_cover_max}},
            )
            scenes = []
            for item in search.items():
                bands = [k for k in item.assets if k in ("B02", "B03", "B04", "B08", "B11", "B12")]
                scenes.append({
                    "scene_id":         item.id,
                    "datetime":         item.datetime.isoformat() if item.datetime else "",
                    "collection":       item.collection_id,
                    "available_bands":  bands,
                    "cloud_percentage": item.properties.get("eo:cloud_cover", 0),
                    "bbox":             list(item.bbox),
                })
            return scenes
        except Exception as e:
            print(f"Error searching STAC: {e}")
            return []
