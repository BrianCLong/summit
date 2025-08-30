"""
Tests for Graph Neural Network models and training
"""

import networkx as nx
import numpy as np
import pytest
import torch
from torch_geometric.data import Data

from ml.app.models.gnn import (
    GNNModelManager,
    GraphAttentionNetwork,
    GraphIsomorphismNetwork,
    GraphSAGE,
    GraphTransformer,
    HierarchicalGraphNetwork,
    IntelGraphGNN,
)
from ml.app.models.gnn_trainer import GNNDataProcessor, GNNTrainer, create_synthetic_graph_dataset


class TestGNNModels:
    """Test individual GNN architectures"""

    def test_graphsage_forward(self):
        """Test GraphSAGE forward pass"""
        model = GraphSAGE(input_dim=16, hidden_dim=32, output_dim=8)

        # Create test data
        x = torch.randn(10, 16)
        edge_index = torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)

        output = model(x, edge_index)

        assert output.shape == (10, 8)
        assert not torch.isnan(output).any()

    def test_graph_attention_network_forward(self):
        """Test GAT forward pass"""
        model = GraphAttentionNetwork(input_dim=16, hidden_dim=32, output_dim=8, num_heads=4)

        x = torch.randn(10, 16)
        edge_index = torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)

        output = model(x, edge_index)
        assert output.shape == (10, 8)

        # Test with attention weights
        output, attention_weights = model(x, edge_index, return_attention_weights=True)
        assert output.shape == (10, 8)
        assert len(attention_weights) > 0

    def test_graph_transformer_forward(self):
        """Test Graph Transformer forward pass"""
        model = GraphTransformer(input_dim=16, hidden_dim=32, output_dim=8, num_heads=4)

        x = torch.randn(10, 16)
        edge_index = torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)

        output = model(x, edge_index)
        assert output.shape == (10, 8)

    def test_graph_isomorphism_network_forward(self):
        """Test GIN forward pass"""
        model = GraphIsomorphismNetwork(input_dim=16, hidden_dim=32, output_dim=8)

        x = torch.randn(10, 16)
        edge_index = torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)

        output = model(x, edge_index)
        assert output.shape == (10, 8)

    def test_hierarchical_graph_network_forward(self):
        """Test Hierarchical GNN forward pass"""
        model = HierarchicalGraphNetwork(input_dim=16, hidden_dim=32, output_dim=8)

        x = torch.randn(20, 16)  # Larger graph for hierarchical processing
        edge_index = torch.tensor([[0, 1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 0]], dtype=torch.long)

        output = model(x, edge_index)
        assert output.shape[1] == 8  # Output dimension should match


class TestIntelGraphGNN:
    """Test the main IntelGraph GNN model"""

    def test_node_classification_model(self):
        """Test node classification configuration"""
        model = IntelGraphGNN(
            node_feature_dim=16,
            hidden_dim=32,
            output_dim=8,
            model_type="graphsage",
            task_type="node_classification",
            num_classes=3,
        )

        # Create test data
        data = Data(
            x=torch.randn(10, 16), edge_index=torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)
        )

        output = model(data)
        assert output.shape == (10, 3)  # 10 nodes, 3 classes

    def test_link_prediction_model(self):
        """Test link prediction configuration"""
        model = IntelGraphGNN(
            node_feature_dim=16,
            hidden_dim=32,
            output_dim=8,
            model_type="gat",
            task_type="link_prediction",
        )

        # Create test data with edge pairs to predict
        data = Data(
            x=torch.randn(10, 16),
            edge_index=torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long),
            edge_label_index=torch.tensor([[0, 1], [4, 5]], dtype=torch.long),
        )

        output = model(data)
        assert output.shape == (2, 1)  # 2 edge pairs, 1 probability each

    def test_graph_classification_model(self):
        """Test graph classification configuration"""
        model = IntelGraphGNN(
            node_feature_dim=16,
            hidden_dim=32,
            output_dim=8,
            model_type="gin",
            task_type="graph_classification",
            num_classes=4,
        )

        # Create batch of graphs
        batch = torch.tensor([0, 0, 0, 1, 1, 1, 1])  # 2 graphs
        data = Data(
            x=torch.randn(7, 16),
            edge_index=torch.tensor([[0, 1, 2, 3, 4], [1, 2, 0, 4, 5]], dtype=torch.long),
            batch=batch,
        )

        output = model(data)
        assert output.shape == (2, 4)  # 2 graphs, 4 classes each

    def test_anomaly_detection_model(self):
        """Test anomaly detection configuration"""
        model = IntelGraphGNN(
            node_feature_dim=16,
            hidden_dim=32,
            output_dim=8,
            model_type="gat",
            task_type="anomaly_detection",
        )

        data = Data(
            x=torch.randn(10, 16), edge_index=torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)
        )

        output = model(data)
        assert output.shape == (10, 1)  # 10 nodes, 1 anomaly score each
        assert torch.all(output >= 0) and torch.all(output <= 1)  # Sigmoid output


class TestGNNModelManager:
    """Test GNN model management"""

    @pytest.fixture
    def manager(self, tmp_path):
        """Create a temporary model manager"""
        return GNNModelManager(model_dir=str(tmp_path))

    def test_create_model(self, manager):
        """Test model creation"""
        model = manager.create_model(
            model_name="test_model",
            node_feature_dim=16,
            model_type="graphsage",
            task_type="node_classification",
            num_classes=3,
        )

        assert isinstance(model, IntelGraphGNN)
        assert "test_model" in manager.list_models()

        # Check model info
        info = manager.get_model_info("test_model")
        assert info["config"]["node_feature_dim"] == 16
        assert info["config"]["task_type"] == "node_classification"
        assert not info["trained"]

    def test_save_and_load_model(self, manager):
        """Test model saving and loading"""
        # Create and train a simple model
        model = manager.create_model(
            model_name="save_test",
            node_feature_dim=16,
            model_type="graphsage",
            task_type="node_classification",
            num_classes=2,
        )

        # Save model
        metrics = {"accuracy": 0.85, "loss": 0.25}
        manager.save_model("save_test", metrics=metrics)

        # Check that model is marked as trained
        info = manager.get_model_info("save_test")
        assert info["trained"]
        assert info["metrics"] == metrics

        # Delete from memory and reload
        del manager.models["save_test"]
        loaded_model = manager.load_model("save_test")

        assert isinstance(loaded_model, IntelGraphGNN)
        assert "save_test" in manager.list_models()

        # Check loaded model info
        info = manager.get_model_info("save_test")
        assert info["trained"]
        assert info["metrics"] == metrics

    def test_model_prediction(self, manager):
        """Test model prediction"""
        # Create model
        model = manager.create_model(
            model_name="pred_test",
            node_feature_dim=8,
            model_type="graphsage",
            task_type="node_classification",
            num_classes=2,
        )

        # Create test data
        data = Data(
            x=torch.randn(5, 8), edge_index=torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)
        )

        # Make prediction
        result = manager.predict("pred_test", data, return_embeddings=True)

        assert "predictions" in result
        assert "embeddings" in result
        assert "model_type" in result
        assert "task_type" in result

        assert result["predictions"].shape == (5, 2)  # 5 nodes, 2 classes
        assert result["embeddings"] is not None

    def test_delete_model(self, manager):
        """Test model deletion"""
        # Create model
        manager.create_model(
            model_name="delete_test",
            node_feature_dim=16,
            model_type="graphsage",
            task_type="node_classification",
        )

        assert "delete_test" in manager.list_models()

        # Delete model
        manager.delete_model("delete_test")

        assert "delete_test" not in manager.list_models()


class TestGNNDataProcessor:
    """Test data processing utilities"""

    def test_networkx_to_pyg_conversion(self):
        """Test NetworkX to PyTorch Geometric conversion"""
        # Create test graph
        G = nx.Graph()
        G.add_edges_from([(0, 1), (1, 2), (2, 3)])

        # Add node features
        node_features = {
            0: np.array([1.0, 2.0]),
            1: np.array([2.0, 3.0]),
            2: np.array([3.0, 4.0]),
            3: np.array([4.0, 5.0]),
        }

        # Add node labels
        node_labels = {0: 0, 1: 1, 2: 0, 3: 1}

        # Convert
        data = GNNDataProcessor.networkx_to_pyg(
            G, node_features=node_features, node_labels=node_labels
        )

        assert data.x.shape == (4, 2)  # 4 nodes, 2 features
        assert data.edge_index.shape == (2, 3)  # 3 edges
        assert data.y.shape == (4,)  # 4 node labels
        assert data.num_nodes == 4

    def test_create_link_prediction_data(self):
        """Test link prediction data creation"""
        # Create test data
        data = Data(
            x=torch.randn(10, 8),
            edge_index=torch.tensor(
                [[0, 1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8, 9]], dtype=torch.long
            ),
            num_nodes=10,
        )

        # Create splits
        train_data, val_data, test_data = GNNDataProcessor.create_link_prediction_data(
            data, train_ratio=0.6, val_ratio=0.2, test_ratio=0.2
        )

        # Check that all splits have required attributes
        for split in [train_data, val_data, test_data]:
            assert hasattr(split, "edge_label_index")
            assert hasattr(split, "edge_label")
            assert split.edge_label_index.shape[0] == 2
            assert split.edge_label.shape[0] == split.edge_label_index.shape[1]

    def test_create_node_classification_masks(self):
        """Test node classification mask creation"""
        data = Data(
            x=torch.randn(20, 8),
            edge_index=torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long),
            y=torch.randint(0, 3, (20,)),
            num_nodes=20,
        )

        # Create masks
        data = GNNDataProcessor.create_node_classification_masks(
            data, train_ratio=0.6, val_ratio=0.2, test_ratio=0.2
        )

        assert hasattr(data, "train_mask")
        assert hasattr(data, "val_mask")
        assert hasattr(data, "test_mask")

        # Check mask sizes
        assert data.train_mask.sum().item() == int(0.6 * 20)
        assert data.val_mask.sum().item() == int(0.2 * 20)
        assert data.test_mask.sum().item() == 20 - int(0.6 * 20) - int(0.2 * 20)

        # Check no overlap
        assert not torch.any(data.train_mask & data.val_mask)
        assert not torch.any(data.train_mask & data.test_mask)
        assert not torch.any(data.val_mask & data.test_mask)


class TestGNNTrainer:
    """Test GNN training functionality"""

    @pytest.fixture
    def simple_model(self):
        """Create a simple model for testing"""
        return IntelGraphGNN(
            node_feature_dim=8,
            hidden_dim=16,
            output_dim=8,
            model_type="graphsage",
            task_type="node_classification",
            num_classes=2,
        )

    @pytest.fixture
    def sample_data(self):
        """Create sample training data"""
        data = Data(
            x=torch.randn(10, 8),
            edge_index=torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long),
            y=torch.randint(0, 2, (10,)),
            num_nodes=10,
        )
        return GNNDataProcessor.create_node_classification_masks(data)

    def test_trainer_initialization(self, simple_model):
        """Test trainer initialization"""
        trainer = GNNTrainer(simple_model)

        assert trainer.model == simple_model
        assert trainer.optimizer is not None
        assert trainer.scheduler is not None
        assert trainer.training_history == []

    def test_compute_loss(self, simple_model):
        """Test loss computation"""
        trainer = GNNTrainer(simple_model)

        # Test classification loss
        predictions = torch.randn(5, 2)
        targets = torch.randint(0, 2, (5,))

        loss = trainer.compute_loss(predictions, targets, "node_classification")
        assert isinstance(loss, torch.Tensor)
        assert loss.item() >= 0

        # Test link prediction loss
        link_predictions = torch.sigmoid(torch.randn(5, 1))
        link_targets = torch.randint(0, 2, (5,))

        loss = trainer.compute_loss(link_predictions, link_targets, "link_prediction")
        assert isinstance(loss, torch.Tensor)
        assert loss.item() >= 0

    def test_compute_metrics(self, simple_model):
        """Test metric computation"""
        trainer = GNNTrainer(simple_model)

        # Test classification metrics
        predictions = torch.tensor([[0.8, 0.2], [0.3, 0.7], [0.9, 0.1]])
        targets = torch.tensor([0, 1, 0])

        metrics = trainer.compute_metrics(predictions, targets, "node_classification")

        assert "accuracy" in metrics
        assert "precision" in metrics
        assert "recall" in metrics
        assert "f1" in metrics
        assert all(0 <= v <= 1 for v in metrics.values())

    def test_train_epoch(self, simple_model, sample_data):
        """Test single training epoch"""
        trainer = GNNTrainer(simple_model)

        from torch_geometric.data import DataLoader

        train_loader = DataLoader([sample_data], batch_size=1)

        metrics = trainer.train_epoch(train_loader, "node_classification", progress_bar=False)

        assert "loss" in metrics
        assert "accuracy" in metrics
        assert isinstance(metrics["loss"], float)
        assert 0 <= metrics["accuracy"] <= 1

    def test_validate_epoch(self, simple_model, sample_data):
        """Test single validation epoch"""
        trainer = GNNTrainer(simple_model)

        from torch_geometric.data import DataLoader

        val_loader = DataLoader([sample_data], batch_size=1)

        metrics = trainer.validate_epoch(val_loader, "node_classification", progress_bar=False)

        assert "loss" in metrics
        assert "accuracy" in metrics
        assert isinstance(metrics["loss"], float)
        assert 0 <= metrics["accuracy"] <= 1


class TestSyntheticDataGeneration:
    """Test synthetic dataset generation"""

    def test_create_synthetic_graph_dataset(self):
        """Test synthetic graph dataset creation"""
        dataset = create_synthetic_graph_dataset(
            num_graphs=10,
            min_nodes=5,
            max_nodes=15,
            node_feature_dim=8,
            num_classes=3,
            task_type="graph_classification",
        )

        assert len(dataset) == 10

        for data in dataset:
            assert isinstance(data, Data)
            assert data.x.shape[1] == 8  # Feature dimension
            assert 5 <= data.num_nodes <= 15  # Node count range
            assert data.y.shape == (1,)  # Graph label
            assert 0 <= data.y.item() < 3  # Label range

    def test_node_classification_dataset(self):
        """Test node classification dataset creation"""
        dataset = create_synthetic_graph_dataset(num_graphs=5, task_type="node_classification")

        for data in dataset:
            assert data.y.shape == (data.num_nodes,)  # Node-level labels
            assert torch.all(data.y >= 0)
            assert torch.all(data.y < 3)


class TestGNNIntegration:
    """Test integration between components"""

    def test_end_to_end_node_classification(self):
        """Test complete node classification workflow"""
        # Create manager
        manager = GNNModelManager()

        # Create synthetic data
        G = nx.karate_club_graph()
        node_features = {node: np.random.randn(8) for node in G.nodes()}
        node_labels = {node: 0 if G.nodes[node]["club"] == "Mr. Hi" else 1 for node in G.nodes()}

        # Convert to PyG
        data = GNNDataProcessor.networkx_to_pyg(
            G, node_features=node_features, node_labels=node_labels
        )
        data = GNNDataProcessor.create_node_classification_masks(data)

        # Create model
        model = manager.create_model(
            model_name="integration_test",
            node_feature_dim=8,
            model_type="graphsage",
            task_type="node_classification",
            num_classes=2,
        )

        # Quick training
        trainer = GNNTrainer(model)
        from torch_geometric.data import DataLoader

        train_loader = DataLoader([data], batch_size=1)
        val_loader = DataLoader([data], batch_size=1)

        # Train for just 2 epochs to test workflow
        results = trainer.train(
            train_loader=train_loader,
            val_loader=val_loader,
            task_type="node_classification",
            num_epochs=2,
            model_name="integration_test",
            progress_bar=False,
        )

        assert "final_train_metrics" in results
        assert "final_val_metrics" in results
        assert len(results["training_history"]) == 2

        # Test prediction
        pred_result = manager.predict("integration_test", data, return_embeddings=True)

        assert pred_result["predictions"].shape == (data.num_nodes, 2)
        assert pred_result["embeddings"] is not None

        # Cleanup
        manager.delete_model("integration_test")


if __name__ == "__main__":
    pytest.main([__file__])
