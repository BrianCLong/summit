"""Webhook delivery engine with persistence, retries, and observability."""

from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
import sqlite3
import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import Enum
from time import perf_counter
from typing import Any, Protocol


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    RETRYING = "retrying"
    DELIVERED = "delivered"
    POISONED = "poisoned"


@dataclass(frozen=True)
class WebhookSubscription:
    tenant_id: str
    target_url: str
    secret: str
    events: frozenset[str]
    id: int | None = None
    active: bool = True


@dataclass(frozen=True)
class WebhookDelivery:
    id: int
    subscription_id: int
    tenant_id: str
    event_type: str
    payload: dict[str, Any]
    idempotency_key: str
    status: DeliveryStatus
    attempt_count: int
    next_attempt_at: dt.datetime
    last_error: str | None


@dataclass(frozen=True)
class DeliveryAttempt:
    delivery_id: int
    status: DeliveryStatus
    status_code: int
    duration_ms: float
    error_message: str | None
    created_at: dt.datetime


class HttpClient(Protocol):
    def post(self, url: str, headers: Mapping[str, str], body: bytes) -> HttpResponse: ...


@dataclass(frozen=True)
class HttpResponse:
    status_code: int
    body: str = ""


class HmacSigner:
    def __init__(self, header: str = "X-Webhook-Signature", algo: str = "sha256") -> None:
        self.header = header
        self.algo = algo

    def sign(self, secret: str, payload: bytes, timestamp: int | None = None) -> str:
        ts = timestamp or int(time.time())
        message = f"{ts}.".encode() + payload
        digest = hmac.new(secret.encode(), message, getattr(hashlib, self.algo)).hexdigest()
        return f"t={ts},v1={digest}"

    def verify(self, secret: str, payload: bytes, signature: str) -> bool:
        parts = dict(item.split("=", 1) for item in signature.split(","))
        ts = int(parts.get("t", "0"))
        expected = self.sign(secret, payload, ts)
        return hmac.compare_digest(expected, signature)


class BackoffPolicy:
    def __init__(self, base_seconds: int = 1, factor: int = 2, max_seconds: int = 60) -> None:
        self.base_seconds = base_seconds
        self.factor = factor
        self.max_seconds = max_seconds

    def next_delay_seconds(self, attempts: int) -> int:
        delay = self.base_seconds * (self.factor ** max(attempts - 1, 0))
        return min(delay, self.max_seconds)


@dataclass
class WorkerMetrics:
    delivered: int = 0
    failed: int = 0
    poisoned: int = 0
    latencies_ms: list[float] = field(default_factory=list)

    def record_success(self, duration_ms: float) -> None:
        self.delivered += 1
        self.latencies_ms.append(duration_ms)

    def record_failure(self, duration_ms: float) -> None:
        self.failed += 1
        self.latencies_ms.append(duration_ms)

    def record_poison(self) -> None:
        self.poisoned += 1


class DeliveryStore:
    def __init__(self, db_path: str = ":memory:") -> None:
        self._conn = sqlite3.connect(db_path)
        self._conn.row_factory = sqlite3.Row
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        cursor = self._conn.cursor()
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                target_url TEXT NOT NULL,
                secret TEXT NOT NULL,
                events TEXT NOT NULL,
                active INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscription_id INTEGER NOT NULL,
                tenant_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                idempotency_key TEXT NOT NULL,
                status TEXT NOT NULL,
                attempt_count INTEGER DEFAULT 0,
                next_attempt_at TEXT,
                last_error TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(subscription_id, idempotency_key)
            );
            CREATE TABLE IF NOT EXISTS delivery_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delivery_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                duration_ms REAL NOT NULL,
                error_message TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        self._conn.commit()

    def add_subscription(self, subscription: WebhookSubscription) -> WebhookSubscription:
        cursor = self._conn.cursor()
        cursor.execute(
            "INSERT INTO subscriptions (tenant_id, target_url, secret, events, active) VALUES (?, ?, ?, ?, ?)",
            (
                subscription.tenant_id,
                subscription.target_url,
                subscription.secret,
                json.dumps(sorted(subscription.events)),
                1 if subscription.active else 0,
            ),
        )
        self._conn.commit()
        sub_id = int(cursor.lastrowid)
        return WebhookSubscription(
            tenant_id=subscription.tenant_id,
            target_url=subscription.target_url,
            secret=subscription.secret,
            events=subscription.events,
            id=sub_id,
            active=subscription.active,
        )

    def get_subscription(self, subscription_id: int) -> WebhookSubscription:
        cursor = self._conn.cursor()
        row = cursor.execute(
            "SELECT id, tenant_id, target_url, secret, events, active FROM subscriptions WHERE id = ?",
            (subscription_id,),
        ).fetchone()
        if not row:
            raise KeyError(f"Subscription {subscription_id} not found")
        return WebhookSubscription(
            id=int(row["id"]),
            tenant_id=row["tenant_id"],
            target_url=row["target_url"],
            secret=row["secret"],
            events=frozenset(json.loads(row["events"])),
            active=bool(row["active"]),
        )

    def subscriptions_for_event(self, tenant_id: str, event_type: str) -> list[WebhookSubscription]:
        cursor = self._conn.cursor()
        rows = cursor.execute(
            "SELECT id, tenant_id, target_url, secret, events, active FROM subscriptions WHERE tenant_id = ? AND active = 1",
            (tenant_id,),
        ).fetchall()
        subscriptions: list[WebhookSubscription] = []
        for row in rows:
            events = set(json.loads(row["events"]))
            if event_type in events:
                subscriptions.append(
                    WebhookSubscription(
                        id=int(row["id"]),
                        tenant_id=row["tenant_id"],
                        target_url=row["target_url"],
                        secret=row["secret"],
                        events=frozenset(events),
                        active=bool(row["active"]),
                    )
                )
        return subscriptions

    def enqueue_delivery(
        self,
        subscription_id: int,
        tenant_id: str,
        event_type: str,
        payload: Mapping[str, Any],
        idempotency_key: str,
        available_at: dt.datetime | None = None,
    ) -> WebhookDelivery:
        available = available_at or dt.datetime.utcnow()
        cursor = self._conn.cursor()
        cursor.execute(
            """
            INSERT INTO deliveries (
                subscription_id, tenant_id, event_type, payload, idempotency_key, status, attempt_count, next_attempt_at, last_error, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?)
            ON CONFLICT(subscription_id, idempotency_key) DO NOTHING
            """,
            (
                subscription_id,
                tenant_id,
                event_type,
                json.dumps(payload, sort_keys=True),
                idempotency_key,
                DeliveryStatus.PENDING.value,
                available.isoformat(),
                available.isoformat(),
            ),
        )
        if cursor.lastrowid:
            delivery_id = int(cursor.lastrowid)
        else:
            row = cursor.execute(
                "SELECT id FROM deliveries WHERE subscription_id = ? AND idempotency_key = ?",
                (subscription_id, idempotency_key),
            ).fetchone()
            if not row:
                raise RuntimeError("Failed to locate delivery after enqueue")
            delivery_id = int(row["id"])
        self._conn.commit()
        return self.get_delivery(delivery_id)

    def get_delivery(self, delivery_id: int) -> WebhookDelivery:
        cursor = self._conn.cursor()
        row = cursor.execute(
            "SELECT * FROM deliveries WHERE id = ?",
            (delivery_id,),
        ).fetchone()
        if not row:
            raise KeyError(f"Delivery {delivery_id} not found")
        return WebhookDelivery(
            id=int(row["id"]),
            subscription_id=int(row["subscription_id"]),
            tenant_id=row["tenant_id"],
            event_type=row["event_type"],
            payload=json.loads(row["payload"]),
            idempotency_key=row["idempotency_key"],
            status=DeliveryStatus(row["status"]),
            attempt_count=int(row["attempt_count"]),
            next_attempt_at=dt.datetime.fromisoformat(row["next_attempt_at"]),
            last_error=row["last_error"],
        )

    def due_deliveries(
        self, as_of: dt.datetime | None = None, limit: int = 50
    ) -> list[WebhookDelivery]:
        boundary = as_of or dt.datetime.utcnow()
        cursor = self._conn.cursor()
        rows = cursor.execute(
            """
            SELECT * FROM deliveries
            WHERE status IN (?, ?) AND next_attempt_at <= ?
            ORDER BY next_attempt_at ASC
            LIMIT ?
            """,
            (
                DeliveryStatus.PENDING.value,
                DeliveryStatus.RETRYING.value,
                boundary.isoformat(),
                limit,
            ),
        ).fetchall()
        return [self.get_delivery(int(row["id"])) for row in rows]

    def record_attempt(
        self,
        delivery_id: int,
        status: DeliveryStatus,
        status_code: int,
        duration_ms: float,
        error_message: str | None,
    ) -> None:
        cursor = self._conn.cursor()
        cursor.execute(
            """
            INSERT INTO delivery_attempts (
                delivery_id, status, status_code, duration_ms, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                delivery_id,
                status.value,
                status_code,
                duration_ms,
                error_message,
                dt.datetime.utcnow().isoformat(),
            ),
        )
        self._conn.commit()

    def update_delivery(
        self,
        delivery_id: int,
        *,
        status: DeliveryStatus,
        attempt_count: int,
        next_attempt_at: dt.datetime | None,
        last_error: str | None,
    ) -> None:
        cursor = self._conn.cursor()
        cursor.execute(
            """
            UPDATE deliveries
            SET status = ?, attempt_count = ?, next_attempt_at = ?, last_error = ?
            WHERE id = ?
            """,
            (
                status.value,
                attempt_count,
                next_attempt_at.isoformat() if next_attempt_at else None,
                last_error,
                delivery_id,
            ),
        )
        self._conn.commit()


class WebhookWorker:
    def __init__(
        self,
        store: DeliveryStore,
        http_client: HttpClient,
        signer: HmacSigner | None = None,
        backoff_policy: BackoffPolicy | None = None,
        *,
        max_attempts: int = 5,
        metrics: WorkerMetrics | None = None,
    ) -> None:
        self.store = store
        self.http_client = http_client
        self.signer = signer or HmacSigner()
        self.backoff_policy = backoff_policy or BackoffPolicy()
        self.max_attempts = max_attempts
        self.metrics = metrics or WorkerMetrics()

    def enqueue_event(
        self,
        tenant_id: str,
        event_type: str,
        payload: Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> list[WebhookDelivery]:
        deliveries: list[WebhookDelivery] = []
        for subscription in self.store.subscriptions_for_event(tenant_id, event_type):
            deliveries.append(
                self.store.enqueue_delivery(
                    subscription_id=subscription.id or 0,
                    tenant_id=tenant_id,
                    event_type=event_type,
                    payload=dict(payload),
                    idempotency_key=idempotency_key,
                )
            )
        return deliveries

    def _build_headers(
        self, subscription: WebhookSubscription, body: bytes, idempotency_key: str
    ) -> dict[str, str]:
        signature = self.signer.sign(subscription.secret, body)
        return {
            "Content-Type": "application/json",
            "X-Tenant": subscription.tenant_id,
            "Idempotency-Key": idempotency_key,
            self.signer.header: signature,
        }

    def _handle_success(self, delivery: WebhookDelivery, duration_ms: float) -> None:
        attempts = delivery.attempt_count + 1
        self.store.record_attempt(delivery.id, DeliveryStatus.DELIVERED, 200, duration_ms, None)
        self.store.update_delivery(
            delivery.id,
            status=DeliveryStatus.DELIVERED,
            attempt_count=attempts,
            next_attempt_at=delivery.next_attempt_at,
            last_error=None,
        )
        self.metrics.record_success(duration_ms)

    def _handle_failure(
        self, delivery: WebhookDelivery, status_code: int, duration_ms: float, error: str
    ) -> None:
        attempts = delivery.attempt_count + 1
        next_attempt_at: dt.datetime | None
        new_status: DeliveryStatus
        if attempts >= self.max_attempts:
            next_attempt_at = None
            new_status = DeliveryStatus.POISONED
            self.metrics.record_poison()
        else:
            delay = self.backoff_policy.next_delay_seconds(attempts)
            next_attempt_at = dt.datetime.utcnow() + dt.timedelta(seconds=delay)
            new_status = DeliveryStatus.RETRYING
        self.store.record_attempt(delivery.id, new_status, status_code, duration_ms, error)
        self.store.update_delivery(
            delivery.id,
            status=new_status,
            attempt_count=attempts,
            next_attempt_at=next_attempt_at or delivery.next_attempt_at,
            last_error=error,
        )
        self.metrics.record_failure(duration_ms)

    def process_due(self, limit: int = 50) -> list[WebhookDelivery]:
        processed: list[WebhookDelivery] = []
        for delivery in self.store.due_deliveries(limit=limit):
            subscription = self.store.get_subscription(delivery.subscription_id)
            body = json.dumps(
                {"event": delivery.event_type, "payload": delivery.payload}, sort_keys=True
            ).encode()
            headers = self._build_headers(subscription, body, delivery.idempotency_key)
            started = perf_counter()
            response = self.http_client.post(subscription.target_url, headers, body)
            duration_ms = (perf_counter() - started) * 1000
            if 200 <= response.status_code < 300:
                self._handle_success(delivery, duration_ms)
            else:
                error = f"HTTP {response.status_code}: {response.body}"
                self._handle_failure(delivery, response.status_code, duration_ms, error)
            processed.append(self.store.get_delivery(delivery.id))
        return processed
