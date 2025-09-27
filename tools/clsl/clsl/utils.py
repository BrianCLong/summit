from __future__ import annotations


import csv
import json
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple


def ensure_dir(path: Path) -> None:
  """Create ``path`` if it does not already exist."""
  path.mkdir(parents=True, exist_ok=True)


def load_json(path: Path) -> dict:
  return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, payload: object) -> None:
  text = json.dumps(payload, indent=2, sort_keys=True)
  path.write_text(text + "\n", encoding="utf-8")


def write_csv(path: Path, rows: Sequence[dict]) -> None:
  if not rows:
    path.write_text("", encoding="utf-8")
    return

  fieldnames = list(rows[0].keys())
  with path.open("w", encoding="utf-8", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
      writer.writerow(row)


def stable_hash_bytes(data: bytes, namespace: str = "") -> float:
  digest = sha256(namespace.encode("utf-8") + data).hexdigest()
  return int(digest[:12], 16) / float(16 ** 12)


def normalize_whitespace(text: str) -> str:
  return " ".join(text.split())


@dataclass(frozen=True)
class RocPoint:
  threshold: float
  tpr: float
  fpr: float


def roc_curve(samples: Iterable[Tuple[float, int]]) -> List[RocPoint]:
  ordered = sorted(samples, key=lambda item: item[0], reverse=True)
  positives = sum(label for _, label in ordered)
  negatives = len(ordered) - positives
  if positives == 0:
    positives = 1
  if negatives == 0:
    negatives = 1

  points: List[RocPoint] = []
  tp = fp = 0
  previous_score: float | None = None

  def add_point(score: float) -> None:
    tpr = tp / positives
    fpr = fp / negatives
    points.append(RocPoint(threshold=score, tpr=tpr, fpr=fpr))

  for score, label in ordered:
    if previous_score is None or score != previous_score:
      add_point(score)
      previous_score = score
    if label:
      tp += 1
    else:
      fp += 1

  add_point(0.0)
  return points


def auc(points: Sequence[RocPoint]) -> float:
  if len(points) < 2:
    return 0.0
  area = 0.0
  for left, right in zip(points, points[1:]):
    width = abs(left.fpr - right.fpr)
    height = (left.tpr + right.tpr) / 2
    area += width * height
  return round(area, 6)
