"""Tests for deterministic evidence ID generation."""
from __future__ import annotations

import os

from dp.app.evidence import evidence_id_for_run, generate_evidence_id


def test_evidence_id_format():
    eid = generate_evidence_id("github.repo_intel", inputs=["e1", "e2"], params={})
    parts = eid.split(".")
    # eid.dp.<pipeline>.<sha8>.<inputs12>.<params8>
    assert eid.startswith("eid.dp.")
    # pipeline part contains dots, so count differently
    assert len(parts) >= 6


def test_evidence_id_is_deterministic():
    inputs = ["event-1", "event-2"]
    params = {"connector": "github", "owner": "acme"}
    eid1 = generate_evidence_id("github.repo_intel", inputs, params, git_sha="abc12345")
    eid2 = generate_evidence_id("github.repo_intel", inputs, params, git_sha="abc12345")
    assert eid1 == eid2


def test_evidence_id_changes_with_inputs():
    params = {}
    eid1 = generate_evidence_id("pipeline", inputs=["e1"], params=params)
    eid2 = generate_evidence_id("pipeline", inputs=["e2"], params=params)
    assert eid1 != eid2


def test_evidence_id_changes_with_params():
    inputs = ["e1"]
    eid1 = generate_evidence_id("pipeline", inputs=inputs, params={"a": 1})
    eid2 = generate_evidence_id("pipeline", inputs=inputs, params={"a": 2})
    assert eid1 != eid2


def test_evidence_id_for_run_uses_sorted_event_ids():
    params = {}
    eid1 = evidence_id_for_run("p", ["b", "a"], params)
    eid2 = evidence_id_for_run("p", ["a", "b"], params)
    assert eid1 == eid2


def test_git_sha_from_env(monkeypatch):
    monkeypatch.setenv("GIT_COMMIT", "deadbeef1234")
    eid = generate_evidence_id("pipeline", inputs=[], params={})
    assert "deadbeef" in eid
