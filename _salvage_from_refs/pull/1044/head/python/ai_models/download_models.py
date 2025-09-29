"""Utilities to download required AI models."""

from __future__ import annotations

import spacy
from transformers import AutoModelForTokenClassification, AutoTokenizer


def download() -> None:
    """Download spaCy and Hugging Face models used by the extraction service."""
    try:
        spacy.cli.download("en_core_web_sm")
    except Exception as exc:
        print(f"spaCy model download failed: {exc}")

    model_name = "Xenova/bert-base-NER"
    try:
        AutoTokenizer.from_pretrained(model_name)
        AutoModelForTokenClassification.from_pretrained(model_name)
    except Exception as exc:
        print(f"Hugging Face model download failed: {exc}")


if __name__ == "__main__":
    download()
