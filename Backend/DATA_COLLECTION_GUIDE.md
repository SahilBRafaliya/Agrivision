# Data Collection & Model Training Guide

## Overview

This guide explains how to collect real satellite data and train ML models for crop classification and yield prediction.

## Architecture

```
Real Satellite Data (Sentinel-2)
         ↓
   [STAC API Search] (Microsoft Planetary Computer)
         ↓
   [Download Bands: B02, B03, B04, B08]
         ↓
   [Calculate Vegetation Indices: NDVI, NDWI, EVI]
         ↓
   [Extract SSL Features: ResNet-18]
         ↓
   [Manual Crop Labeling: Wheat/Rice/Cotton/etc]
         ↓
   [Save to training_dataset.csv]
         ↓
   [Train Random Forest Models]
         ↓
   [Deploy to Production]
```

## Data Sources

### Sentinel-2 L2A Satellite Imagery

- **Provider:** Microsoft Planetary Computer (STAC API)
- **Spatial Resolution:** 10 meters
- **Temporal Resolution:** 5-day revisit cycle
- **Free Access:** Yes
- **Endpoint:** https://planetarycomputer.microsoft.com/api/stac/v1

### Key Bands Used

| Band | Wavelength (nm) | Purpose |
|------|----------------|---------|
| B02  | 490            | Blue (NDVI, EVI calculation) |
| B03  | 560            | Green (NDWI calculation) |
| B04  | 665            | Red (NDVI, EVI calculation) |
| B08  | 842            | Near Infrared (NDVI, NDWI, EVI) |

## Step-by-Step Data Collection

### Step 1: Prepare Your Location Data

Identify agricultural regions you want to monitor. Get their bounding boxes:

```
Format: [longitude_min, latitude_min, longitude_max, latitude_max]

Example regions in India:
- Maharashtra:  [73.8, 18.0, 75.8, 20.0]
- Punjab:       [73.5, 29.5, 77.0, 33.0]
- Haryana:      [75.5, 27.0, 78.0, 30.5]
- Rajasthan:    [69.0, 23.0, 77.0, 30.0]
- Karnataka:    [74.5, 11.5, 78.5, 18.5]
```

### Step 2: Run Data Collection Script

```bash
cd Backend
python collect_data.py
```

### Step 3: Manual Labeling Process

For each satellite image:
1. Review the satellite statistics
   - **NDVI:** Vegetation greenness (-1 to 1)
   - **NDWI:** Water content/stress
   - **EVI:** Enhanced vegetation index
   - **Cloud Cover:** Atmospheric condition

2. Decide crop type based on:
   - Visual appearance in satellite image
   - Vegetation index patterns
   - Known farming practices in the region

3. Select crop from menu:
   ```
   1. Wheat    → NDVI: 0.60-0.85, high in winter
   2. Rice     → NDVI: 0.50-0.75, needs water
   3. Cotton   → NDVI: 0.40-0.65, moderate
   4. Sugarcane → NDVI: 0.50-0.70, stable growth
   5. Soybean  → NDVI: 0.40-0.70, seasonal
   6. Maize    → NDVI: 0.55-0.80, high growth
   ```

### Step 4: Collect Minimum Samples

**Recommendation:** 
- **Minimum:** 30 total samples (5 per crop type)
- **Good:** 100-200 samples (15-30 per crop type)
- **Excellent:** 500+ samples (100+ per crop type)

Sample distribution improves model performance.

### Step 5: Train Models

Once you have enough samples, train the models:

```bash
python train_from_data.py
```

This will:
1. Load all labeled samples from `training_dataset.csv`
2. Calculate feature statistics
3. Train Random Forest models for:
   - Crop classification (6 classes)
   - Yield prediction (continuous output)
4. Save models to `app/models/`

## Understanding Vegetation Indices

### NDVI (Normalized Difference Vegetation Index)
```
NDVI = (NIR - RED) / (NIR + RED)
Range: -1 to 1
- < 0.3: Bare soil, water, or stressed vegetation
- 0.3-0.6: Moderate vegetation
- > 0.6: Healthy, dense vegetation
```

### NDWI (Normalized Difference Water Index)
```
NDWI = (GREEN - NIR) / (GREEN + NIR)
Range: -1 to 1
- > 0.3: Water bodies, flooded rice
- 0.0-0.3: Moderate water content
- < 0.0: Dry conditions, water stress
```

### EVI (Enhanced Vegetation Index)
```
EVI = 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
Range: -1 to 1
- More sensitive to dense vegetation
- Better for areas with high vegetation cover
```

## Crop-Specific Signatures

Learn these patterns to accurately label crops:

### Wheat
- **Season:** Winter (Oct-May)
- **NDVI:** 0.60-0.85 (peaks at flowering)
- **NDWI:** Slightly negative
- **Growth:** Rapid vegetative phase, heading, grain fill

### Rice
- **Season:** Summer/Monsoon (Jun-Oct)
- **NDVI:** 0.50-0.75 (moderate growth)
- **NDWI:** > 0.0 (needs flooded paddies)
- **Growth:** Tillering, panicle, grain maturation

### Cotton
- **Season:** Summer (Mar-Oct)
- **NDVI:** 0.40-0.65 (slower growth)
- **NDWI:** Negative (drought tolerant)
- **Growth:** Vegetative, flowering, boll development

### Sugarcane
- **Season:** Year-round (perennial, 12-14 months)
- **NDVI:** 0.50-0.70 (stable)
- **NDWI:** Moderate (regular irrigation)
- **Growth:** Constant biomass accumulation

### Soybean
- **Season:** Summer/Monsoon (Jun-Sep)
- **NDVI:** 0.40-0.70 (increases mid-season)
- **NDWI:** Slightly negative to neutral
- **Growth:** Rapid vegetative, flowering, pod fill

### Maize
- **Season:** Summer/Monsoon (Apr-Sep)
- **NDVI:** 0.55-0.80 (peaks at anthesis)
- **NDWI:** Moderate (water demand)
- **Growth:** Rapid vegetative, silking, grain fill

## File Structure

```
Backend/
├── collect_data.py           # Interactive data collection
├── train_from_data.py        # Train models from collected data
├── train_models.py           # Train with synthetic data (demo)
└── app/
    ├── models/
    │   ├── training_dataset.csv      # Your collected data
    │   ├── ssl_encoder.pth           # Pre-trained feature extractor
    │   ├── crop_model.pkl            # Crop classifier
    │   └── yield_model.pkl           # Yield predictor
    └── services/
        ├── stac_service.py           # Sentinel-2 data access
        ├── indices_service.py        # Vegetation indices
        ├── ssl_service.py            # Feature extraction
        └── crop_service.py           # Crop prediction
```

## Training Dataset Format

`training_dataset.csv`:
```csv
scene_id,datetime,crop_type,ndvi_mean,ndwi_mean,evi_mean,ndvi_std,ndwi_std,evi_std,cloud_percentage,labeled_at
S2A_123456,2024-05-15T05:15:00,Wheat,0.72,0.05,0.45,0.08,0.12,0.15,5.2,2024-05-15T10:30:00
S2B_234567,2024-05-14T05:25:00,Rice,0.68,0.18,0.42,0.10,0.15,0.18,8.1,2024-05-15T11:00:00
```

## Tips for Accurate Labeling

1. **Check Cloud Cover:** Skip images with >20% clouds
2. **Verify Indices:** 
   - Wheat should show high NDVI (>0.6)
   - Rice should show positive NDWI (>0)
   - Compare with typical ranges
3. **Use Multiple Scenes:** Same field across different dates improves model
4. **Balance Crops:** Try to collect similar amounts of each crop type
5. **Document Metadata:** Note weather, irrigation status if known

## Model Performance Expectations

### With 30 samples (minimum):
- Accuracy: ~70%
- Limited generalization

### With 100 samples:
- Accuracy: ~80-85%
- Good for regional use

### With 500+ samples:
- Accuracy: ~90%+
- Production ready

## Troubleshooting

### No scenes found
- Check date range (older dates more likely to have data)
- Verify bounding box coordinates
- Reduce cloud cover threshold

### Download fails
- Check internet connection
- STAC API might be rate-limited
- Try different date range

### Model training fails
- Check CSV format (no missing columns)
- Ensure crop_type matches exact names
- Verify numeric columns are valid floats

## Advanced Options

### Multi-temporal Analysis
Collect same field across growing season to track crop development:
```
Field ABC:
- April 1: Early growth (low NDVI ~0.4)
- May 15: Mid-season (high NDVI ~0.7)
- June 30: Maturity (very high NDVI ~0.8)
```

### Regional Models
Train separate models for different regions with different crop patterns:
```
North India: Wheat, Rice, Sugarcane
South India: Rice, Cotton, Sugarcane
Western India: Cotton, Groundnut, Soybean
```

## API Integration

Once models are trained, use them via API:

```bash
curl -X POST http://localhost:8000/ai/analysis \
  -H "Content-Type: application/json" \
  -d '{"scene_id": "S2A_123456", "crop_type": "Wheat"}'
```

## Next Steps

1. Collect 50-100 labeled samples
2. Train models: `python train_from_data.py`
3. Deploy backend: `python main.py`
4. Test predictions via admin dashboard
5. Collect more samples to improve accuracy
6. Iterate and refine

---

**Questions?** Check the RESEARCH_README.md for technical details.
