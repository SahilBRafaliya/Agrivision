@echo off
REM AgriVision AI Backend Setup Script for Windows
REM This script sets up the Python environment and installs all dependencies

echo 🚀 Setting up AgriVision AI Backend...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo ✅ Python detected

REM Create virtual environment
echo 📦 Creating Python virtual environment...
if not exist "venv" (
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ℹ️  Virtual environment already exists
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📚 Installing dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create necessary directories for models
echo 📁 Creating model directories...
if not exist "app\models" mkdir app\models

REM Create empty model files if they don't exist
if not exist "app\models\ssl_encoder.pth" (
    echo 🤖 Creating placeholder SSL encoder file...
    python -c "
import torch
import torch.nn as nn

class SSLEncoder(nn.Module):
    def __init__(self):
        super(SSLEncoder, self).__init__()
        self.backbone = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
    
    def forward(self, x):
        return self.backbone(x).squeeze()

model = SSLEncoder()
torch.save(model.state_dict(), 'app\models\ssl_encoder.pth')
print('✅ SSL encoder placeholder created')
"
)

if not exist "app\models\crop_model.pkl" (
    echo 🌾 Creating placeholder crop model file...
    python -c "
import pickle
from sklearn.ensemble import RandomForestClassifier
import numpy as np

model = RandomForestClassifier(n_estimators=10, random_state=42)
X_mock = np.random.rand(10, 5)
y_mock = np.random.choice(['Wheat', 'Rice', 'Cotton'], 10)
model.fit(X_mock, y_mock)

with open('app\models\crop_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print('✅ Crop model placeholder created')
"
)

if not exist "app\models\yield_model.pkl" (
    echo 📊 Creating placeholder yield model file...
    python -c "
import pickle
from sklearn.ensemble import RandomForestRegressor
import numpy as np

model = RandomForestRegressor(n_estimators=10, random_state=42)
X_mock = np.random.rand(10, 3)
y_mock = np.random.rand(10) * 5 + 1
model.fit(X_mock, y_mock)

with open('app\models\yield_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print('✅ Yield model placeholder created')
"
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 🔧 Creating .env configuration file...
    (
        echo # AgriVision AI Backend Configuration
        echo APP_NAME="AgriVision AI Backend"
        echo APP_VERSION="1.0.0"
        echo DEBUG=true
        echo.
        echo # API URLs
        echo STAC_ENDPOINT="https://planetarycomputer.microsoft.com/api/stac/v1"
        echo FRONTEND_URL="http://localhost:3000"
        echo.
        echo # Database
        echo DATABASE_URL="sqlite:///./agrivision.db"
        echo.
        echo # Model Paths
        echo SSL_ENCODER_PATH="app/models/ssl_encoder.pth"
        echo CROP_MODEL_PATH="app/models/crop_model.pkl"
        echo YIELD_MODEL_PATH="app/models/yield_model.pkl"
        echo.
        echo # Security
        echo SECRET_KEY="agrivision-secret-key-change-in-production"
        echo ALGORITHM="HS256"
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
    ) > .env
    echo ✅ .env file created
)

REM Test the installation
echo 🧪 Testing installation...
python -c "
try:
    import fastapi
    import uvicorn
    import pystac_client
    import rasterio
    import numpy
    import torch
    import sklearn
    print('✅ All dependencies imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    exit(1)
"

if errorlevel 1 (
    echo ❌ Setup failed. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo 🎉 Backend setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Activate the virtual environment:
echo    venv\Scripts\activate.bat
echo.
echo 2. Start the backend server:
echo    cd app
echo    uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
echo 3. The API will be available at: http://localhost:8000
echo 4. API documentation: http://localhost:8000/docs
echo.
pause
