import pytest
import os
import json
from summit.slopguard.cluster import run_cluster_analysis, REGISTRY_PATH

@pytest.fixture(autouse=True)
def cleanup_registry():
    if os.path.exists(REGISTRY_PATH):
        os.remove(REGISTRY_PATH)
    yield
    if os.path.exists(REGISTRY_PATH):
        os.remove(REGISTRY_PATH)

def test_clustering_disabled():
    policy = {"feature_flags": {"advanced_cluster_detection": False}}
    results = run_cluster_analysis({"text": "test"}, policy)
    assert results["status"] == "DISABLED"

def test_detect_exact_duplicate():
    policy = {"feature_flags": {"advanced_cluster_detection": True}}
    artifact1 = {"id": "art1", "text": "This is a unique artifact text for testing clustering."}
    artifact2 = {"id": "art2", "text": "This is a unique artifact text for testing clustering."}

    run_cluster_analysis(artifact1, policy)
    results = run_cluster_analysis(artifact2, policy)

    assert results["status"] == "ACTIVE"
    assert any(f["type"] == "EXACT_DUPLICATE" for f in results["findings"])

def test_detect_near_duplicate():
    policy = {"feature_flags": {"advanced_cluster_detection": True}}
    artifact1 = {"id": "art1", "text": "The quick brown fox jumps over the lazy dog many times."}
    # Change one word
    artifact2 = {"id": "art2", "text": "The quick brown fox jumps over the lazy cat many times."}

    run_cluster_analysis(artifact1, policy)
    results = run_cluster_analysis(artifact2, policy)

    assert results["status"] == "ACTIVE"
    assert any(f["type"] == "NEAR_DUPLICATE" for f in results["findings"])
