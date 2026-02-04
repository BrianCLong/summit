import pytest
from pathlib import Path
from summit.audio.voice.schema import VoiceArtifact
from summit.audio.voice.store import VoiceStore

def test_voice_artifact_roundtrip(tmp_path):
    store = VoiceStore(tmp_path)

    artifact = VoiceArtifact(
        voice_id="v1_sha256_mock",
        created_from="design",
        lang_tags=["en", "zh"],
        style_tags=["calm", "professional"],
        provenance_model="Qwen3-TTS-12Hz-1.7B",
        provenance_revision="v1.0"
    )

    # Save
    path = store.save(artifact)
    assert path.exists()

    # Load
    loaded = store.load("v1_sha256_mock")
    assert loaded == artifact

def test_load_nonexistent():
    store = VoiceStore(Path("/tmp/nonexistent_voice_store"))
    assert store.load("missing") is None
