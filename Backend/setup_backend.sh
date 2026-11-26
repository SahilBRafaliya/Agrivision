#!/bin/bash

# AgriVision AI Backend Setup Script
# This script sets up the Python environment and installs all dependencies

echo "🚀 Setting up AgriVision AI Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python $python_version is too old. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python $python_version detected"

# Create virtual environment
echo "📦 Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "ℹ️  Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create necessary directories for models
echo "📁 Creating model directories..."
mkdir -p app/models

# Create empty model files if they don't exist
if [ ! -f "app/models/ssl_encoder.pth" ]; then
    echo "🤖 Creating placeholder SSL encoder file..."
    python3 -c "
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
torch.save(model.state_dict(), 'app/models/ssl_encoder.pth')
print('✅ SSL encoder placeholder created')
"
fi

if [ ! -f "app/models/crop_model.pkl" ]; then
    echo "🌾 Creating placeholder crop model file..."
    python3 -c "
import pickle
from sklearn.ensemble import RandomForestClassifier
import numpy as np

# Create a simple mock model
model = RandomForestClassifier(n_estimators=10, random_state=42)
X_mock = np.random.rand(10, 5)  # Mock features
y_mock = np.random.choice(['Wheat', 'Rice', 'Cotton'], 10)  # Mock labels
model.fit(X_mock, y_mock)

with open('app/models/crop_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print('✅ Crop model placeholder created')
"
fi

if [ ! -f "app/models/yield_model.pkl" ]; then
    echo "📊 Creating placeholder yield model file..."
    python3 -c "
import pickle
from sklearn.ensemble import RandomForestRegressor
import numpy as np

# Create a simple mock model
model = RandomForestRegressor(n_estimators=10, random_state=42)
X_mock = np.random.rand(10, 3)  # Mock features (NDVI, crop_type_encoded, etc.)
y_mock = np.random.rand(10) * 5 + 1  # Mock yields (1-6 tons/hectare)
model.fit(X_mock, y_mock)

with open('app/models/yield_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print('✅ Yield model placeholder created')
"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env configuration file..."
    cat > .env << EOF
# AgriVision AI Backend Configuration
APP_NAME="AgriVision AI Backend"
APP_VERSION="1.0.0"
DEBUG=true

# API URLs
STAC_ENDPOINT="https://planetarycomputer.microsoft.com/api/stac/v1"
FRONTEND_URL="http://localhost:3000"

# Database
DATABASE_URL="sqlite:///./agrivision.db"

# Model Paths
SSL_ENCODER_PATH="app/models/ssl_encoder.pth"
CROP_MODEL_PATH="app/models/crop_model.pkl"
YIELD_MODEL_PATH="app/models/yield_model.pkl"

# Security
SECRET_KEY="agrivision-secret-key-change-in-production"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
    echo "✅ .env file created"
fi

# Test the installation
echo "🧪 Testing installation..."
python3 -c "
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

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Backend setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Activate the virtual environment:"
    echo "   source venv/bin/activate"
    echo ""
    echo "2. Start the backend server:"
    echo "   cd app"
    echo "   uvicorn main:app --reload --host 0.0.0.0 --port 8000"
    echo ""
    echo "3. The API will be available at: http://localhost:8000"
    echo "4. API documentation: http://localhost:8000/docs"
    echo ""
else
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi
