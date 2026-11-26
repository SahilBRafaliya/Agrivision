from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import numpy as np

from services.stac_service import STACService
from services.raster_service import RasterService
from database.schemas import STACSearchRequest, STACScene, APIResponse

router = APIRouter(prefix="/satellite", tags=["satellite"])

stac_service = STACService()
raster_service = RasterService()

@router.get("/search", response_model=List[STACScene])
async def search_satellite_imagery(
    bbox: str,
    date_from: str,
    date_to: str,
    cloud_cover_max: float = 30.0
):
    """Search for satellite imagery using STAC"""
    try:
        # Parse bbox from string "min_lon,min_lat,max_lon,max_lat"
        bbox_list = [float(x.strip()) for x in bbox.split(',')]
        
        if len(bbox_list) != 4:
            raise HTTPException(status_code=400, detail="Invalid bbox format. Use: min_lon,min_lat,max_lon,max_lat")
        
        # Search for scenes
        scenes = await stac_service.search_satellite_imagery(
            bbox=bbox_list,
            date_from=date_from,
            date_to=date_to,
            cloud_cover_max=cloud_cover_max
        )
        
        # Convert to response format
        scene_list = []
        for scene in scenes:
            stac_scene = STACScene(
                scene_id=scene["scene_id"],
                datetime=scene["datetime"],
                collection=scene["collection"],
                available_bands=scene["available_bands"],
                cloud_percentage=scene["cloud_percentage"],
                bbox=scene["bbox"]
            )
            scene_list.append(stac_scene)
        
        return scene_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/true_color")
async def get_true_color_image(scene_id: str, bbox: str = None):
    """Generate true color image from satellite scene"""
    try:
        # Get band URLs for the scene
        red_url = stac_service.get_scene_asset_url(scene_id, "B04")
        green_url = stac_service.get_scene_asset_url(scene_id, "B03")
        blue_url = stac_service.get_scene_asset_url(scene_id, "B02")
        
        # Download bands
        bands = raster_service.load_bands_from_urls({
            "B04": red_url,
            "B03": green_url,
            "B02": blue_url
        })
        
        if not all(bands.values()):
            # Return mock data if bands can't be downloaded
            mock_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
            return {
                "success": True,
                "image_shape": mock_image.shape,
                "message": "Mock true color image generated",
                "scene_id": scene_id
            }
        
        # Create true color image
        true_color = raster_service.create_true_color_image(
            bands["B04"], bands["B03"], bands["B02"]
        )
        
        return {
            "success": True,
            "image_shape": true_color.shape,
            "message": "True color image generated successfully",
            "scene_id": scene_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bands/{scene_id}")
async def get_scene_bands(scene_id: str, bands: str = "B04,B03,B02,B08"):
    """Get specific bands for a scene"""
    try:
        band_list = bands.split(',')
        
        band_data = {}
        for band in band_list:
            url = stac_service.get_scene_asset_url(scene_id, band.strip())
            band_array = raster_service.download_band(url)
            
            if band_array is not None:
                band_data[band.strip()] = {
                    "shape": band_array.shape,
                    "statistics": raster_service.get_band_statistics(band_array)
                }
        
        return {
            "success": True,
            "scene_id": scene_id,
            "bands": band_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scene/{scene_id}")
async def get_scene_info(scene_id: str):
    """Get detailed information about a specific scene from the STAC catalog."""
    try:
        info = stac_service.get_scene_info(scene_id)
        if info:
            return info
        raise HTTPException(status_code=404, detail=f"Scene '{scene_id}' not found in STAC catalog")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
