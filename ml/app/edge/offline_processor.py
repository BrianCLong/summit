from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image
from torchvision import transforms


class OfflineProcessor:
    """Run lightweight models locally for image, audio and text data.

    Models are stored as TorchScript modules inside ``model_dir`` so they can
    be executed without a Python source dependency.  This makes the pipeline
    suitable for edge devices that may operate for extended periods without
    network connectivity.
    """

    def __init__(self, model_dir: Path | str) -> None:
        self.model_dir = Path(model_dir)
        self.image_model = torch.jit.load(self.model_dir / "image_model.pt")
        self.audio_model = torch.jit.load(self.model_dir / "audio_model.pt")
        self.text_model = torch.jit.load(self.model_dir / "text_model.pt")
        self._img_tf = transforms.ToTensor()

    # ------------------------------------------------------------------
    def process_image(self, data: bytes) -> dict[str, Any]:
        """Classify a single image given raw byte input."""
        img = Image.open(io.BytesIO(data)).convert("RGB")
        tensor = self._img_tf(img).unsqueeze(0)
        with torch.inference_mode():
            logits = self.image_model(tensor)
        prediction = int(torch.argmax(logits, dim=1).item())
        return {"modality": "image", "prediction": prediction}

    # ------------------------------------------------------------------
    def process_audio(self, waveform: np.ndarray) -> dict[str, Any]:
        """Classify an audio waveform array."""
        tensor = torch.tensor(waveform, dtype=torch.float32).unsqueeze(0)
        with torch.inference_mode():
            logits = self.audio_model(tensor)
        prediction = int(torch.argmax(logits, dim=1).item())
        return {"modality": "audio", "prediction": prediction}

    # ------------------------------------------------------------------
    def process_text(self, text: str) -> dict[str, Any]:
        """Classify text by encoding characters as numeric features."""
        max_len = 16
        encoded = [ord(c) / 255.0 for c in text[:max_len]]
        if len(encoded) < max_len:
            encoded += [0.0] * (max_len - len(encoded))
        tensor = torch.tensor(encoded, dtype=torch.float32).unsqueeze(0)
        with torch.inference_mode():
            logits = self.text_model(tensor)
        prediction = int(torch.argmax(logits, dim=1).item())
        return {"modality": "text", "prediction": prediction}
