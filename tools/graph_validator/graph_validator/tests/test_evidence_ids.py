from pathlib import Path

from graph_validator.evidence.ids import EvidenceIdInputs, derive_evidence_id


def test_evidence_id_is_deterministic(tmp_path: Path) -> None:
    mapping = tmp_path / 'mapping.yml'
    mapping.write_text('version: 1\nseed: test\nentities: []\n', encoding='utf-8')
    mapping_bytes = mapping.read_bytes()
    inputs = EvidenceIdInputs(
        code_sha='abc123def456',
        mapping_bytes=mapping_bytes,
        seed='seed-value',
        mode='ci',
    )
    first = derive_evidence_id(inputs)
    second = derive_evidence_id(inputs)
    assert first == second
