import json
import os
import subprocess
import sys

import pytest


def test_cli_help():
    result = subprocess.run(
        [sys.executable, "-m", "summit_emu3.cli", "--help"],
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": "ai-ml-suite/emu3"}
    )
    assert result.returncode == 0
    assert "Summit Emu3 Adapter CLI" in result.stdout

def test_cli_caption_dummy(tmp_path):
    # Create a dummy image file
    img = tmp_path / "test.jpg"
    img.write_text("fake image content")

    out_file = tmp_path / "output.json"

    result = subprocess.run(
        [
            sys.executable, "-m", "summit_emu3.cli",
            "--backend", "dummy",
            "--out", str(out_file),
            "caption", str(img)
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": "ai-ml-suite/emu3"}
    )

    assert result.returncode == 0

    with open(out_file) as f:
        data = json.load(f)

    assert data["mode"] == "caption"
    assert "dummy" in data["caption"]
    assert data["provenance"]["backend"] == "dummy"

def test_cli_vqa_dummy(tmp_path):
    img = tmp_path / "test.jpg"
    img.write_text("fake image content")

    result = subprocess.run(
        [
            sys.executable, "-m", "summit_emu3.cli",
            "--backend", "dummy",
            "vqa", str(img),
            "--question", "What?"
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": "ai-ml-suite/emu3"}
    )

    assert result.returncode == 0
    data = json.loads(result.stdout)
    assert data["mode"] == "vqa"
    assert data["qa"][0]["question"] == "What?"

def test_cli_consistency_dummy(tmp_path):
    vid = tmp_path / "test.mp4"
    vid.write_text("fake video content")

    result = subprocess.run(
        [
            sys.executable, "-m", "summit_emu3.cli",
            "--backend", "dummy",
            "video-consistency", str(vid)
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": "ai-ml-suite/emu3"}
    )

    assert result.returncode == 0
    data = json.loads(result.stdout)
    assert data["mode"] == "video-consistency"
    assert data["consistency_score"] > 0

def test_cli_hf_guard(tmp_path):
    img = tmp_path / "test.jpg"
    img.write_text("fake image content")

    # Run without enabling env var
    env = {**os.environ, "PYTHONPATH": "ai-ml-suite/emu3"}
    if "SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD" in env:
        del env["SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD"]

    result = subprocess.run(
        [
            sys.executable, "-m", "summit_emu3.cli",
            "--backend", "hf",
            "caption", str(img)
        ],
        capture_output=True,
        text=True,
        env=env
    )

    assert result.returncode != 0
    # Can fail due to missing transformers (ImportError) or missing env var (RuntimeError)
    # Both result in non-zero exit code and error message on stderr
    assert "Error" in result.stderr
