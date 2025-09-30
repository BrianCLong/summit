"""Edge deployment helpers for IntelGraph ML."""

import torch

from .conversion import EdgeExportArtifact, ExportError, export_model_to_edge_formats

try:  # Optional dependency on torchvision for offline image processing
    from .offline_processor import OfflineProcessor
except Exception as exc:  # pragma: no cover - optional dependency shim
    import io
    from pathlib import Path
    import numpy as np
    from PIL import Image

    _offline_exc = exc

    class OfflineProcessor:  # type: ignore
        """Fallback implementation without torchvision."""

        def __init__(self, model_dir: Path | str) -> None:
            self.model_dir = Path(model_dir)
            self.image_model = torch.jit.load(self.model_dir / "image_model.pt")
            self.audio_model = torch.jit.load(self.model_dir / "audio_model.pt")
            self.text_model = torch.jit.load(self.model_dir / "text_model.pt")

        def _to_tensor(self, image: Image.Image) -> torch.Tensor:
            arr = np.asarray(image, dtype=np.float32) / 255.0
            tensor = torch.from_numpy(arr).permute(2, 0, 1)
            return tensor.unsqueeze(0)

        def process_image(self, data: bytes):
            img = Image.open(io.BytesIO(data)).convert("RGB")
            tensor = self._to_tensor(img)
            with torch.inference_mode():
                logits = self.image_model(tensor)
            prediction = int(torch.argmax(logits, dim=1).item())
            return {"modality": "image", "prediction": prediction}

        def process_audio(self, waveform):
            tensor = torch.tensor(waveform, dtype=torch.float32).unsqueeze(0)
            with torch.inference_mode():
                logits = self.audio_model(tensor)
            prediction = int(torch.argmax(logits, dim=1).item())
            return {"modality": "audio", "prediction": prediction}

        def process_text(self, text: str):
            max_len = 16
            encoded = [ord(c) / 255.0 for c in text[:max_len]]
            if len(encoded) < max_len:
                encoded += [0.0] * (max_len - len(encoded))
            tensor = torch.tensor(encoded, dtype=torch.float32).unsqueeze(0)
            with torch.inference_mode():
                logits = self.text_model(tensor)
            prediction = int(torch.argmax(logits, dim=1).item())
            return {"modality": "text", "prediction": prediction}

try:
    from .sync import SyncManager
except Exception as exc:  # pragma: no cover - defensive
    _sync_exc = exc

    class SyncManager:  # type: ignore
        def __init__(self, *_args, **_kwargs):
            raise ImportError("SyncManager dependencies are unavailable") from _sync_exc


__all__ = [
    "OfflineProcessor",
    "SyncManager",
    "EdgeExportArtifact",
    "ExportError",
    "export_model_to_edge_formats",
]
