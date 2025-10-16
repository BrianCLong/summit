"""
PyTorch GNN-based Link Prediction Model for IntelGraph
Predicts likelihood of connections between entities in knowledge graphs
"""

import logging

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import GCNConv

logger = logging.getLogger(__name__)


class LinkPredictor(nn.Module):
    """
    Graph Neural Network for predicting links between entities.
    Uses Graph Convolutional Networks (GCN) to learn node embeddings
    and predicts edge probability between node pairs.
    """

    def __init__(
        self,
        input_dim: int = 128,
        hidden_dim: int = 64,
        output_dim: int = 32,
        num_layers: int = 2,
        dropout: float = 0.1,
    ):
        super(LinkPredictor, self).__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers
        self.dropout = dropout

        # GCN layers for node embedding
        self.convs = nn.ModuleList()
        self.convs.append(GCNConv(input_dim, hidden_dim))

        for _ in range(num_layers - 2):
            self.convs.append(GCNConv(hidden_dim, hidden_dim))

        self.convs.append(GCNConv(hidden_dim, output_dim))

        # Link prediction head
        self.link_predictor = nn.Sequential(
            nn.Linear(output_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid(),
        )

    def forward(
        self, x: torch.Tensor, edge_index: torch.Tensor, batch: torch.Tensor | None = None
    ) -> torch.Tensor:
        """
        Forward pass for node embeddings

        Args:
            x: Node features [num_nodes, input_dim]
            edge_index: Edge connectivity [2, num_edges]
            batch: Batch assignment for each node (for batched graphs)

        Returns:
            Node embeddings [num_nodes, output_dim]
        """
        # Apply GCN layers
        for i, conv in enumerate(self.convs):
            x = conv(x, edge_index)
            if i < len(self.convs) - 1:
                x = F.relu(x)
                x = F.dropout(x, p=self.dropout, training=self.training)

        return x

    def predict_links(
        self, node_embeddings: torch.Tensor, node_pairs: torch.Tensor
    ) -> torch.Tensor:
        """
        Predict link probability for given node pairs

        Args:
            node_embeddings: Node embeddings [num_nodes, output_dim]
            node_pairs: Pairs of node indices [num_pairs, 2]

        Returns:
            Link probabilities [num_pairs, 1]
        """
        # Get embeddings for each node in pairs
        node_i_emb = node_embeddings[node_pairs[:, 0]]  # [num_pairs, output_dim]
        node_j_emb = node_embeddings[node_pairs[:, 1]]  # [num_pairs, output_dim]

        # Concatenate embeddings
        pair_embeddings = torch.cat([node_i_emb, node_j_emb], dim=1)  # [num_pairs, output_dim * 2]

        # Predict link probability
        link_probs = self.link_predictor(pair_embeddings)

        return link_probs


class IntelGraphLinkPredictor:
    """
    High-level interface for link prediction in IntelGraph
    Handles data preprocessing, model inference, and result formatting
    """

    def __init__(self, model_path: str | None = None, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = None
        self.entity_to_idx = {}
        self.idx_to_entity = {}

        if model_path:
            self.load_model(model_path)
        else:
            # Initialize with default parameters for scaffold
            self.model = LinkPredictor().to(self.device)
            logger.info("Initialized LinkPredictor with default parameters")

    def load_model(self, model_path: str):
        """Load trained model from file"""
        try:
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=True)
            self.model = LinkPredictor(**checkpoint.get("model_config", {}))
            self.model.load_state_dict(checkpoint["model_state_dict"])
            self.model.to(self.device)
            self.model.eval()

            # Load entity mappings if available
            if "entity_mappings" in checkpoint:
                self.entity_to_idx = checkpoint["entity_mappings"]["entity_to_idx"]
                self.idx_to_entity = checkpoint["entity_mappings"]["idx_to_entity"]

            logger.info(f"Loaded model from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model from {model_path}: {e}")
            raise

    def save_model(self, model_path: str):
        """Save model and metadata to file"""
        try:
            checkpoint = {
                "model_state_dict": self.model.state_dict(),
                "model_config": {
                    "input_dim": self.model.input_dim,
                    "hidden_dim": self.model.hidden_dim,
                    "output_dim": self.model.output_dim,
                    "num_layers": self.model.num_layers,
                    "dropout": self.model.dropout,
                },
                "entity_mappings": {
                    "entity_to_idx": self.entity_to_idx,
                    "idx_to_entity": self.idx_to_entity,
                },
            }
            torch.save(checkpoint, model_path)
            logger.info(f"Saved model to {model_path}")
        except Exception as e:
            logger.error(f"Failed to save model to {model_path}: {e}")
            raise

    def predict_entity_links(
        self,
        entities: list[dict],
        relationships: list[dict],
        target_entities: list[str] | None = None,
        top_k: int = 10,
        threshold: float = 0.5,
    ) -> list[dict]:
        """
        Predict potential links for entities in a graph

        Args:
            entities: List of entity dicts with 'id', 'type', 'features'
            relationships: List of relationship dicts with 'from', 'to', 'type'
            target_entities: Specific entities to predict links for (if None, predict for all)
            top_k: Maximum number of predictions per entity
            threshold: Minimum confidence threshold

        Returns:
            List of prediction dicts with 'from', 'to', 'confidence', 'reasoning'
        """
        if not self.model:
            logger.warning("No model loaded, returning scaffold predictions")
            return self._generate_scaffold_predictions(entities, target_entities, top_k)

        try:
            # Convert to PyTorch Geometric format
            graph_data = self._prepare_graph_data(entities, relationships)

            # Get node embeddings
            with torch.no_grad():
                node_embeddings = self.model(graph_data.x, graph_data.edge_index)

            # Generate candidate pairs
            candidate_pairs = self._generate_candidate_pairs(
                entities, target_entities, relationships
            )

            if len(candidate_pairs) == 0:
                return []

            # Predict link probabilities
            pair_tensor = torch.tensor(candidate_pairs, dtype=torch.long, device=self.device)

            with torch.no_grad():
                link_probs = self.model.predict_links(node_embeddings, pair_tensor)

            # Format results
            predictions = []
            for i, (from_idx, to_idx) in enumerate(candidate_pairs):
                confidence = float(link_probs[i])

                if confidence >= threshold:
                    from_entity = self.idx_to_entity[from_idx]
                    to_entity = self.idx_to_entity[to_idx]

                    predictions.append(
                        {
                            "from": from_entity,
                            "to": to_entity,
                            "confidence": confidence,
                            "reasoning": "GNN prediction based on graph structure",
                            "type": "predicted_link",
                        }
                    )

            # Sort by confidence and return top_k
            predictions.sort(key=lambda x: x["confidence"], reverse=True)
            return predictions[:top_k]

        except Exception as e:
            logger.error(f"Error in link prediction: {e}")
            return self._generate_scaffold_predictions(entities, target_entities, top_k)

    def _prepare_graph_data(self, entities: list[dict], relationships: list[dict]) -> Data:
        """Convert entities and relationships to PyTorch Geometric Data object"""

        # Build entity mappings
        self.entity_to_idx = {entity["id"]: i for i, entity in enumerate(entities)}
        self.idx_to_entity = {i: entity["id"] for i, entity in enumerate(entities)}

        # Create node features (placeholder with random features for scaffold)
        num_nodes = len(entities)
        node_features = torch.randn(num_nodes, self.model.input_dim, device=self.device)

        # Create edge index
        edge_list = []
        for rel in relationships:
            from_idx = self.entity_to_idx.get(rel["from"])
            to_idx = self.entity_to_idx.get(rel["to"])

            if from_idx is not None and to_idx is not None:
                edge_list.append([from_idx, to_idx])
                # Add reverse edge for undirected graph
                edge_list.append([to_idx, from_idx])

        if edge_list:
            edge_index = torch.tensor(edge_list, dtype=torch.long, device=self.device).t()
        else:
            # Empty graph
            edge_index = torch.empty((2, 0), dtype=torch.long, device=self.device)

        return Data(x=node_features, edge_index=edge_index)

    def _generate_candidate_pairs(
        self,
        entities: list[dict],
        target_entities: list[str] | None,
        existing_relationships: list[dict],
    ) -> list[tuple[int, int]]:
        """Generate candidate entity pairs for link prediction"""

        # Get existing edges to avoid predicting them
        existing_edges = set()
        for rel in existing_relationships:
            from_idx = self.entity_to_idx.get(rel["from"])
            to_idx = self.entity_to_idx.get(rel["to"])
            if from_idx is not None and to_idx is not None:
                existing_edges.add((from_idx, to_idx))
                existing_edges.add((to_idx, from_idx))

        candidates = []
        entity_indices = list(self.entity_to_idx.values())

        if target_entities:
            target_indices = [
                self.entity_to_idx[eid] for eid in target_entities if eid in self.entity_to_idx
            ]
        else:
            target_indices = entity_indices

        # Generate pairs
        for from_idx in target_indices:
            for to_idx in entity_indices:
                if from_idx != to_idx and (from_idx, to_idx) not in existing_edges:
                    candidates.append((from_idx, to_idx))

        return candidates

    def _generate_scaffold_predictions(
        self, entities: list[dict], target_entities: list[str] | None, top_k: int
    ) -> list[dict]:
        """Generate placeholder predictions for scaffold testing"""

        if target_entities is None:
            target_entities = [e["id"] for e in entities[: min(3, len(entities))]]

        predictions = []
        for i, target in enumerate(target_entities):
            for j, entity in enumerate(entities):
                if entity["id"] != target and len(predictions) < top_k:
                    confidence = np.random.uniform(0.6, 0.9)  # Placeholder confidence
                    predictions.append(
                        {
                            "from": target,
                            "to": entity["id"],
                            "confidence": confidence,
                            "reasoning": f"Scaffold prediction (random confidence: {confidence:.3f})",
                            "type": "scaffold_prediction",
                        }
                    )

        return sorted(predictions, key=lambda x: x["confidence"], reverse=True)[:top_k]


# Factory function for easy instantiation
def create_link_predictor(
    model_path: str | None = None, device: str = "cpu"
) -> IntelGraphLinkPredictor:
    """
    Factory function to create a link predictor instance

    Args:
        model_path: Path to saved model file (optional)
        device: Device to run model on ('cpu' or 'cuda')

    Returns:
        IntelGraphLinkPredictor instance
    """
    return IntelGraphLinkPredictor(model_path=model_path, device=device)


# Example usage and testing
if __name__ == "__main__":
    # Test scaffold functionality
    predictor = create_link_predictor()

    # Example entities and relationships
    test_entities = [
        {"id": "person_1", "type": "person", "name": "Alice"},
        {"id": "person_2", "type": "person", "name": "Bob"},
        {"id": "org_1", "type": "organization", "name": "TechCorp"},
        {"id": "event_1", "type": "event", "name": "Meeting"},
    ]

    test_relationships = [
        {"from": "person_1", "to": "org_1", "type": "employed_by"},
        {"from": "person_1", "to": "event_1", "type": "attended"},
    ]

    # Test prediction
    predictions = predictor.predict_entity_links(
        entities=test_entities,
        relationships=test_relationships,
        target_entities=["person_2"],
        top_k=5,
    )

    print("Link Predictions:")
    for pred in predictions:
        print(f"  {pred['from']} -> {pred['to']} (confidence: {pred['confidence']:.3f})")
        print(f"    Reasoning: {pred['reasoning']}")
