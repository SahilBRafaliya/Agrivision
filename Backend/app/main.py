from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config.settings import settings
from database.db import create_tables
from routers import satellite_router, indices_router, analysis_router, farm_router, feedback_router
from routers import ndvi_history_router, auth_router, admin_router, farmer_router

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AgriVision AI Backend - Satellite imagery analysis and crop prediction API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# allow_origin_regex covers any localhost port (3000, 5173, 8080, etc.)
# so the OPTIONS preflight always returns 200 regardless of Vite's port.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(farmer_router.router)
app.include_router(satellite_router.router)
app.include_router(indices_router.router)
app.include_router(ndvi_history_router.router)
app.include_router(analysis_router.router)
app.include_router(farm_router.router)
app.include_router(feedback_router.router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "AgriVision AI Backend API",
        "version": settings.app_version,
        "docs": "/docs",
        "status": "running"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.app_version,
        "services": {
            "stac": "operational",
            "raster_processing": "operational",
            "ssl_features": "operational",
            "crop_prediction": "operational",
            "yield_prediction": "operational"
        }
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and models on startup"""
    try:
        # Ensure models directory exists so saves after retraining work
        import os
        os.makedirs(os.path.dirname(settings.crop_model_path), exist_ok=True)

        # Create database tables
        create_tables()
        print("Database tables created successfully")
        
        # Initialize services (load models if they exist)
        from services.ssl_service import SSLService
        from services.crop_service import CropPredictionService
        from services.yield_service import YieldPredictionService
        
        ssl_service = SSLService()
        crop_service = CropPredictionService()
        yield_service = YieldPredictionService()
        
        # Try to load existing models
        ssl_service.load_encoder(settings.ssl_encoder_path)
        crop_service.load_model(settings.crop_model_path)
        yield_service.load_model(settings.yield_model_path)
        
        print("Services initialized successfully")
        
    except Exception as e:
        print(f"Error during startup: {e}")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if settings.debug else "An error occurred"
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )
