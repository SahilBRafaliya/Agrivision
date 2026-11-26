# AgriVision AI - Agricultural Intelligence Platform

## Project Overview

AgriVision AI is a comprehensive agricultural intelligence platform that combines satellite imagery analysis with machine learning to provide farmers and agricultural professionals with actionable insights about crop health, yield predictions, and farm management.

## Features

### 🛰️ Satellite Imagery Analysis
- **STAC Integration**: Search and retrieve satellite imagery from Sentinel-2 L2A collection
- **True Color Imagery**: Generate RGB composite images from satellite bands
- **Multi-band Support**: Process Blue (B02), Green (B03), Red (B04), and Near-Infrared (B08) bands

### 📊 Vegetation Indices
- **NDVI (Normalized Difference Vegetation Index)**: Assess vegetation health and density
- **NDWI (Normalized Difference Water Index)**: Monitor water content and stress
- **EVI (Enhanced Vegetation Index)**: Enhanced vegetation monitoring with atmospheric correction

### 🤖 AI-Powered Analysis
- **Crop Type Prediction**: Machine learning model to identify crop types from satellite data
- **Yield Prediction**: Estimate crop yields based on vegetation indices and historical data
- **SSL Feature Extraction**: Self-supervised learning for advanced feature extraction
- **Health Scoring**: Comprehensive vegetation health assessment

### 🏡 Farm Management
- **Farm Registration**: Add and manage farms with geospatial boundaries
- **Coordinate-based Location**: Precise farm location using latitude/longitude
- **GeoJSON Support**: Store and manage farm boundaries in GeoJSON format

### 📝 Farmer Feedback System
- **Prediction Validation**: Collect feedback on AI predictions
- **Issue Reporting**: Report specific agricultural issues (pests, diseases, water stress, etc.)
- **Analytics Dashboard**: Track model accuracy and feedback patterns

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **FastAPI** with Python
- **SQLAlchemy** for database ORM
- **Pydantic** for data validation
- **STAC Client** for satellite data access
- **Rasterio** for geospatial data processing
- **PyTorch** for machine learning
- **Scikit-learn** for traditional ML models

### Satellite Data
- **Sentinel-2 L2A** collection via Microsoft Planetary Computer
- **10m spatial resolution** multispectral imagery
- **Real-time data access** through STAC API

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:
```bash
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Satellite Imagery
- `GET /satellite/search` - Search for satellite scenes
- `GET /satellite/true_color` - Generate true color imagery
- `GET /satellite/bands/{scene_id}` - Get scene band data

### Vegetation Indices
- `GET /indices/calculate` - Calculate NDVI, NDWI, EVI
- `GET /indices/ndvi` - Get NDVI analysis
- `GET /indices/ndwi` - Get NDWI analysis
- `GET /indices/evi` - Get EVI analysis

### AI Analysis
- `GET /ai/crop_prediction` - Predict crop type
- `GET /ai/yield_prediction` - Predict crop yield
- `GET /ai/analysis` - Complete AI analysis pipeline
- `GET /ai/feature_extraction` - Extract SSL features

### Farm Management
- `POST /farms/add` - Add new farm
- `GET /farms` - List all farms
- `GET /farms/{farm_id}` - Get farm details
- `PUT /farms/{farm_id}` - Update farm
- `DELETE /farms/{farm_id}` - Delete farm

### Feedback System
- `POST /feedback/submit` - Submit farmer feedback
- `GET /feedback` - Get all feedback
- `GET /feedback/analytics` - Get feedback analytics

## Quick Start

1. **Start both servers** (backend on port 8000, frontend on port 3000)

2. **Open the application** at `http://localhost:3000`

3. **Add a farm** using the farm management interface

4. **Search for satellite imagery** using the STAC Explorer

5. **Run AI Analysis** to get crop predictions and yield estimates

6. **Provide feedback** to improve model accuracy

## Project Structure

```
agrivision-insights-main/
├── Frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand state management
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── routers/        # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # ML models and encoders
│   │   ├── database/       # Database models and schemas
│   │   ├── utils/          # Utility functions
│   │   └── config/         # Configuration settings
│   ├── requirements.txt
│   └── main.py
└── README.md
```

## Configuration

### Backend Configuration
Edit `backend/app/config/settings.py` to configure:
- STAC API endpoint
- Database connection
- Model file paths
- CORS settings

### Frontend Configuration
The frontend automatically connects to the backend at `http://localhost:8000`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
