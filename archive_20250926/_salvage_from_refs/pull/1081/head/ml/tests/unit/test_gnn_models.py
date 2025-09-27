import torch
from torch_geometric.data import Data

from ml.app.models.gnn_model import GNNAnomalyDetector, GNNLinkPredictor


# Helper function to create dummy graph data
def create_dummy_data(num_nodes=10, num_features=16, num_edges=20):
    x = torch.randn(num_nodes, num_features)
    edge_index = torch.randint(0, num_nodes, (2, num_edges))
    return Data(x=x, edge_index=edge_index)


class TestGNNLinkPredictor:
    def test_initialization(self):
        model = GNNLinkPredictor(num_node_features=16, hidden_channels=32)
        assert isinstance(model, GNNLinkPredictor)
        assert len(model.convs) == 2

    def test_forward_pass(self):
        model = GNNLinkPredictor(num_node_features=16, hidden_channels=32)
        data = create_dummy_data(num_nodes=10, num_features=16)
        output = model(data.x, data.edge_index)
        assert output.shape == (data.num_nodes, 32)  # hidden_channels as output for backbone


class TestGNNAnomalyDetector:
    def test_initialization(self):
        model = GNNAnomalyDetector(num_node_features=16, hidden_channels=32)
        assert isinstance(model, GNNAnomalyDetector)
        assert len(model.convs) == 2
        assert isinstance(model.out, torch.nn.Linear)

    def test_forward_pass(self):
        model = GNNAnomalyDetector(num_node_features=16, hidden_channels=32)
        data = create_dummy_data(num_nodes=10, num_features=16)
        output = model(data.x, data.edge_index)
        assert output.shape == (data.num_nodes, 1)  # Anomaly score per node
        assert torch.all((output >= 0) & (output <= 1))  # Sigmoid output
