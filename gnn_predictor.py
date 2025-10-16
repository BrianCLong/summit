import json
from dataclasses import dataclass

import torch
from torch import nn
from torch_geometric.data import Data
from torch_geometric.nn import GCNConv


@dataclass
class LinkPrediction:
    source: int
    target: int
    confidence: float


class GNNPredictor:
    """Simple GNN-based link predictor for demonstration purposes."""

    def __init__(self, model_path: str = "gnn_model.pt") -> None:
        self.model_path = model_path
        self.data = self._create_dummy_graph()
        self.model = self._build_model(self.data.num_node_features)
        self._trained = False

    def _create_dummy_graph(self) -> Data:
        # four nodes with identity features and a simple cycle
        x = torch.eye(4)
        edge_index = torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long)
        return Data(x=x, edge_index=edge_index)

    def _build_model(self, in_channels: int) -> nn.Module:
        class Net(nn.Module):
            def __init__(self, in_c: int) -> None:
                super().__init__()
                self.conv = GCNConv(in_c, 8)
                self.lin = nn.Linear(8, 1)

            def forward(self, data: Data) -> torch.Tensor:
                x = self.conv(data.x, data.edge_index).relu()
                return self.lin(x).squeeze(-1)

        return Net(in_channels)

    def train(self, epochs: int = 50) -> None:
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)
        for _ in range(epochs):
            optimizer.zero_grad()
            # self-supervised objective: minimize norm of outputs
            out = self.model(self.data)
            loss = (out**2).mean()
            loss.backward()
            optimizer.step()
        self._trained = True

    def save(self) -> None:
        if self._trained:
            torch.save(self.model.state_dict(), self.model_path)

    def load(self) -> None:
        try:
            state = torch.load(self.model_path, weights_only=True)
            self.model.load_state_dict(state)
            self._trained = True
        except FileNotFoundError:
            pass

    def predict(self) -> list[dict[str, float]]:
        if not self._trained:
            self.train(epochs=10)
        with torch.no_grad():
            scores = self.model(self.data).sigmoid().tolist()
        predictions: list[dict[str, float]] = []
        for idx, score in enumerate(scores):
            predictions.append(
                {
                    "source": idx,
                    "target": (idx + 1) % self.data.num_nodes,
                    "confidence": float(score),
                }
            )
        predictions.sort(key=lambda p: p["confidence"], reverse=True)
        return predictions


if __name__ == "__main__":
    predictor = GNNPredictor()
    preds = predictor.predict()
    print(json.dumps(preds, indent=2))
