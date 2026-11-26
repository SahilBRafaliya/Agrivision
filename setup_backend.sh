#!/bin/bash

# AgriVision AI Backend Setup Script
# This script sets up the Python environment and installs all dependencies

echo "🌾 Setting up AgriVision AI Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python $python_version is too old. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python $python_version detected"

# Create virtual environment
echo "📦 Creating Python virtual environment..."
# Check if backend virtual environment exists
if [ -d "Backend/venv" ]; then
    echo "⚠️  Virtual environment already exists. Removing old one..."
    rm -rf Backend/venv
fi

cd Backend
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create models directory if it doesn't exist
echo "📁 Creating models directory..."
mkdir -p app/models

# Create mock model files for demonstration
echo "🤖 Creating mock model files..."

# Create SSL encoder placeholder
python3 -c "
import torch
import torch.nn as nn
import torchvision.models as models

class SSLEncoder(nn.Module):
    def __init__(self):
        super(SSLEncoder, self).__init__()
        self.backbone = models.resnet18(weights='IMAGENET1K_V1')
        self.backbone = nn.Sequential(*list(self.backbone.children())[:-1])
    
    def forward(self, x):
        return self.backbone(x).squeeze()

# Create and save mock encoder
encoder = SSLEncoder()
torch.save(encoder.state_dict(), 'app/models/ssl_encoder.pth')
print('✅ SSL encoder model created')
"

# Create mock crop prediction model
python3 -c "
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

# Create mock training data
X = np.random.randn(1000, 515)  # 3 indices + 512 SSL features
y = np.random.choice(['Wheat', 'Rice', 'Cotton', 'Sugarcane'], 1000)

# Train model
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
model.fit(X_scaled, y)

# Save model
model_data = {
    'model': model,
    'scaler': scaler,
    'is_trained': True,
    'crop_types': ['Wheat', 'Rice', 'Cotton', 'Sugarcane']
}

with open('app/models/crop_model.pkl', 'wb') as f:
    pickle.dump(model_data, f)

print('✅ Crop prediction model created')
"

# Create mock yield prediction model
python3 -c "
import numpy as np
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

# Create mock training data
X = np.random.randn(1000, 4)  # ndvi, ndwi, evi, crop_type_encoded
y = np.clip(2.0 + X[:, 0] * 3.0 + np.random.normal(0, 0.5, 1000), 0.5, 8.0)

# Train model
model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
model.fit(X_scaled, y)

# Save model
model_data = {
    'model': model,
    'scaler': scaler,
    'is_trained': True
}

with open('app/models/yield_model.pkl', 'wb') as f:
    pickle.dump(model_data, f)

print('✅ Yield prediction model created')
"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# AgriVision AI Backend Configuration
APP_NAME=AgriVision AI Backend
APP_VERSION=1.0.0
DEBUG=true
FRONTEND_URL=http://localhost:3000

# STAC Configuration
STAC_ENDPOINT=https://planetarycomputer.microsoft.com/api/stac/v1

# Database
DATABASE_URL=sqlite:///./agrivision.db

# Security
SECRET_KEY=agrivision-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
    echo "✅ .env file created"
fi

# Create database
echo "🗄️  Creating database..."
python3 -c "
from database.db import create_tables
create_tables()
print('✅ Database tables created')
"

# Test the setup
echo "🧪 Testing setup..."
python3 -c "
import fastapi
import uvicorn
import pystac_client
import rasterio
import numpy as np
import torch
import sklearn
print('✅ All major dependencies imported successfully')
"

echo ""
echo "🎉 Backend setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Activate the virtual environment: cd backend && source venv/bin/activate"
echo "   2. Run the backend: python app/main.py"
echo "   3. Access API docs: http://localhost:8000/docs"
echo ""
echo "💡 To run both frontend and backend together, use: ./run_project.sh"
echo ""

cd ..
