from __future__ import annotations

"""Multilingual translation and entity extraction agent."""

import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass

import networkx as nx

try:  # pragma: no cover - optional dependency
    from transformers import pipeline as hf_pipeline
except Exception:  # pragma: no cover - transformers not installed
    hf_pipeline = None  # type: ignore


@dataclass
class MultilingualIntelAgent:
    """Agent that translates text, extracts entities and inserts them into a graph.

    Parameters
    ----------
    translator: optional callable
        Function used to translate text to English. When ``None`` a small
        HuggingFace translation pipeline is attempted; if that fails a
        pass-through translator is used.
    ner: optional callable
        Function used to extract named entities from text. When ``None`` a
        HuggingFace NER pipeline is attempted; if that fails a simple regex
        extractor is used.
    """

    translator: Callable | None = None
    ner: Callable | None = None

    def __post_init__(self) -> None:  # pragma: no cover - simple wiring
        if self.translator is None:
            self.translator = self._build_translator()
        if self.ner is None:
            self.ner = self._build_ner()

    # ------------------------------------------------------------------
    def _build_translator(self) -> Callable[[str], str]:
        """Attempt to construct a translation pipeline."""

        if hf_pipeline is None:
            return lambda x: x
        try:  # pragma: no cover - network optional
            return hf_pipeline("translation", model="Helsinki-NLP/opus-mt-mul-en")
        except Exception:
            return lambda x: x

    def _build_ner(self) -> Callable[[str], Iterable[dict]]:
        """Attempt to construct a named entity recognition pipeline."""

        if hf_pipeline is None:
            return lambda text: [
                {"word": m.group(0)} for m in re.finditer(r"\b[A-Z][a-zA-Z]+\b", text)
            ]
        try:  # pragma: no cover - network optional
            return hf_pipeline("ner", grouped_entities=True)
        except Exception:
            return lambda text: [
                {"word": m.group(0)} for m in re.finditer(r"\b[A-Z][a-zA-Z]+\b", text)
            ]

    # ------------------------------------------------------------------
    def translate(self, text: str, target_lang: str = "en") -> str:
        """Translate ``text`` to ``target_lang`` (English only by default)."""

        if not callable(self.translator):
            return text
        try:
            result = self.translator(text)
            if isinstance(result, list):
                return result[0].get("translation_text", text)
            return str(result)
        except Exception:
            return text

    def extract_entities(self, text: str, lang: str | None = None) -> list[str]:
        """Extract entities from ``text``. Non-English text is translated first."""

        if lang and lang.lower() != "en":
            text = self.translate(text, "en")
        if not callable(self.ner):
            return []
        try:
            result = self.ner(text)
            # HuggingFace returns list of dicts with "word" key
            if isinstance(result, list) and result and isinstance(result[0], dict):
                return [r.get("word", "") for r in result if r.get("word")]
            return [str(r) for r in result]
        except Exception:
            return [m.group(0) for m in re.finditer(r"\b[A-Z][a-zA-Z]+\b", text)]

    def process_text(self, text: str, source_lang: str | None = None) -> dict:
        """Process text and return detected entities along with translation."""

        lang = source_lang or "unknown"
        translation = self.translate(text) if lang != "en" else text
        entities = self.extract_entities(translation, "en")
        return {"lang": lang, "translation": translation, "entities": entities}

    def insert_entities(self, graph: nx.Graph, entities: Iterable[str]) -> None:
        """Insert ``entities`` as nodes into ``graph``."""

        for ent in entities:
            graph.add_node(ent)
