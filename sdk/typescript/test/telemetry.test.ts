import { TelemetryClient } from '../src/telemetry/client';
import { TelemetryVerifier } from '../src/telemetry/verifier';
import { DenyPlugin, HashPlugin, PIIRedactPlugin } from '../src/telemetry/policies';
import { ProcessedTelemetryEvent } from '../src/telemetry/client-types';

describe('TelemetryClient', () => {
  it('redacts and hashes seeded PII according to policy', () => {
    const client = new TelemetryClient({
      sampleRate: 1,
      policyConfig: {
        hash: ['user.id'],
        redact: ['user.email'],
      },
      random: () => 0.1,
    });

    const result = client.record({
      name: 'user-event',
      attributes: {
        user: {
          id: 'user-12345',
          email: 'alice@example.com',
        },
        message: 'Call me at +1-555-123-4567',
      },
    });

    expect(result.accepted).toBe(true);
    const event = result.event!;

    expect(event.attributes.user).toBeDefined();
    expect((event.attributes.user as Record<string, unknown>).email).toBe('[REDACTED]');
    expect((event.attributes.user as Record<string, unknown>).id).toMatch(/^hash:/);
    expect(event.metadata.redactionMap['user.email'].action).toBe('redact');
    expect(event.metadata.redactionMap['user.id'].action).toBe('hash');
    expect(event.metadata.redactionMap['message'].action).toBe('redact');
    expect(event.metadata.sampled).toBe(true);

    const verifier = new TelemetryVerifier();
    const verification = verifier.verify(client.flush());
    expect(verification.valid).toBe(true);
    expect(verification.violations).toHaveLength(0);
  });

  it('blocks events when deny policy matches', () => {
    const plugins = [
      new DenyPlugin(['secrets'], 'deny', true),
      new HashPlugin(['user.id'], 'hash'),
      new PIIRedactPlugin(),
    ];
    const client = new TelemetryClient({
      sampleRate: 1,
      plugins,
      policyConfig: { defaultAction: 'allow' },
      random: () => 0.1,
    });

    const result = client.record({
      name: 'deny-event',
      attributes: {
        user: { id: 'abc' },
        secrets: 'token-value',
      },
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('denied');
    expect(client.pending()).toBe(0);
  });
});

describe('TelemetryVerifier', () => {
  it('flags events with leaked PII', () => {
    const event: ProcessedTelemetryEvent = {
      name: 'tampered',
      timestamp: Date.now(),
      attributes: {
        email: 'eve@example.com',
      },
      metadata: {
        sampleRate: 1,
        sampled: true,
        redactionMap: {},
        droppedFields: [],
      },
    };

    const verifier = new TelemetryVerifier();
    const result = verifier.verify([event]);
    expect(result.valid).toBe(false);
    expect(result.violations).not.toHaveLength(0);
    expect(result.violations[0].path).toBe('email');
  });
});
