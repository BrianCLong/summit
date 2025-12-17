from __future__ import annotations

import json
from pathlib import Path

import pytest

import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.grtc.compiler import (
    CorpusCompiler,
    load_specification,
    parse_specification,
    write_corpus,
)
from tools.grtc.runtime import ReferenceAdapter, execute_corpus, iter_test_cases
from tools.grtc.signing import load_signer
from tools.grtc.ci import generate_ci_assets


@pytest.fixture()
def sample_spec_path(tmp_path: Path) -> Path:
    source = Path("samples/grtc/sample-requirements.yaml")
    target = tmp_path / "requirements.yaml"
    target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    return target


def _compile(tmp_path: Path, spec_path: Path, seed: str = "101") -> Path:
    raw = load_specification(spec_path)
    spec = parse_specification(raw, seed_override=seed)
    signer = load_signer(seed)
    compiler = CorpusCompiler(spec)
    artifact = compiler.compile()
    output_dir = tmp_path / f"out-{seed}"
    write_corpus(artifact, output_dir, signer)
    generate_ci_assets(output_dir)
    return output_dir


def test_compile_is_deterministic(sample_spec_path: Path, tmp_path: Path) -> None:
    first = _compile(tmp_path, sample_spec_path, seed="123")
    second = _compile(tmp_path, sample_spec_path, seed="123")

    first_manifest = (first / "manifest.json").read_text(encoding="utf-8")
    second_manifest = (second / "manifest.json").read_text(encoding="utf-8")
    assert first_manifest == second_manifest

    for manifest in (first, second):
        files = sorted((manifest / "corpus" / "testcases").glob("*.json"))
        assert files, "expected testcases to be generated"
    assert {
        f.read_text(encoding="utf-8")
        for f in (first / "corpus" / "testcases").glob("*.json")
    } == {
        f.read_text(encoding="utf-8")
        for f in (second / "corpus" / "testcases").glob("*.json")
    }


def test_manifest_signature_verifies(sample_spec_path: Path, tmp_path: Path) -> None:
    output_dir = _compile(tmp_path, sample_spec_path, seed="777")
    signer = load_signer("777")
    manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
    signature = manifest["signature"]["value"]
    assert signer.verify_manifest(manifest, signature)


def test_reference_adapter_is_stable(sample_spec_path: Path, tmp_path: Path) -> None:
    output_dir = _compile(tmp_path, sample_spec_path, seed="321")
    adapter = ReferenceAdapter()
    first = execute_corpus(output_dir, adapter)
    second = execute_corpus(output_dir, adapter)
    assert [(item.test_id, item.passed) for item in first] == [
        (item.test_id, item.passed) for item in second
    ]
    expected = {}
    for testcase in iter_test_cases(output_dir):
        expected_block = testcase.get("expected", {})
        if isinstance(expected_block, dict):
            verdict = str(expected_block.get("verdict", "pass")).lower()
        else:
            verdict = "pass"
        expected[testcase["id"]] = verdict in {"pass", "succeed", "reproduce"}
    assert {item.test_id: item.passed for item in first} == expected
