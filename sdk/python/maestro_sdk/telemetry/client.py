from __future__ import annotations

from typing import Callable, Mapping, Sequence, Tuple
import random
import time

from .batcher import OfflineBatcher
from .detectors import CompositeDetector, Detector, DetectorFinding, default_detector
from .policy import PolicyConfig, PolicyDecision, PolicyEngine, PolicyPlugin, create_policy_pipeline
from .types import (
    ProcessedTelemetryEvent,
    RecordResult,
    RedactionEntry,
    TelemetryEventInput,
    TelemetryMetadata,
)

_REDACTED_VALUE = "[REDACTED]"
_REMOVE = object()


def _fnv1a(value: str) -> str:
    hash_value = 0x811C9DC5
    for char in value:
        hash_value ^= ord(char)
        hash_value = (hash_value * 0x01000193) % (2 ** 32)
    return f"hash:{hash_value:08x}"


class TelemetryClient:
    def __init__(
        self,
        *,
        detectors: Sequence[Detector] | None = None,
        plugins: Sequence[PolicyPlugin] | None = None,
        policy_config: PolicyConfig | None = None,
        sample_rate: float = 1.0,
        batch_size: int = 50,
        random_fn: Callable[[], float] | None = None,
    ) -> None:
        self._detector: Detector
        if detectors is not None:
            self._detector = CompositeDetector(detectors)
        elif plugins is not None:
            self._detector = CompositeDetector([default_detector])
        else:
            self._detector = default_detector

        if plugins is not None:
            default_action = policy_config.default_action if policy_config else "allow"
            self._policy = PolicyEngine(plugins, default_action)
        else:
            self._policy = create_policy_pipeline(policy_config)

        self._batcher = OfflineBatcher(batch_size)
        self._sample_rate = min(max(sample_rate, 0.0), 1.0)
        self._random = random_fn or random.random

    def record(self, event: TelemetryEventInput) -> RecordResult:
        if self._random() > self._sample_rate:
            return RecordResult(accepted=False, reason="sampled_out")

        metadata = TelemetryMetadata(sample_rate=self._sample_rate, sampled=True)
        sanitized, blocked = self._process_node(dict(event.attributes), "", metadata)

        if blocked:
            metadata.blocked = True
            return RecordResult(accepted=False, reason="denied")

        processed = ProcessedTelemetryEvent(
            name=event.name,
            timestamp=event.timestamp or int(time.time() * 1000),
            attributes=sanitized,
            metadata=metadata,
        )
        self._batcher.enqueue(processed)
        return RecordResult(accepted=True, event=processed)

    def flush(self) -> Sequence[ProcessedTelemetryEvent]:
        return self._batcher.flush()

    def pending(self) -> int:
        return self._batcher.size()

    def _process_node(
        self,
        node: object,
        path: str,
        metadata: TelemetryMetadata,
    ) -> Tuple[object, bool]:
        if isinstance(node, list):
            sanitized_list = []
            for index, item in enumerate(node):
                child_path = f"{path}[{index}]"
                sanitized, blocked = self._process_node(item, child_path, metadata)
                if blocked:
                    return [], True
                if sanitized is not _REMOVE:
                    sanitized_list.append(sanitized)
            return sanitized_list, False

        if isinstance(node, Mapping):
            sanitized_dict: dict[str, object] = {}
            for key, value in node.items():
                child_path = f"{path}.{key}" if path else key
                sanitized, blocked = self._process_node(value, child_path, metadata)
                if blocked:
                    return {}, True
                if sanitized is not _REMOVE:
                    sanitized_dict[key] = sanitized
            return sanitized_dict, False

        return self._process_leaf(node, path, metadata)

    def _process_leaf(
        self,
        value: object,
        path: str,
        metadata: TelemetryMetadata,
    ) -> Tuple[object, bool]:
        findings: Sequence[DetectorFinding] = self._detector.detect(value) if isinstance(value, str) else []
        decision: PolicyDecision = self._policy.decide(path, value, findings)

        entry: RedactionEntry | None
        if findings:
            entry = RedactionEntry(decision.action, decision.reason, list(findings))
        elif decision.action != "allow":
            entry = RedactionEntry(decision.action, decision.reason)
        else:
            entry = None

        if entry is not None:
            metadata.redaction_map[path] = entry

        if decision.action == "allow":
            return value, False
        if decision.action == "redact":
            metadata.redaction_map[path] = RedactionEntry(
                "redact",
                decision.reason,
                list(findings) if findings else None,
            )
            return _REDACTED_VALUE, False
        if decision.action == "hash":
            hashed = _fnv1a(value if isinstance(value, str) else str(value))
            metadata.redaction_map[path] = RedactionEntry(
                "hash",
                decision.reason,
                list(findings) if findings else None,
                hash_preview=hashed[:12],
            )
            return hashed, False
        if decision.action == "deny":
            metadata.redaction_map[path] = RedactionEntry(
                "deny",
                decision.reason,
                list(findings) if findings else None,
            )
            metadata.dropped_fields.append(path)
            return _REMOVE, decision.block_event

        return value, False
