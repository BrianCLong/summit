import json
from typing import Dict

import httpx
import pytest

from ig_rl.provenance import (
    ArtifactDigests,
    EvidencePublishError,
    KubernetesReleaseInspector,
    MCEvidencePublisher,
    SLOMetrics,
)
from ig_rl.provenance.logger import ProvenanceRecord


@pytest.mark.asyncio
async def test_publish_sends_sanitized_payload_and_metrics():
    requests: list[httpx.Request] = []

    async def metrics_provider(release_id: str) -> SLOMetrics:
        assert release_id == "rel-123"
        return SLOMetrics(latency_p95=0.9, latency_p99=1.4, error_rate=0.001, unit_cost=0.04)

    async def artifact_provider(release_id: str) -> ArtifactDigests:
        assert release_id == "rel-123"
        return ArtifactDigests(sbom_sha256="sha256:sbom", test_results_sha256="sha256:tests")

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        payload = json.loads(request.content.decode())
        if "PublishEvidence" in payload["query"]:
            variables = payload["variables"]["input"]
            assert variables["releaseId"] == "rel-123"
            assert variables["metrics"] == {
                "latencyP95": 0.9,
                "latencyP99": 1.4,
                "errorRate": 0.001,
                "unitCost": 0.04,
            }
            provenance = variables["provenance"]
            assert provenance["action"] == "approve"
            # PII (email) should be redacted
            assert provenance["caseId"].startswith("sha256:")
            return httpx.Response(
                200,
                json={
                    "data": {
                        "publishEvidence": {
                            "evidenceId": "ev-1",
                            "releaseId": "rel-123",
                        }
                    }
                },
            )
        return httpx.Response(200, json={"data": {"evidenceOk": {"ok": True, "details": {"budget": 0.5}}}})

    transport = httpx.MockTransport(handler)
    publisher = MCEvidencePublisher(
        "https://mc.example/graphql",
        token="token-1",
        metrics_provider=metrics_provider,
        artifact_provider=artifact_provider,
        release_inspector=KubernetesReleaseInspector(
            pod_labels="app=intelgraph,intelgraph.io/releaseId=rel-123"
        ),
        transport=transport,
    )

    record = ProvenanceRecord(
        decision_id="dec-1",
        case_id="user:jane.doe@example.com",
        action="approve",
        reward=0.99,
        reward_components={"accuracy": 0.8},
        model_hash="model@1",
        state_hash="state@1",
    )

    result = await publisher.publish(record)
    assert result.evidence_id == "ev-1"
    assert result.ok is True
    assert result.details == {"budget": 0.5}

    publish_request = requests[0]
    assert publish_request.headers["Authorization"] == "Bearer token-1"
    assert "Idempotency-Key" in publish_request.headers


@pytest.mark.asyncio
async def test_publish_retries_with_same_idempotency_key():
    attempts: Dict[str, int] = {"count": 0}
    captured_keys: list[str] = []

    async def metrics_provider(_: str) -> SLOMetrics:
        return SLOMetrics(latency_p95=1.0, latency_p99=1.8, error_rate=0.002, unit_cost=0.06)

    async def artifact_provider(_: str) -> ArtifactDigests:
        return ArtifactDigests(sbom_sha256="sha256:sbom", test_results_sha256="sha256:tests")

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode())
        if "PublishEvidence" in payload["query"]:
            attempts["count"] += 1
            captured_keys.append(request.headers.get("Idempotency-Key"))
            if attempts["count"] == 1:
                return httpx.Response(502, text="bad gateway")
            return httpx.Response(
                200,
                json={
                    "data": {
                        "publishEvidence": {
                            "evidenceId": "ev-2",
                            "releaseId": "rel-xyz",
                        }
                    }
                },
            )
        return httpx.Response(200, json={"data": {"evidenceOk": {"ok": True, "details": {}}}})

    transport = httpx.MockTransport(handler)
    publisher = MCEvidencePublisher(
        "https://mc.example/graphql",
        metrics_provider=metrics_provider,
        artifact_provider=artifact_provider,
        release_inspector=KubernetesReleaseInspector(rollout_labels={"releaseId": "rel-xyz"}),
        transport=transport,
        max_retries=3,
        retry_backoff_seconds=0.01,
    )

    record = ProvenanceRecord(
        decision_id="dec-2",
        case_id="case-2",
        action="ship",
        reward=0.75,
        reward_components={"latency": 0.5},
        model_hash="model@2",
        state_hash="state@2",
    )

    result = await publisher.publish(record)
    assert result.release_id == "rel-xyz"
    assert attempts["count"] == 2
    assert len(set(captured_keys)) == 1


@pytest.mark.asyncio
async def test_evidence_ok_failure_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode())
        if "PublishEvidence" in payload["query"]:
            return httpx.Response(500, text="fail")
        return httpx.Response(200, json={"data": {"evidenceOk": {"ok": False, "details": {}}}})

    transport = httpx.MockTransport(handler)
    publisher = MCEvidencePublisher(
        "https://mc.example/graphql",
        release_inspector=KubernetesReleaseInspector(pod_labels={"releaseId": "rel-err"}),
        transport=transport,
        max_retries=2,
        retry_backoff_seconds=0.01,
    )

    record = ProvenanceRecord(
        decision_id="dec-err",
        case_id="case-err",
        action="rollback",
        reward=0.1,
        reward_components={},
        model_hash="model@err",
        state_hash="state@err",
    )

    with pytest.raises(EvidencePublishError):
        await publisher.publish(record)
