import pytest
from summit.integrations.palantir_foundry_hyper import HyperCompute, HyperRow, MaterializationPolicy

def test_hyper_streaming_anomaly():
    hyper = HyperCompute()

    def transform(d):
        d["value"] = d["value"] * 2
        return d

    # Generate stream: 20 normal items, 1 outlier
    def stream_gen():
        for i in range(20):
            yield HyperRow(data={"value": 10.0 + (i % 2)})
        yield HyperRow(data={"value": 1000.0}) # Anomaly

    results = list(hyper.stream_process(stream_gen(), transform))

    # The anomaly should be dropped by the monitor
    assert len(results) == 20
    assert all(r.data["value"] < 100 for r in results)

def test_hyper_policy_privacy():
    hyper = HyperCompute()
    policy = MaterializationPolicy(retention_days=1, freshness_seconds=3600, privacy_k_anonymity=5)

    data = [
        HyperRow(data={"name": "Alice", "age": 30}),
        HyperRow(data={"name": "Bob", "age": 40})
    ]

    masked = hyper.apply_policy(data, policy)
    assert len(masked) == 2
    assert masked[0].data["name"] == "***" # Masked
    assert masked[0].data["age"] == 30 # Ints preserved
