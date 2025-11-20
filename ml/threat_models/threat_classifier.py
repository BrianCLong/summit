"""
Supervised threat classifier using deep learning
Multi-class classification for different threat categories
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from sklearn.metrics import classification_report, confusion_matrix


@dataclass
class ClassifierConfig:
    input_dim: int
    num_classes: int
    hidden_dims: List[int] = None
    learning_rate: float = 0.001
    batch_size: int = 128
    epochs: int = 50
    dropout_rate: float = 0.3
    weight_decay: float = 0.0001
    device: str = 'cuda' if torch.cuda.is_available() else 'cpu'
    class_weights: Optional[torch.Tensor] = None

    def __post_init__(self):
        if self.hidden_dims is None:
            self.hidden_dims = [256, 128, 64]


class ThreatClassifierModel(nn.Module):
    """Deep neural network for threat classification"""

    def __init__(self, config: ClassifierConfig):
        super().__init__()
        self.config = config

        layers = []
        in_dim = config.input_dim

        for hidden_dim in config.hidden_dims:
            layers.extend([
                nn.Linear(in_dim, hidden_dim),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_dim),
                nn.Dropout(config.dropout_rate)
            ])
            in_dim = hidden_dim

        # Output layer
        layers.append(nn.Linear(in_dim, config.num_classes))

        self.network = nn.Sequential(*layers)

    def forward(self, x):
        return self.network(x)


class ThreatClassifier:
    """Multi-class threat classifier"""

    def __init__(self, config: ClassifierConfig):
        self.config = config
        self.model = ThreatClassifierModel(config).to(config.device)
        self.optimizer = optim.Adam(
            self.model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay
        )

        # Loss function with optional class weights
        if config.class_weights is not None:
            weights = config.class_weights.to(config.device)
            self.criterion = nn.CrossEntropyLoss(weight=weights)
        else:
            self.criterion = nn.CrossEntropyLoss()

        self.scaler_mean = None
        self.scaler_std = None
        self.class_names = None

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        validation_data: Optional[Tuple[np.ndarray, np.ndarray]] = None,
        class_names: Optional[List[str]] = None
    ) -> Dict[str, List[float]]:
        """
        Train the threat classifier

        Args:
            X: Training features (n_samples, n_features)
            y: Training labels (n_samples,)
            validation_data: Optional (X_val, y_val) tuple
            class_names: Optional list of class names

        Returns:
            Training history
        """
        self.class_names = class_names

        # Normalize features
        self.scaler_mean = X.mean(axis=0)
        self.scaler_std = X.std(axis=0) + 1e-8
        X_normalized = (X - self.scaler_mean) / self.scaler_std

        # Convert to tensors
        X_train = torch.FloatTensor(X_normalized).to(self.config.device)
        y_train = torch.LongTensor(y).to(self.config.device)

        X_val, y_val = None, None
        if validation_data is not None:
            X_val_norm = (validation_data[0] - self.scaler_mean) / self.scaler_std
            X_val = torch.FloatTensor(X_val_norm).to(self.config.device)
            y_val = torch.LongTensor(validation_data[1]).to(self.config.device)

        history = {
            'train_loss': [],
            'train_acc': [],
            'val_loss': [],
            'val_acc': []
        }

        for epoch in range(self.config.epochs):
            self.model.train()
            epoch_loss = 0
            correct = 0
            total = 0
            n_batches = 0

            # Training loop
            for i in range(0, len(X_train), self.config.batch_size):
                batch_X = X_train[i:i + self.config.batch_size]
                batch_y = y_train[i:i + self.config.batch_size]

                self.optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = self.criterion(outputs, batch_y)
                loss.backward()
                self.optimizer.step()

                epoch_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                total += batch_y.size(0)
                correct += (predicted == batch_y).sum().item()
                n_batches += 1

            avg_train_loss = epoch_loss / n_batches
            train_acc = correct / total

            history['train_loss'].append(avg_train_loss)
            history['train_acc'].append(train_acc)

            # Validation
            if X_val is not None:
                self.model.eval()
                with torch.no_grad():
                    val_outputs = self.model(X_val)
                    val_loss = self.criterion(val_outputs, y_val).item()
                    _, val_predicted = torch.max(val_outputs.data, 1)
                    val_acc = (val_predicted == y_val).sum().item() / len(y_val)

                    history['val_loss'].append(val_loss)
                    history['val_acc'].append(val_acc)

            if epoch % 5 == 0:
                val_str = f", Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}" if X_val is not None else ""
                print(f"Epoch {epoch}/{self.config.epochs}, "
                      f"Train Loss: {avg_train_loss:.4f}, Train Acc: {train_acc:.4f}"
                      f"{val_str}")

        print("Training complete!")
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict threat classes

        Args:
            X: Input features (n_samples, n_features)

        Returns:
            Predicted class labels
        """
        probas = self.predict_proba(X)
        return np.argmax(probas, axis=1)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class probabilities

        Args:
            X: Input features (n_samples, n_features)

        Returns:
            Class probabilities (n_samples, n_classes)
        """
        if self.scaler_mean is None:
            raise ValueError("Model not trained. Call train() first.")

        X_normalized = (X - self.scaler_mean) / self.scaler_std
        X_tensor = torch.FloatTensor(X_normalized).to(self.config.device)

        self.model.eval()
        with torch.no_grad():
            outputs = self.model(X_tensor)
            probabilities = torch.softmax(outputs, dim=1)

        return probabilities.cpu().numpy()

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """
        Evaluate model performance

        Args:
            X: Test features
            y: True labels

        Returns:
            Dictionary with evaluation metrics
        """
        y_pred = self.predict(X)
        y_proba = self.predict_proba(X)

        results = {
            'accuracy': (y_pred == y).mean(),
            'predictions': y_pred,
            'probabilities': y_proba,
            'confusion_matrix': confusion_matrix(y, y_pred).tolist()
        }

        if self.class_names is not None:
            results['classification_report'] = classification_report(
                y, y_pred,
                target_names=self.class_names
            )
        else:
            results['classification_report'] = classification_report(y, y_pred)

        return results

    def get_feature_importance(self, X: np.ndarray) -> np.ndarray:
        """
        Estimate feature importance using gradient-based method

        Args:
            X: Input features

        Returns:
            Feature importance scores
        """
        X_normalized = (X - self.scaler_mean) / self.scaler_std
        X_tensor = torch.FloatTensor(X_normalized).to(self.config.device)
        X_tensor.requires_grad = True

        self.model.eval()
        outputs = self.model(X_tensor)

        # Get gradients for predicted class
        _, predicted = torch.max(outputs, 1)
        outputs[range(len(outputs)), predicted].sum().backward()

        # Feature importance is absolute gradient
        importance = torch.abs(X_tensor.grad).mean(dim=0)

        return importance.cpu().detach().numpy()

    def save_model(self, path: str):
        """Save model to disk"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'config': self.config,
            'scaler_mean': self.scaler_mean,
            'scaler_std': self.scaler_std,
            'class_names': self.class_names
        }, path)

    def load_model(self, path: str):
        """Load model from disk"""
        checkpoint = torch.load(path, map_location=self.config.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scaler_mean = checkpoint['scaler_mean']
        self.scaler_std = checkpoint['scaler_std']
        self.class_names = checkpoint.get('class_names')
