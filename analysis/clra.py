"""Cognitive Load Reduction Assistant (CLRA).

This module provides utilities to reduce analyst fatigue by summarizing
intel feeds, highlighting graph changes, prioritizing events and linking
context for entities. The goal is to surface high signal information in a
compact form so analysts can act quickly without being overwhelmed.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass


@dataclass
class CLRAHighlight:
    """Represents a high priority graph change."""

    source: str
    target: str
    change_type: str
    description: str


class CognitiveLoadReductionAssistant:
    """Assistant that distills high‑volume intel into actionable insights."""

    def summarize_feed(
        self,
        feed: str,
        max_sentences: int = 3,
        mode: str = "first",
    ) -> str:
        """Return a lightweight summary of *feed*.

        Parameters
        ----------
        feed:
            Raw text to summarise.
        max_sentences:
            Maximum number of sentences to include in the summary.
        mode:
            ``"first"`` returns the first ``max_sentences`` sentences. ``"frequency"``
            performs a simple frequency based extraction where sentences with the
            highest sum of token frequencies are selected.
        """

        sentences = re.split(r"(?<=[.!?])\s+", feed.strip())
        if mode == "frequency":
            words = re.findall(r"\b\w+\b", feed.lower())
            stopwords = {"the", "a", "and", "of", "to", "in"}
            freq = Counter(w for w in words if w not in stopwords)
            scores: list[int] = []
            for sent in sentences:
                tokens = re.findall(r"\b\w+\b", sent.lower())
                scores.append(sum(freq.get(t, 0) for t in tokens))
            top_indices = sorted(range(len(sentences)), key=lambda i: scores[i], reverse=True)[
                :max_sentences
            ]
            summary = " ".join(sentences[i] for i in sorted(top_indices))
            return summary
        summary = " ".join(sentences[:max_sentences])
        return summary

    def highlight_changes(
        self,
        old_graph: dict[str, Iterable[str]],
        new_graph: dict[str, Iterable[str]],
    ) -> list[CLRAHighlight]:
        """Identify edge additions and removals between graphs."""

        highlights: list[CLRAHighlight] = []
        for node, neighbours in new_graph.items():
            old_neighbours = set(old_graph.get(node, []))
            for neighbour in neighbours:
                if neighbour not in old_neighbours:
                    highlights.append(
                        CLRAHighlight(
                            source=node,
                            target=neighbour,
                            change_type="added",
                            description=f"New link found between {node} and {neighbour}",
                        )
                    )
        for node, neighbours in old_graph.items():
            new_neighbours = set(new_graph.get(node, []))
            for neighbour in neighbours:
                if neighbour not in new_neighbours:
                    highlights.append(
                        CLRAHighlight(
                            source=node,
                            target=neighbour,
                            change_type="removed",
                            description=f"Link removed between {node} and {neighbour}",
                        )
                    )
        return highlights

    def prioritize_events(
        self,
        events: Iterable[str],
        weights: dict[str, int] | None = None,
    ) -> list[str]:
        """Order events using a weighted keyword priority model."""

        if weights is None:
            weights = {"critical": 3, "urgent": 2, "high": 1}

        def score(event: str) -> tuple[int, str]:
            for keyword, weight in sorted(weights.items(), key=lambda kv: -kv[1]):
                if keyword in event.lower():
                    return (-weight, event)
            return (0, event)

        return [e for _, e in sorted(score(evt) for evt in events)]

    def link_context(
        self,
        graph: dict[str, Iterable[str]],
        entity: str,
    ) -> dict[str, list[str]]:
        """Return immediate neighbours and second degree context for *entity*."""

        first_degree = list(graph.get(entity, []))
        second_degree: set[str] = set()
        for neighbour in first_degree:
            second_degree.update(n for n in graph.get(neighbour, []) if n != entity)
        return {
            "first_degree": sorted(first_degree),
            "second_degree": sorted(second_degree),
        }

    def trending_entities(self, feeds: Iterable[str], top_n: int = 5) -> list[str]:
        """Return the top occurring tokens across *feeds*.

        Tokens shorter than four characters and common stop words are ignored.
        """

        stopwords = {"the", "and", "for", "that", "with", "from"}
        counter: Counter[str] = Counter()
        for feed in feeds:
            tokens = re.findall(r"\b\w{4,}\b", feed.lower())
            counter.update(t for t in tokens if t not in stopwords)
        return [w for w, _ in counter.most_common(top_n)]
