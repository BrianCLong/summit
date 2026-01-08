import datetime as dt
import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from webhooks import (
    BackoffPolicy,
    DeliveryStatus,
    DeliveryStore,
    HmacSigner,
    HttpResponse,
    WebhookSubscription,
    WebhookWorker,
)


class SequencedClient:
    def __init__(self, responses: list[int]) -> None:
        self._responses = responses
        self.calls: list[dict[str, str]] = []

    def post(self, url: str, headers: dict[str, str], body: bytes) -> HttpResponse:
        self.calls.append(
            {"url": url, "body": body.decode(), "signature": headers.get("X-Webhook-Signature", "")}
        )
        index = min(len(self.calls) - 1, len(self._responses) - 1)
        return HttpResponse(status_code=self._responses[index], body="test")


def _subscription(event: str) -> WebhookSubscription:
    return WebhookSubscription(
        tenant_id="tenant-1",
        target_url="https://example.test/hooks",
        secret="shh",
        events=frozenset({event}),
    )


def test_hmac_signer_validates_payloads() -> None:
    signer = HmacSigner()
    payload = b'{"event":"case.created"}'
    signature = signer.sign("super-secret", payload, timestamp=1_700_000_000)

    assert signer.verify("super-secret", payload, signature)
    assert not signer.verify("super-secret", b'{"event":"tampered"}', signature)


def test_enqueue_enforces_idempotency_per_subscription() -> None:
    store = DeliveryStore()
    sub = store.add_subscription(_subscription("case.created"))
    worker = WebhookWorker(store, http_client=SequencedClient([200]))

    worker.enqueue_event("tenant-1", "case.created", {"id": "c-1"}, idempotency_key="abc123")
    worker.enqueue_event("tenant-1", "case.created", {"id": "c-1"}, idempotency_key="abc123")

    due = store.due_deliveries()
    assert len(due) == 1
    assert due[0].idempotency_key == "abc123"


def test_retry_sets_backoff_and_records_attempt() -> None:
    store = DeliveryStore()
    sub = store.add_subscription(_subscription("export.ready"))
    client = SequencedClient([500, 200])
    worker = WebhookWorker(
        store, http_client=client, backoff_policy=BackoffPolicy(base_seconds=1, factor=2)
    )

    worker.enqueue_event(
        sub.tenant_id, "export.ready", {"export_id": "ex-1"}, idempotency_key="evt-1"
    )

    first = worker.process_due()[0]
    assert first.status == DeliveryStatus.RETRYING
    assert first.attempt_count == 1
    assert first.last_error is not None
    assert first.next_attempt_at > dt.datetime.utcnow() - dt.timedelta(seconds=1)

    store.update_delivery(
        first.id,
        status=first.status,
        attempt_count=first.attempt_count,
        next_attempt_at=dt.datetime.utcnow() - dt.timedelta(seconds=1),
        last_error=first.last_error,
    )

    second = worker.process_due()[0]
    assert second.status == DeliveryStatus.DELIVERED
    assert second.attempt_count == 2
    assert worker.metrics.delivered == 1


def test_poison_messages_stop_retrying_after_max_attempts() -> None:
    store = DeliveryStore()
    sub = store.add_subscription(_subscription("ingest.completed"))
    client = SequencedClient([500, 500, 500, 500])
    worker = WebhookWorker(
        store,
        http_client=client,
        backoff_policy=BackoffPolicy(base_seconds=0, factor=1),
        max_attempts=3,
    )

    worker.enqueue_event(
        sub.tenant_id, "ingest.completed", {"ingest_id": "ing-1"}, idempotency_key="ing-evt"
    )

    latest = None
    for _ in range(3):
        latest = worker.process_due()[0]
        if latest.status != DeliveryStatus.POISONED:
            store.update_delivery(
                latest.id,
                status=latest.status,
                attempt_count=latest.attempt_count,
                next_attempt_at=dt.datetime.utcnow() - dt.timedelta(seconds=1),
                last_error=latest.last_error,
            )

    assert latest is not None
    assert latest.status == DeliveryStatus.POISONED
    assert worker.metrics.poisoned == 1
    assert store.due_deliveries(as_of=dt.datetime.utcnow() + dt.timedelta(hours=1)) == []
