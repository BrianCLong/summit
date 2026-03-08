"""Training routine for node classification using GraphSAGE."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import torch
from torch import nn

from ..models.sage import GraphSAGE, GraphSAGEConfig, NodeClassifier
from ..optim import SAM


@dataclass
class NodeClsConfig:
    sage: GraphSAGEConfig
    lr: float = 0.01
    epochs: int = 50
    optimizer: str = "adam"
    sam_rho: float = 0.05
    sam_adaptive: bool = False


def train_node_cls(
    features: torch.Tensor,
    neigh: list[Sequence[int]],
    labels: torch.Tensor,
    cfg: NodeClsConfig,
) -> tuple[GraphSAGE, NodeClassifier]:
    encoder = GraphSAGE(cfg.sage)
    classifier = NodeClassifier(cfg.sage.hidden_dim, int(labels.max().item()) + 1)
    params = list(encoder.parameters()) + list(classifier.parameters())

    optimizer_name = cfg.optimizer.lower()
    if optimizer_name == "sam":
        opt = SAM(
            params,
            torch.optim.Adam,
            lr=cfg.lr,
            rho=cfg.sam_rho,
            adaptive=cfg.sam_adaptive,
        )
    elif optimizer_name == "adam":
        opt = torch.optim.Adam(params, lr=cfg.lr)
    else:
        raise ValueError(f"Unsupported optimizer: {cfg.optimizer}")

    criterion = nn.CrossEntropyLoss()

    for _ in range(cfg.epochs):
        if optimizer_name == "sam":

            def closure() -> torch.Tensor:
                z = encoder(features, neigh)
                logits = classifier(z)
                loss = criterion(logits, labels)
                opt.zero_grad()
                loss.backward()
                return loss

            opt.step(closure)
            continue

        z = encoder(features, neigh)
        logits = classifier(z)
        loss = criterion(logits, labels)
        opt.zero_grad()
        loss.backward()
        opt.step()

    return encoder, classifier
