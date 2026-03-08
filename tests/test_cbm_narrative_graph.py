import os
import tempfile

import pytest

from summit.cbm.narratives import extract_and_cluster, write_narratives_artifact
from summit.cbm.schema import DocumentEvent


def test_narrative_clustering_determinism():
    events = [
        DocumentEvent(id="doc1", content="Claim A from doc 1", source="src1", metadata={}),
        DocumentEvent(id="doc2", content="Claim B from doc 2", source="src2", metadata={}),
    ]

    res1 = extract_and_cluster(events, "20240101")
    res2 = extract_and_cluster(events, "20240101")

    assert res1 == res2
    assert res1["metadata"]["cluster_count"] == 1
    assert "NARR-" in res1["narratives"][0]["id"]
    assert "EVID-CBM-20240101" in res1["metadata"]["evidence_id"]

def test_write_narrative_artifact():
    data = {"narratives": [], "metadata": {"cluster_count": 0}}
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        path = tmp.name

    try:
        write_narratives_artifact(data, path)
        assert os.path.exists(path)
        with open(path) as f:
            content = f.read()
            assert "cluster_count" in content
    finally:
        os.remove(path)
