"""Sampling utilities for deterministic stratified evaluation."""

from __future__ import annotations

import random
from collections import defaultdict
from typing import Any, Iterable, List, Mapping, MutableSequence, Sequence

import pandas as pd


class StratifiedSampler:
  """Draws deterministic samples for evaluation tasks."""

  def __init__(self, seed: int) -> None:
    self._seed = seed

  def sample(
      self,
      rows: Sequence[Mapping[str, Any]],
      stratify_by: str,
      sample_size: int | None,
  ) -> List[Mapping[str, Any]]:
    grouped: MutableSequence[List[Mapping[str, Any]]] = defaultdict(list)
    for row in rows:
      grouped[row[stratify_by]].append(row)
    random.seed(self._seed)
    selections: List[Mapping[str, Any]] = []
    for group_rows in grouped.values():
      selections.extend(self._select_group(group_rows, sample_size))
    if sample_size is None:
      return selections
    # ensure deterministic order for reproducibility
    return sorted(selections, key=lambda row: row.get("id", row.get(stratify_by)))

  def _select_group(
      self,
      group_rows: Sequence[Mapping[str, Any]],
      sample_size: int | None,
  ) -> List[Mapping[str, Any]]:
    if sample_size is None or sample_size >= len(group_rows):
      return list(group_rows)
    indices = list(range(len(group_rows)))
    random.shuffle(indices)
    chosen = indices[:sample_size]
    return [group_rows[idx] for idx in chosen]


def apply_filters(
    rows: Iterable[Mapping[str, Any]],
    filters: Mapping[str, Any] | None,
) -> List[Mapping[str, Any]]:
  if not filters:
    return list(rows)
  filtered: List[Mapping[str, Any]] = []
  for row in rows:
    if all(row.get(key) == value for key, value in filters.items()):
      filtered.append(row)
  return filtered


def load_dataset(path: str) -> List[Mapping[str, Any]]:
  ext = path.split(".")[-1].lower()
  if ext == "json":
    frame = pd.read_json(path)
  elif ext in {"csv", "tsv"}:
    sep = "," if ext == "csv" else "\t"
    frame = pd.read_csv(path, sep=sep)
  else:
    raise ValueError(f"Unsupported dataset extension: {ext}")
  return frame.to_dict(orient="records")
