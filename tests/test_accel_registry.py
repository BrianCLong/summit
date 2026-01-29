from summit.accel.contracts import AccelMethodSpec, AccelRunResult
from summit.accel.registry import get, list_methods, register


def test_register_and_get_roundtrip() -> None:
    spec = AccelMethodSpec(
        method_id="cm",
        family="consistency",
        modality="t2i",
        steps=4,
    )

    def runner(method_spec: AccelMethodSpec, options: dict) -> AccelRunResult:
        assert method_spec == spec
        assert options == {"seed": 1}
        return AccelRunResult(
            outputs_uri="file://outputs",
            metrics={"latency_ms": 12.0},
            evidence_id="EVD-FASTGEN-REGISTRY-001",
        )

    register(spec.method_id, runner)
    resolved = get("cm")
    result = resolved(spec, {"seed": 1})

    assert result.outputs_uri == "file://outputs"
    assert result.metrics["latency_ms"] == 12.0
    assert result.evidence_id == "EVD-FASTGEN-REGISTRY-001"
    assert list_methods() == ["cm"]


def test_register_rejects_duplicates() -> None:
    spec = AccelMethodSpec(
        method_id="dmd2",
        family="dist_match",
        modality="t2i",
        steps=2,
    )

    def runner(method_spec: AccelMethodSpec, options: dict) -> AccelRunResult:
        return AccelRunResult(
            outputs_uri="file://outputs",
            metrics={},
            evidence_id="EVD-FASTGEN-REGISTRY-001",
        )

    register(spec.method_id, runner)

    try:
        register(spec.method_id, runner)
    except ValueError as exc:
        assert "method already registered" in str(exc)
    else:
        raise AssertionError("expected ValueError for duplicate register")


def test_get_unknown_method_raises_key_error() -> None:
    try:
        get("unknown")
    except KeyError as exc:
        assert "unknown method_id" in str(exc)
    else:
        raise AssertionError("expected KeyError for unknown method")
