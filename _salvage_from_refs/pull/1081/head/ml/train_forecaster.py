"""Training pipeline for the graph forecaster.

This script demonstrates how a temporal graph model could be trained
using PyTorch Lightning.  The implementation is deliberately minimal and
serves as scaffolding for future development.
"""

from __future__ import annotations

import os
from datetime import datetime

import pytorch_lightning as pl
from pytorch_lightning.loggers import WandbLogger


class DummyForecaster(pl.LightningModule):
    """Placeholder Lightning model."""

    def __init__(self) -> None:
        super().__init__()

    def training_step(self, batch, batch_idx):  # type: ignore[override]
        return pl.utilities.types.StepOutput(0)

    def configure_optimizers(self):  # type: ignore[override]
        return []


def train(output_dir: str, max_epochs: int = 1, project: str = "intelgraph-forecast") -> None:
    """Run a demo training session and log to Weights & Biases."""
    logger: WandbLogger | None = None
    if os.environ.get("WANDB_API_KEY"):
        logger = WandbLogger(project=project)
    trainer = pl.Trainer(max_epochs=max_epochs, logger=logger, enable_checkpointing=False)
    model = DummyForecaster()
    trainer.fit(model)
    if logger:
        logger.experiment.finish()  # type: ignore[attr-defined]

    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "latest.txt"), "w") as f:
        f.write(f"Trained at {datetime.utcnow().isoformat()}\n")


if __name__ == "__main__":
    train("models/forecast")
