import torch
from torch import nn
from typing import List, Tuple


class LinkPredictor:
    """Simple Node2Vec-style link predictor using embeddings."""

    def __init__(self, embedding_dim: int = 32):
        self.embedding_dim = embedding_dim
        self.model: nn.Embedding | None = None
        self.node_index: dict[str, int] = {}

    def fit(self, edges: List[Tuple[str, str]]) -> None:
        """Train embeddings from known edges."""
        nodes = set([u for u, v in edges] + [v for u, v in edges])
        self.node_index = {node: idx for idx, node in enumerate(nodes)}
        self.model = nn.Embedding(len(self.node_index), self.embedding_dim)
        optimizer = torch.optim.SGD(self.model.parameters(), lr=0.05)
        edge_idx = torch.tensor(
            [[self.node_index[u], self.node_index[v]] for u, v in edges],
            dtype=torch.long,
        )
        for _ in range(50):
            optimizer.zero_grad()
            u_emb = self.model(edge_idx[:, 0])
            v_emb = self.model(edge_idx[:, 1])
            score = (u_emb * v_emb).sum(dim=1)
            loss = -torch.log(torch.sigmoid(score)).mean()
            loss.backward()
            optimizer.step()

    def predict(self, source: str, candidates: List[str]) -> List[Tuple[str, float]]:
        if not self.model or source not in self.node_index:
            return []
        src_idx = self.node_index[source]
        src_emb = self.model(torch.tensor([src_idx]))[0]
        preds: List[Tuple[str, float]] = []
        for c in candidates:
            if c not in self.node_index or c == source:
                continue
            dst_idx = self.node_index[c]
            dst_emb = self.model(torch.tensor([dst_idx]))[0]
            score = torch.sigmoid((src_emb * dst_emb).sum()).item()
            preds.append((c, float(score)))
        preds.sort(key=lambda x: x[1], reverse=True)
        return preds

    def suggest_links(
        self,
        nodes: List[str],
        edges: List[Tuple[str, str]],
        source: str,
        top_k: int = 5,
    ) -> List[Tuple[str, float]]:
        self.fit(edges)
        existing = {(u, v) for u, v in edges} | {(v, u) for u, v in edges}
        candidates = [n for n in nodes if (source, n) not in existing and n != source]
        return self.predict(source, candidates)[:top_k]
