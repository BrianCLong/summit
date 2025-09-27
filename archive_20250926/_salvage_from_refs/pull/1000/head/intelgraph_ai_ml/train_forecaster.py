"""Training pipeline for the :mod:`graph_forecaster`.

The script demonstrates how a temporal graph model could be trained
using PyTorch Lightning with Weights & Biases logging.  The training
routine is intentionally simple and operates on randomly generated data
so the pipeline can run in constrained environments.
"""
from __future__ import annotations

import torch
import pytorch_lightning as pl
from pytorch_lightning.loggers import WandbLogger


class DummyTemporalDataset(torch.utils.data.Dataset):
    """Generate a tiny synthetic dataset for demonstration purposes."""

    def __len__(self) -> int:  # pragma: no cover - trivial
        return 32

    def __getitem__(self, idx: int):  # pragma: no cover - trivial
        x = torch.randn(10)
        y = torch.tensor([0.0])
        return x, y


class ForecasterModule(pl.LightningModule):
    def __init__(self):
        super().__init__()
        self.model = torch.nn.Linear(10, 1)

    def forward(self, x):  # pragma: no cover - trivial
        return self.model(x)

    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = torch.nn.functional.mse_loss(y_hat, y)
        self.log("train_loss", loss)
        return loss

    def configure_optimizers(self):  # pragma: no cover - trivial
        return torch.optim.Adam(self.model.parameters(), lr=1e-3)


def train() -> None:  # pragma: no cover - thin wrapper
    dataset = DummyTemporalDataset()
    loader = torch.utils.data.DataLoader(dataset, batch_size=8)
    logger = WandbLogger(project="intelgraph-forecast")
    trainer = pl.Trainer(max_epochs=1, logger=logger, enable_checkpointing=False)
    model = ForecasterModule()
    trainer.fit(model, loader)


if __name__ == "__main__":  # pragma: no cover - script entry
    train()
