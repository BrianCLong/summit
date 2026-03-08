import json
from pathlib import Path
from typing import Any, Dict, List, Union


class MMSD2Dataset:
    """
    Adapter for MMSD2.0 Dataset.
    Expected structure:
    root_dir/
      {split}.json  (list of dicts with 'text', 'label', 'image_id')
      images/       (directory containing images referenced by 'image_id')
    """

    def __init__(self, root_dir: Union[str, Path], split: str = "test"):
        self.root_dir = Path(root_dir)
        self.split = split
        self.images_dir = self.root_dir / "images"
        self.data_file = self.root_dir / f"{split}.json"

        self._data: list[dict[str, Any]] = []
        self._load_data()

    def _load_data(self) -> None:
        if not self.root_dir.exists():
            raise FileNotFoundError(f"Dataset root directory not found: {self.root_dir}")

        if not self.images_dir.exists():
            raise FileNotFoundError(f"Images directory not found: {self.images_dir}")

        if not self.data_file.exists():
            # Fallback to data.json if split file doesn't exist
            fallback = self.root_dir / "data.json"
            if fallback.exists():
                self.data_file = fallback
            else:
                raise FileNotFoundError(f"Data file not found: {self.data_file}")

        try:
            with open(self.data_file, encoding="utf-8") as f:
                content = json.load(f)
                if isinstance(content, list):
                    self._data = content
                elif isinstance(content, dict):
                    # Handle case where it might be a dict with ids as keys
                    # Assuming values are the samples.
                    self._data = list(content.values())
                else:
                     raise ValueError(f"Unexpected JSON format in {self.data_file}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to decode JSON from {self.data_file}: {e}")

    def __len__(self) -> int:
        return len(self._data)

    def __getitem__(self, idx: int) -> dict[str, Any]:
        item = self._data[idx]

        # Normalize fields
        # MMSD usually has 'text', 'label', 'image_id'
        text = item.get("text", "")
        label = item.get("label")
        image_id = item.get("image_id")

        # Construct image path
        image_path = None
        if image_id:
            candidate = self.images_dir / image_id
            if candidate.exists():
                image_path = candidate
            else:
                # Try adding extensions if missing
                for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                    candidate = self.images_dir / f"{image_id}{ext}"
                    if candidate.exists():
                        image_path = candidate
                        break

        return {
            "id": str(idx),
            "text": text,
            "label": label,
            "image_path": str(image_path) if image_path else None,
            "raw": item
        }
