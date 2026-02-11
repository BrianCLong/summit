import os

import pytest

from cogwar.innovation.narrative_clustering import cluster_narratives
from cogwar.innovation.sync_inference import infer_sync_events


def test_sync_inference_disabled_by_default():
    # Ensure env var is not set or false (save/restore)
    old_val = os.environ.get("COGWAR_INNOVATION")
    if "COGWAR_INNOVATION" in os.environ:
        del os.environ["COGWAR_INNOVATION"]

    with pytest.raises(PermissionError):
        infer_sync_events([])

    if old_val:
        os.environ["COGWAR_INNOVATION"] = old_val

def test_narrative_clustering_disabled_by_default():
    # Ensure env var is not set or false
    old_val = os.environ.get("COGWAR_INNOVATION")
    if "COGWAR_INNOVATION" in os.environ:
        del os.environ["COGWAR_INNOVATION"]

    with pytest.raises(PermissionError):
        cluster_narratives([])

    if old_val:
        os.environ["COGWAR_INNOVATION"] = old_val

def test_features_enabled_with_flag():
    os.environ["COGWAR_INNOVATION"] = "true"
    try:
        assert infer_sync_events([]) == ["sync_event_1"]
        assert cluster_narratives([]) == ["cluster_1"]
    finally:
        del os.environ["COGWAR_INNOVATION"]
