"""Deception detection using a BERT-based classifier.

This module exposes a :class:`DeceptionDetector` that can be used to
train a lightweight BERT model for deception classification and score
incoming text.  It is intentionally minimal and is designed to plug into
the ingestion pipeline where suspicious posts are tagged with a
``deception_score``.
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
from torch.utils.data import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)


class _TextDataset(Dataset):
    """Simple ``Dataset`` wrapper for fine‑tuning."""

    def __init__(self, texts: list[str], labels: list[int], tokenizer):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self.texts)

    def __getitem__(self, idx: int):  # pragma: no cover - trivial
        item = self.tokenizer(
            self.texts[idx],
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        item = {k: v.squeeze(0) for k, v in item.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item


@dataclass
class DeceptionDetector:
    """BERT based deception detector.

    Parameters
    ----------
    model_name:
        Name of the HuggingFace model to use as a starting point.
    num_labels:
        Number of output labels.  ``2`` corresponds to deceptive vs.
        truthful.
    device:
        Optional torch device string.
    """

    model_name: str = "bert-base-uncased"
    num_labels: int = 2
    device: str | None = None

    def __post_init__(self) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name, num_labels=self.num_labels
        )
        if self.device:
            self.model.to(self.device)

    def train(self, texts: list[str], labels: list[int]) -> None:
        """Fine‑tune the detector on a small dataset."""

        dataset = _TextDataset(texts, labels, self.tokenizer)
        args = TrainingArguments(
            output_dir="./models/deception/tmp",
            per_device_train_batch_size=8,
            num_train_epochs=1,
            logging_steps=10,
            learning_rate=5e-5,
            no_cuda=self.device == "cpu",
        )
        trainer = Trainer(model=self.model, args=args, train_dataset=dataset)
        trainer.train()
        trainer.save_model("./models/deception")

    def score(self, text: str) -> float:
        """Return a deception score between 0 and 1."""

        inputs = self.tokenizer(text, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)
        return probs[0, 1].item()
