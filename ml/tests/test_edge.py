import io
import json

# Ensure the app package is on the import path when tests are executed from
# the repository root.
import sys
from pathlib import Path

import httpx
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.edge import OfflineProcessor, SyncManager


def _save_dummy_models(model_dir: Path) -> None:
    model_dir.mkdir(parents=True, exist_ok=True)
    img_model = nn.Sequential(nn.Flatten(), nn.Linear(3 * 8 * 8, 2))
    torch.jit.script(img_model).save(model_dir / "image_model.pt")
    audio_model = nn.Sequential(nn.Flatten(), nn.Linear(100, 2))
    torch.jit.script(audio_model).save(model_dir / "audio_model.pt")
    text_model = nn.Sequential(nn.Linear(16, 2))
    torch.jit.script(text_model).save(model_dir / "text_model.pt")


def test_offline_processing_and_sync(tmp_path):
    model_dir = tmp_path / "models"
    _save_dummy_models(model_dir)
    processor = OfflineProcessor(model_dir)

    # Image
    img = Image.fromarray(np.zeros((8, 8, 3), dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    image_res = processor.process_image(buf.getvalue())
    assert image_res["modality"] == "image"

    # Audio
    waveform = np.zeros(100, dtype=np.float32)
    audio_res = processor.process_audio(waveform)
    assert audio_res["modality"] == "audio"

    # Text
    text_res = processor.process_text("hi")
    assert text_res["modality"] == "text"

    # Sync
    sync_dir = tmp_path / "sync"
    manager = SyncManager(sync_dir, "https://example.com/upload")
    record_path = manager.store(text_res)
    assert record_path.exists()

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode())
        return httpx.Response(200, json=payload)

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport)
    manager.sync(client=client)
    assert not record_path.exists()
    client.close()
