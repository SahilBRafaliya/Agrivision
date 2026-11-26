# AgriVision AI - Data Collection Quick Start

## How to Collect Training Data

### Option 1: Quick Start with Sample Data (Testing)

Already trained with synthetic data:
```bash
# Models are ready in Backend/app/models/
# Start the backend
cd Backend
python main.py  # Now runs on port 8000
```

### Option 2: Collect Real Satellite Data (Recommended)

#### Step 1: Interactive Data Collection

```bash
cd Backend

# Edit collect_data.py to add interactive prompts
# Then run data collection
python collect_data.py
```

This will guide you through:
1. Select agricultural region (provide lat/lon)
2. Search Sentinel-2 satellite imagery
3. Review vegetation indices (NDVI, NDWI, EVI)
4. Manually label crop type
5. Save to dataset

#### Step 2: Train Models on Collected Data

```bash
python train_from_data.py
```

This trains:
- Crop classifier (Random Forest)
- Yield predictor (Random Forest)
- Uses ResNet-18 SSL features

#### Step 3: Deploy

```bash
python main.py
```

---

## Data Collection Workflow

### Full Workflow:

```
1. STAC API Search
   ↓
2. Download Sentinel-2 Bands (B02, B03, B04, B08)
   ↓
3. Calculate Indices (NDVI, NDWI, EVI)
   ↓
4. Extract SSL Features (ResNet-18)
   ↓
5. Manual Labeling (Human Decision)
   ↓
6. Save to CSV
   ↓
7. Train Models
   ↓
8. Deploy & Use
```

### Files Created:

```
Backend/
├── collect_data.py              # Data collection script
├── train_from_data.py           # Train from collected data
├── DATA_COLLECTION_GUIDE.md     # Detailed guide
└── app/models/
    └── training_dataset.csv     # Your collected data (created on first collection)
```

---

## Vegetation Index Quick Reference

### NDVI (Vegetation Greenness)
- **Wheat:** 0.60-0.85 ✓ (high)
- **Rice:** 0.50-0.75 ✓
- **Cotton:** 0.40-0.65
- **Sugarcane:** 0.50-0.70
- **Soybean:** 0.40-0.70
- **Maize:** 0.55-0.80

### NDWI (Water Content)
- **Rice:** > 0 (flooded paddies)
- **Sugarcane:** 0 to 0.2 (regular water)
- **Wheat:** Negative (dry)
- **Cotton:** Negative (drought tolerant)

### EVI (Dense Vegetation)
- Complements NDVI
- Better for thick canopy crops
- Same overall pattern as NDVI

---

## Sample Locations (India)

```
Maharashtra:     [73.8, 18.0, 75.8, 20.0]
Punjab:          [73.5, 29.5, 77.0, 33.0]
Haryana:         [75.5, 27.0, 78.0, 30.5]
Rajasthan:       [69.0, 23.0, 77.0, 30.0]
Karnataka:       [74.5, 11.5, 78.5, 18.5]
Uttar Pradesh:   [77.0, 24.0, 84.0, 30.0]
Andhra Pradesh:  [77.0, 13.0, 85.0, 19.0]
```

---

## Minimum Data Requirements

| Samples | Quality | Use Case |
|---------|---------|----------|
| 30      | Low     | Testing, demo |
| 100     | Fair    | Regional testing |
| 500+    | Good    | Production |
| 1000+   | Excellent | Multiple regions |

**Per Crop Type:** At least 5 samples, ideally 50+

---

## Data Collection Checklist

- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Backend runs: `python app/main.py`
- [ ] STAC API accessible (check internet connection)
- [ ] Select agricultural region
- [ ] Collect 30+ satellite scenes
- [ ] Manually label each with crop type
- [ ] Train models: `python train_from_data.py`
- [ ] Test predictions via admin dashboard
- [ ] Collect more data to improve

---

## API After Training

```bash
# Health check
curl http://localhost:8000/health

# Search satellite imagery
curl -X POST http://localhost:8000/satellite/search \
  -H "Content-Type: application/json" \
  -d '{"bbox": [73.8, 18.0, 75.8, 20.0], "date_from": "2024-05-01"}'

# Get AI analysis
curl -X POST http://localhost:8000/ai/analysis \
  -H "Content-Type: application/json" \
  -d '{"scene_id": "S2A_123456"}'
```

---

## Next Steps

1. **Immediate:** Run with synthetic data
   ```bash
   cd Backend
   python main.py
   ```

2. **Soon:** Collect real data
   ```bash
   python collect_data.py
   ```

3. **Later:** Build more data
   - Collect 500+ samples
   - Train multiple regional models
   - Improve accuracy with feedback

---

## Troubleshooting

**Q: No satellite imagery found?**
- ✓ Check date range (use recent dates)
- ✓ Verify bounding box format
- ✓ Reduce cloud cover requirement

**Q: Data collection too slow?**
- ✓ Focus on smaller region first
- ✓ Use wider date range
- ✓ Collect fewer samples initially

**Q: Models not training?**
- ✓ Check CSV format in training_dataset.csv
- ✓ Ensure crop_type matches exact names
- ✓ Minimum 30 samples required

---

See `DATA_COLLECTION_GUIDE.md` for detailed instructions and crop labeling guide.
