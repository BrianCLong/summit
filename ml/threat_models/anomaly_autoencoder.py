"""
Autoencoder-based anomaly detection for threat detection
Uses reconstruction error as anomaly score
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class AutoencoderConfig:
    input_dim: int
    encoding_dim: int = 32
    hidden_dims: List[int] = None
    learning_rate: float = 0.001
    batch_size: int = 128
    epochs: int = 100
    contamination: float = 0.1
    device: str = 'cuda' if torch.cuda.is_available() else 'cpu'

    def __post_init__(self):
        if self.hidden_dims is None:
            # Default progressive dimensionality reduction
            self.hidden_dims = [
                self.input_dim // 2,
                self.input_dim // 4,
                self.encoding_dim
            ]


class Autoencoder(nn.Module):
    """Deep Autoencoder for anomaly detection"""

    def __init__(self, config: AutoencoderConfig):
        super().__init__()
        self.config = config

        # Encoder
        encoder_layers = []
        in_dim = config.input_dim

        for hidden_dim in config.hidden_dims:
            encoder_layers.extend([
                nn.Linear(in_dim, hidden_dim),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_dim),
                nn.Dropout(0.2)
            ])
            in_dim = hidden_dim

        self.encoder = nn.Sequential(*encoder_layers)

        # Decoder (mirror of encoder)
        decoder_layers = []
        hidden_dims_reversed = list(reversed(config.hidden_dims[:-1]))
        in_dim = config.encoding_dim

        for hidden_dim in hidden_dims_reversed:
            decoder_layers.extend([
                nn.Linear(in_dim, hidden_dim),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_dim),
                nn.Dropout(0.2)
            ])
            in_dim = hidden_dim

        # Final layer to reconstruct input
        decoder_layers.append(nn.Linear(in_dim, config.input_dim))
        decoder_layers.append(nn.Sigmoid())

        self.decoder = nn.Sequential(*decoder_layers)

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

    def encode(self, x):
        return self.encoder(x)


class AnomalyAutoencoder:
    """Autoencoder-based anomaly detector"""

    def __init__(self, config: AutoencoderConfig):
        self.config = config
        self.model = Autoencoder(config).to(config.device)
        self.optimizer = optim.Adam(self.model.parameters(), lr=config.learning_rate)
        self.criterion = nn.MSELoss()
        self.threshold = None
        self.scaler_mean = None
        self.scaler_std = None
        self.feature_names = None

    def train(
        self,
        X: np.ndarray,
        validation_split: float = 0.2
    ) -> Dict[str, List[float]]:
        """
        Train the autoencoder on normal data

        Args:
            X: Training data (n_samples, n_features)
            validation_split: Fraction of data for validation

        Returns:
            Dictionary with training history
        """
        # Normalize data
        self.scaler_mean = X.mean(axis=0)
        self.scaler_std = X.std(axis=0) + 1e-8
        X_normalized = (X - self.scaler_mean) / self.scaler_std

        # Split data
        n_val = int(len(X_normalized) * validation_split)
        X_train = X_normalized[:-n_val] if n_val > 0 else X_normalized
        X_val = X_normalized[-n_val:] if n_val > 0 else None

        # Convert to tensors
        X_train_tensor = torch.FloatTensor(X_train).to(self.config.device)
        X_val_tensor = torch.FloatTensor(X_val).to(self.config.device) if X_val is not None else None

        history = {'train_loss': [], 'val_loss': []}

        self.model.train()

        for epoch in range(self.config.epochs):
            # Training
            epoch_loss = 0
            n_batches = 0

            for i in range(0, len(X_train_tensor), self.config.batch_size):
                batch = X_train_tensor[i:i + self.config.batch_size]

                self.optimizer.zero_grad()
                reconstructed = self.model(batch)
                loss = self.criterion(reconstructed, batch)
                loss.backward()
                self.optimizer.step()

                epoch_loss += loss.item()
                n_batches += 1

            avg_train_loss = epoch_loss / n_batches
            history['train_loss'].append(avg_train_loss)

            # Validation
            if X_val_tensor is not None:
                self.model.eval()
                with torch.no_grad():
                    val_reconstructed = self.model(X_val_tensor)
                    val_loss = self.criterion(val_reconstructed, X_val_tensor).item()
                    history['val_loss'].append(val_loss)
                self.model.train()

            if epoch % 10 == 0:
                print(f"Epoch {epoch}/{self.config.epochs}, "
                      f"Train Loss: {avg_train_loss:.6f}"
                      + (f", Val Loss: {val_loss:.6f}" if X_val_tensor is not None else ""))

        # Calculate threshold based on training data
        self.model.eval()
        with torch.no_grad():
            train_reconstructed = self.model(X_train_tensor)
            train_errors = torch.mean((X_train_tensor - train_reconstructed) ** 2, dim=1)
            train_errors_np = train_errors.cpu().numpy()

        # Set threshold at the contamination percentile
        self.threshold = np.percentile(train_errors_np, (1 - self.config.contamination) * 100)

        print(f"Training complete. Threshold set to: {self.threshold:.6f}")

        return history

    def predict_anomaly_score(self, X: np.ndarray) -> np.ndarray:
        """
        Calculate anomaly scores (reconstruction errors)

        Args:
            X: Input data (n_samples, n_features)

        Returns:
            Anomaly scores (higher = more anomalous)
        """
        if self.scaler_mean is None:
            raise ValueError("Model not trained. Call train() first.")

        # Normalize
        X_normalized = (X - self.scaler_mean) / self.scaler_std

        # Convert to tensor
        X_tensor = torch.FloatTensor(X_normalized).to(self.config.device)

        # Get reconstruction error
        self.model.eval()
        with torch.no_grad():
            reconstructed = self.model(X_tensor)
            errors = torch.mean((X_tensor - reconstructed) ** 2, dim=1)

        return errors.cpu().numpy()

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict anomalies (binary classification)

        Args:
            X: Input data (n_samples, n_features)

        Returns:
            Binary predictions (1 = anomaly, 0 = normal)
        """
        scores = self.predict_anomaly_score(X)
        return (scores > self.threshold).astype(int)

    def get_feature_contributions(self, X: np.ndarray) -> np.ndarray:
        """
        Get per-feature reconstruction errors

        Args:
            X: Input data (n_samples, n_features)

        Returns:
            Per-feature reconstruction errors (n_samples, n_features)
        """
        if self.scaler_mean is None:
            raise ValueError("Model not trained. Call train() first.")

        X_normalized = (X - self.scaler_mean) / self.scaler_std
        X_tensor = torch.FloatTensor(X_normalized).to(self.config.device)

        self.model.eval()
        with torch.no_grad():
            reconstructed = self.model(X_tensor)
            feature_errors = (X_tensor - reconstructed) ** 2

        return feature_errors.cpu().numpy()

    def save_model(self, path: str):
        """Save model to disk"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'config': self.config,
            'threshold': self.threshold,
            'scaler_mean': self.scaler_mean,
            'scaler_std': self.scaler_std,
            'feature_names': self.feature_names
        }, path)

    def load_model(self, path: str):
        """Load model from disk"""
        checkpoint = torch.load(path, map_location=self.config.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.threshold = checkpoint['threshold']
        self.scaler_mean = checkpoint['scaler_mean']
        self.scaler_std = checkpoint['scaler_std']
        self.feature_names = checkpoint.get('feature_names')
