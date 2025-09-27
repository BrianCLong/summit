from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Iterator, List

from .utils import load_json


@dataclass
class ContentItem:
  identifier: str
  root: Path
  relative_path: Path
  content_type: str
  ground_truth: Dict[str, bool]
  metadata: Dict[str, object]

  @property
  def path(self) -> Path:
    return self.root / self.relative_path

  def load_text(self) -> str:
    return self.path.read_text(encoding="utf-8")

  def load_bytes(self) -> bytes:
    return self.path.read_bytes()


class Dataset(Iterable[ContentItem]):
  def __init__(self, items: List[ContentItem]):
    self._items = items

  def __iter__(self) -> Iterator[ContentItem]:
    return iter(self._items)

  def __len__(self) -> int:  # pragma: no cover - trivial
    return len(self._items)


def load_dataset(path: Path) -> Dataset:
  payload = load_json(path)
  root = path.parent
  items: List[ContentItem] = []
  for entry in payload.get("items", []):
    items.append(
        ContentItem(
            identifier=entry["id"],
            root=root,
            relative_path=Path(entry["path"]),
            content_type=entry.get("type", "text"),
            ground_truth={"watermark": False, "c2pa": False, **entry.get("ground_truth", {})},
            metadata=entry.get("metadata", {}),
        )
    )
  return Dataset(items)
