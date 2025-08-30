"""
Training utilities for Graph Neural Networks in IntelGraph
"""

import time
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    precision_recall_fscore_support,
    roc_auc_score,
)
from torch.optim import Adam, AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR, ReduceLROnPlateau
from torch_geometric.data import Data, DataLoader
from torch_geometric.utils import negative_sampling
from tqdm import tqdm

from ..monitoring import track_task_processing
from .gnn import IntelGraphGNN, gnn_manager


class GNNTrainer:
    """
    Comprehensive trainer for Graph Neural Networks
    Supports various tasks and training strategies
    """

    def __init__(
        self,
        model: IntelGraphGNN,
        device: torch.device = None,
        optimizer_type: str = "adam",
        learning_rate: float = 0.001,
        weight_decay: float = 1e-5,
        scheduler_type: str = "plateau",
        patience: int = 10,
        min_lr: float = 1e-6,
    ):
        self.model = model
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

        # Setup optimizer
        if optimizer_type == "adam":
            self.optimizer = Adam(model.parameters(), lr=learning_rate, weight_decay=weight_decay)
        elif optimizer_type == "adamw":
            self.optimizer = AdamW(model.parameters(), lr=learning_rate, weight_decay=weight_decay)
        else:
            raise ValueError(f"Unknown optimizer type: {optimizer_type}")

        # Setup scheduler
        if scheduler_type == "plateau":
            self.scheduler = ReduceLROnPlateau(
                self.optimizer,
                mode="min",
                patience=patience,
                min_lr=min_lr,
                factor=0.5,
                verbose=True,
            )
        elif scheduler_type == "cosine":
            self.scheduler = CosineAnnealingLR(self.optimizer, T_max=100, eta_min=min_lr)
        else:
            self.scheduler = None

        self.training_history = []
        self.best_val_score = float("inf")
        self.early_stopping_counter = 0
        self.early_stopping_patience = patience * 2

    def compute_loss(self, predictions, targets, task_type: str) -> torch.Tensor:
        """Compute loss based on task type"""

        if task_type in ["node_classification", "graph_classification"]:
            return F.cross_entropy(predictions, targets)
        elif task_type == "link_prediction" or task_type == "anomaly_detection":
            return F.binary_cross_entropy(predictions.squeeze(), targets.float())
        else:
            return F.mse_loss(predictions, targets)

    def compute_metrics(
        self, predictions: torch.Tensor, targets: torch.Tensor, task_type: str
    ) -> dict[str, float]:
        """Compute evaluation metrics"""

        predictions_np = predictions.detach().cpu().numpy()
        targets_np = targets.detach().cpu().numpy()

        metrics = {}

        if task_type in ["node_classification", "graph_classification"]:
            pred_classes = np.argmax(predictions_np, axis=1)

            metrics["accuracy"] = accuracy_score(targets_np, pred_classes)
            precision, recall, f1, _ = precision_recall_fscore_support(
                targets_np, pred_classes, average="weighted", zero_division=0
            )
            metrics["precision"] = precision
            metrics["recall"] = recall
            metrics["f1"] = f1

            # Multi-class AUC if applicable
            if predictions_np.shape[1] == 2:  # Binary classification
                probs = F.softmax(predictions, dim=1)[:, 1].detach().cpu().numpy()
                metrics["auc"] = roc_auc_score(targets_np, probs)

        elif task_type in ["link_prediction", "anomaly_detection"]:
            pred_binary = (predictions_np > 0.5).astype(int)

            metrics["accuracy"] = accuracy_score(targets_np, pred_binary)
            precision, recall, f1, _ = precision_recall_fscore_support(
                targets_np, pred_binary, average="binary", zero_division=0
            )
            metrics["precision"] = precision
            metrics["recall"] = recall
            metrics["f1"] = f1
            metrics["auc"] = roc_auc_score(targets_np, predictions_np)
            metrics["ap"] = average_precision_score(targets_np, predictions_np)

        return metrics

    @track_task_processing
    def train_epoch(
        self, train_loader: DataLoader, task_type: str, progress_bar: bool = True
    ) -> dict[str, float]:
        """Train for one epoch"""

        self.model.train()
        total_loss = 0
        all_predictions = []
        all_targets = []

        iterator = tqdm(train_loader, desc="Training") if progress_bar else train_loader

        for batch in iterator:
            batch = batch.to(self.device)

            self.optimizer.zero_grad()

            # Forward pass
            predictions = self.model(batch)

            # Get targets based on task type
            if task_type == "node_classification":
                targets = batch.y
            elif task_type == "link_prediction":
                targets = batch.edge_label
            elif task_type == "graph_classification" or task_type == "anomaly_detection":
                targets = batch.y
            else:
                targets = batch.y

            # Compute loss
            loss = self.compute_loss(predictions, targets, task_type)

            # Backward pass
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            all_predictions.append(predictions.detach())
            all_targets.append(targets.detach())

        # Compute epoch metrics
        all_predictions = torch.cat(all_predictions, dim=0)
        all_targets = torch.cat(all_targets, dim=0)

        avg_loss = total_loss / len(train_loader)
        metrics = self.compute_metrics(all_predictions, all_targets, task_type)
        metrics["loss"] = avg_loss

        return metrics

    def validate_epoch(
        self, val_loader: DataLoader, task_type: str, progress_bar: bool = True
    ) -> dict[str, float]:
        """Validate for one epoch"""

        self.model.eval()
        total_loss = 0
        all_predictions = []
        all_targets = []

        iterator = tqdm(val_loader, desc="Validation") if progress_bar else val_loader

        with torch.no_grad():
            for batch in iterator:
                batch = batch.to(self.device)

                # Forward pass
                predictions = self.model(batch)

                # Get targets
                if task_type == "node_classification":
                    targets = batch.y
                elif task_type == "link_prediction":
                    targets = batch.edge_label
                elif task_type == "graph_classification" or task_type == "anomaly_detection":
                    targets = batch.y
                else:
                    targets = batch.y

                # Compute loss
                loss = self.compute_loss(predictions, targets, task_type)

                total_loss += loss.item()
                all_predictions.append(predictions)
                all_targets.append(targets)

        # Compute epoch metrics
        all_predictions = torch.cat(all_predictions, dim=0)
        all_targets = torch.cat(all_targets, dim=0)

        avg_loss = total_loss / len(val_loader)
        metrics = self.compute_metrics(all_predictions, all_targets, task_type)
        metrics["loss"] = avg_loss

        return metrics

    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        task_type: str,
        num_epochs: int = 100,
        save_best: bool = True,
        model_name: str = None,
        log_interval: int = 10,
        progress_bar: bool = True,
    ) -> dict[str, Any]:
        """Complete training loop"""

        print(f"Starting training for {num_epochs} epochs...")
        print(f"Device: {self.device}")
        print(f"Model parameters: {sum(p.numel() for p in self.model.parameters()):,}")

        start_time = time.time()

        for epoch in range(num_epochs):
            epoch_start = time.time()

            # Training
            train_metrics = self.train_epoch(train_loader, task_type, progress_bar=progress_bar)

            # Validation
            val_metrics = self.validate_epoch(val_loader, task_type, progress_bar=progress_bar)

            # Learning rate scheduling
            if self.scheduler:
                if isinstance(self.scheduler, ReduceLROnPlateau):
                    self.scheduler.step(val_metrics["loss"])
                else:
                    self.scheduler.step()

            # Record history
            epoch_time = time.time() - epoch_start
            history_entry = {
                "epoch": epoch + 1,
                "train_metrics": train_metrics,
                "val_metrics": val_metrics,
                "lr": self.optimizer.param_groups[0]["lr"],
                "epoch_time": epoch_time,
            }
            self.training_history.append(history_entry)

            # Early stopping and model saving
            val_score = val_metrics["loss"]  # Using loss for early stopping

            if val_score < self.best_val_score:
                self.best_val_score = val_score
                self.early_stopping_counter = 0

                if save_best and model_name:
                    gnn_manager.save_model(model_name, metrics=val_metrics)
            else:
                self.early_stopping_counter += 1

            # Logging
            if (epoch + 1) % log_interval == 0 or epoch == 0:
                print(f"\nEpoch {epoch + 1}/{num_epochs}")
                print(
                    f"Train - Loss: {train_metrics['loss']:.4f}, "
                    f"Acc: {train_metrics.get('accuracy', 0):.4f}"
                )
                print(
                    f"Val   - Loss: {val_metrics['loss']:.4f}, "
                    f"Acc: {val_metrics.get('accuracy', 0):.4f}"
                )
                print(
                    f"LR: {self.optimizer.param_groups[0]['lr']:.6f}, " f"Time: {epoch_time:.2f}s"
                )

            # Early stopping
            if self.early_stopping_counter >= self.early_stopping_patience:
                print(f"\nEarly stopping at epoch {epoch + 1}")
                break

        total_time = time.time() - start_time

        # Final metrics
        final_metrics = {
            "best_val_score": self.best_val_score,
            "total_epochs": len(self.training_history),
            "total_time": total_time,
            "final_train_metrics": train_metrics,
            "final_val_metrics": val_metrics,
            "training_history": self.training_history,
        }

        print(f"\nTraining completed in {total_time:.2f}s")
        print(f"Best validation score: {self.best_val_score:.4f}")

        return final_metrics


class GNNDataProcessor:
    """
    Data processing utilities for GNN training
    Converts graph data to PyTorch Geometric format
    """

    @staticmethod
    def networkx_to_pyg(
        nx_graph,
        node_features: dict[str, np.ndarray] = None,
        edge_features: dict[tuple[str, str], np.ndarray] = None,
        node_labels: dict[str, int] = None,
        edge_labels: dict[tuple[str, str], int] = None,
    ) -> Data:
        """Convert NetworkX graph to PyTorch Geometric Data object"""

        # Node mapping
        node_mapping = {node: i for i, node in enumerate(nx_graph.nodes())}
        num_nodes = len(node_mapping)

        # Edge index
        edge_list = []
        for edge in nx_graph.edges():
            src, dst = edge
            edge_list.append([node_mapping[src], node_mapping[dst]])

        if edge_list:
            edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)

        # Node features
        if node_features:
            feature_dim = next(iter(node_features.values())).shape[0]
            x = torch.zeros(num_nodes, feature_dim)
            for node, feat in node_features.items():
                if node in node_mapping:
                    x[node_mapping[node]] = torch.tensor(feat, dtype=torch.float)
        else:
            # Default: one-hot encoding or degree features
            x = torch.eye(num_nodes, dtype=torch.float)

        # Edge features
        edge_attr = None
        if edge_features and edge_list:
            edge_attr_list = []
            for edge in nx_graph.edges():
                if edge in edge_features:
                    edge_attr_list.append(edge_features[edge])
                elif (edge[1], edge[0]) in edge_features:  # Undirected edge
                    edge_attr_list.append(edge_features[(edge[1], edge[0])])
                else:
                    # Default edge features
                    edge_attr_list.append(np.ones(1))

            if edge_attr_list:
                edge_attr = torch.tensor(np.array(edge_attr_list), dtype=torch.float)

        # Node labels
        y = None
        if node_labels:
            y = torch.zeros(num_nodes, dtype=torch.long)
            for node, label in node_labels.items():
                if node in node_mapping:
                    y[node_mapping[node]] = label

        # Create Data object
        data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr, y=y, num_nodes=num_nodes)

        return data

    @staticmethod
    def create_link_prediction_data(
        data: Data, train_ratio: float = 0.8, val_ratio: float = 0.1, test_ratio: float = 0.1
    ) -> tuple[Data, Data, Data]:
        """Create train/val/test splits for link prediction"""

        num_edges = data.edge_index.size(1)
        num_train = int(train_ratio * num_edges)
        num_val = int(val_ratio * num_edges)

        # Random permutation of edges
        perm = torch.randperm(num_edges)

        # Split edges
        train_edges = data.edge_index[:, perm[:num_train]]
        val_edges = data.edge_index[:, perm[num_train : num_train + num_val]]
        test_edges = data.edge_index[:, perm[num_train + num_val :]]

        # Generate negative samples
        def create_neg_samples(pos_edges, num_samples):
            return negative_sampling(
                pos_edges, num_nodes=data.num_nodes, num_neg_samples=num_samples
            )

        train_neg = create_neg_samples(train_edges, train_edges.size(1))
        val_neg = create_neg_samples(val_edges, val_edges.size(1))
        test_neg = create_neg_samples(test_edges, test_edges.size(1))

        # Create data objects
        def create_split_data(pos_edges, neg_edges):
            edge_label_index = torch.cat([pos_edges, neg_edges], dim=1)
            edge_label = torch.cat([torch.ones(pos_edges.size(1)), torch.zeros(neg_edges.size(1))])

            split_data = Data(
                x=data.x,
                edge_index=train_edges,  # Use training edges for message passing
                edge_label_index=edge_label_index,
                edge_label=edge_label,
                num_nodes=data.num_nodes,
            )
            return split_data

        train_data = create_split_data(train_edges, train_neg)
        val_data = create_split_data(val_edges, val_neg)
        test_data = create_split_data(test_edges, test_neg)

        return train_data, val_data, test_data

    @staticmethod
    def create_node_classification_masks(
        data: Data, train_ratio: float = 0.6, val_ratio: float = 0.2, test_ratio: float = 0.2
    ) -> Data:
        """Create train/val/test masks for node classification"""

        num_nodes = data.num_nodes
        indices = torch.randperm(num_nodes)

        num_train = int(train_ratio * num_nodes)
        num_val = int(val_ratio * num_nodes)

        train_mask = torch.zeros(num_nodes, dtype=torch.bool)
        val_mask = torch.zeros(num_nodes, dtype=torch.bool)
        test_mask = torch.zeros(num_nodes, dtype=torch.bool)

        train_mask[indices[:num_train]] = True
        val_mask[indices[num_train : num_train + num_val]] = True
        test_mask[indices[num_train + num_val :]] = True

        data.train_mask = train_mask
        data.val_mask = val_mask
        data.test_mask = test_mask

        return data


def create_synthetic_graph_dataset(
    num_graphs: int = 1000,
    min_nodes: int = 10,
    max_nodes: int = 50,
    node_feature_dim: int = 16,
    num_classes: int = 3,
    task_type: str = "graph_classification",
) -> list[Data]:
    """Create synthetic graph dataset for testing"""

    import networkx as nx
    from torch_geometric.utils import from_networkx

    dataset = []

    for _ in range(num_graphs):
        # Random graph
        num_nodes = np.random.randint(min_nodes, max_nodes + 1)
        p = np.random.uniform(0.1, 0.3)  # Edge probability

        # Generate graph
        if np.random.random() < 0.5:
            G = nx.erdos_renyi_graph(num_nodes, p)
        else:
            G = nx.barabasi_albert_graph(num_nodes, max(1, int(p * num_nodes)))

        # Convert to PyG format
        data = from_networkx(G)

        # Add node features
        data.x = torch.randn(num_nodes, node_feature_dim)

        # Add labels based on task
        if task_type == "graph_classification":
            # Graph-level label based on properties
            avg_degree = np.mean([d for n, d in G.degree()])
            if avg_degree < 2:
                label = 0
            elif avg_degree < 4:
                label = 1
            else:
                label = 2
            data.y = torch.tensor([label], dtype=torch.long)

        elif task_type == "node_classification":
            # Node-level labels based on degree
            degrees = torch.tensor([G.degree(i) for i in range(num_nodes)])
            labels = torch.zeros(num_nodes, dtype=torch.long)
            labels[degrees < 2] = 0
            labels[(degrees >= 2) & (degrees < 4)] = 1
            labels[degrees >= 4] = 2
            data.y = labels

        dataset.append(data)

    return dataset
