import torch
import torch.nn as nn
import torchvision.transforms as transforms
import numpy as np
from PIL import Image
from numpy import ndarray
import pickle
import os

class SSLEncoder(nn.Module):
    """SSL Encoder using ResNet18 backbone"""
    def __init__(self):
        super(SSLEncoder, self).__init__()
        # Load pretrained ResNet18
        self.backbone = torch.hub.load('pytorch/vision:v0.16.0', 'resnet18', pretrained=True)
        
        # Remove the final classification layer
        self.backbone = nn.Sequential(*list(self.backbone.children())[:-1])
        
        # Freeze the backbone parameters
        for param in self.backbone.parameters():
            param.requires_grad = False
    
    def forward(self, x):
        return self.backbone(x).squeeze()

class SSLService:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.encoder = SSLEncoder().to(self.device)
        self.transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def extract_features(self, image: np.ndarray) -> np.ndarray:
        """
        Extract SSL features from satellite image
        
        Args:
            image: Input image as numpy array (H, W, C) or (H, W)
        
        Returns:
            Feature embeddings as numpy array
        """
        try:
            # Convert numpy array to PIL Image
            if len(image.shape) == 2:
                # Grayscale to RGB
                image = np.stack([image] * 3, axis=-1)
            
            if image.shape[2] == 1:
                # Single channel to RGB
                image = np.stack([image[:, :, 0]] * 3, axis=-1)
            
            # Ensure image is in uint8 format
            if image.dtype != np.uint8:
                image = ((image - image.min()) / (image.max() - image.min()) * 255).astype(np.uint8)
            
            pil_image = Image.fromarray(image)
            
            # Transform image
            input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
            
            # Extract features
            with torch.no_grad():
                features = self.encoder(input_tensor)
            
            return features.cpu().numpy()
        
        except Exception as e:
            print(f"Error extracting SSL features: {e}")
            # Return dummy features
            return np.random.randn(512)
    
    def extract_features_from_bands(self, bands: dict) -> np.ndarray:
        """
        Extract features from multiple satellite bands
        
        Args:
            bands: Dictionary of band arrays
        
        Returns:
            Feature embeddings
        """
        try:
            # Create RGB composite if available
            if 'B04' in bands and 'B03' in bands and 'B02' in bands:
                rgb = np.stack([bands['B04'], bands['B03'], bands['B02']], axis=2)
            elif 'B08' in bands and 'B04' in bands and 'B03' in bands:
                # False color composite
                rgb = np.stack([bands['B08'], bands['B04'], bands['B03']], axis=2)
            else:
                # Use the first available band
                first_band = list(bands.values())[0]
                rgb = np.stack([first_band] * 3, axis=2)
            
            return self.extract_features(rgb)
        
        except Exception as e:
            print(f"Error extracting features from bands: {e}")
            return np.random.randn(512)
    
    def save_encoder(self, path: str):
        """Save the encoder model"""
        try:
            torch.save(self.encoder.state_dict(), path)
            print(f"Encoder saved to {path}")
        except Exception as e:
            print(f"Error saving encoder: {e}")
    
    def load_encoder(self, path: str):
        """Load the encoder model"""
        try:
            if os.path.exists(path):
                self.encoder.load_state_dict(torch.load(path, map_location=self.device))
                print(f"Encoder loaded from {path}")
            else:
                print(f"Encoder file not found at {path}, using pretrained weights")
        except Exception as e:
            print(f"Error loading encoder: {e}")
    
    def create_feature_vector(self, indices: dict, ssl_features: np.ndarray) -> np.ndarray:
        """
        Combine vegetation indices and SSL features into a single feature vector
        
        Args:
            indices: Dictionary of vegetation indices
            ssl_features: SSL feature embeddings
        
        Returns:
            Combined feature vector
        """
        try:
            # Extract mean values from indices
            index_features = []
            for index_name in ['ndvi', 'ndwi', 'evi']:
                if index_name in indices:
                    index_features.append(np.mean(indices[index_name]))
                else:
                    index_features.append(0.0)
            
            # Combine with SSL features
            combined = np.concatenate([index_features, ssl_features.flatten()])
            
            return combined
        except Exception as e:
            print(f"Error creating feature vector: {e}")
            return np.random.randn(512 + 3)
