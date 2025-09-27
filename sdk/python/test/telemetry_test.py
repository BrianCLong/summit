from __future__ import annotations

import time

from maestro_sdk.telemetry import (
    DenyPlugin,
    HashPlugin,
    PIIRedactPlugin,
    PolicyConfig,
    ProcessedTelemetryEvent,
    TelemetryClient,
    TelemetryEventInput,
    TelemetryMetadata,
    TelemetryVerifier,
)


def test_redaction_and_hashing_policy():
    client = TelemetryClient(
        sample_rate=1.0,
        policy_config=PolicyConfig(hash=['user.id'], redact=['user.email']),
        random_fn=lambda: 0.1,
    )

    result = client.record(
        TelemetryEventInput(
            name='user-event',
            attributes={
                'user': {'id': 'abc-123', 'email': 'alice@example.com'},
                'note': 'my ssn is 123-45-6789',
            },
        )
    )

    assert result.accepted is True
    event = result.event
    assert event is not None
    assert event.attributes['user']['email'] == '[REDACTED]'
    assert str(event.attributes['user']['id']).startswith('hash:')
    assert event.metadata.redaction_map['note'].action == 'redact'

    batch = client.flush()
    verification = TelemetryVerifier().verify(batch)
    assert verification.valid is True
    assert verification.violations == []


def test_deny_policy_blocks_events():
    plugins = [
        DenyPlugin(['secrets'], 'deny', True),
        HashPlugin(['user.id'], 'hash'),
        PIIRedactPlugin(),
    ]
    client = TelemetryClient(
        sample_rate=1.0,
        plugins=plugins,
        policy_config=PolicyConfig(default_action='allow'),
        random_fn=lambda: 0.1,
    )

    result = client.record(
        TelemetryEventInput(
            name='deny',
            attributes={'user': {'id': 'abc'}, 'secrets': 'token-value'},
        )
    )

    assert result.accepted is False
    assert result.reason == 'denied'
    assert client.pending() == 0


def test_verifier_detects_violation():
    event = ProcessedTelemetryEvent(
        name='tampered',
        timestamp=int(time.time() * 1000),
        attributes={'email': 'eve@example.com'},
        metadata=TelemetryMetadata(sample_rate=1.0, sampled=True),
    )

    result = TelemetryVerifier().verify([event])
    assert result.valid is False
    assert result.violations
    assert result.violations[0].path == 'email'
