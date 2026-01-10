import { ConnectorRuntime, IntegrationAdapter } from '../src/runtime';
import { ConnectorMetadata } from '../src/types';
import { SecretVault } from '../src/secretVault';

describe('ConnectorRuntime', () => {
  const metadata: ConnectorMetadata = {
    id: 'crm',
    name: 'CRM Pull',
    kind: 'pull',
    owner: { team: 'integrations' },
    contract: {
      versioning: { current: '1.0.0', supported: ['1.0.0'] },
      pagination: { type: 'cursor', param: 'cursor' },
      errors: { retryableErrors: ['429'], fatalErrors: ['401'] },
      idempotency: { idempotencyKeyHeader: 'Idempotency-Key', dedupeWindowSeconds: 60 }
    },
    sandboxFixtures: { records: 3 },
    systemOfRecord: 'crm'
  };

  it('retries failed operations and updates health', async () => {
    let attempts = 0;
    const adapter: IntegrationAdapter = {
      async testConnection() {
        return { success: true };
      },
      async pull() {
        attempts += 1;
        if (attempts < 2) {
          return { success: false, error: new Error('transient') };
        }
        return { success: true, data: { items: [1, 2] } };
      }
    };

    const runtime = new ConnectorRuntime();
    runtime.registerConnector(metadata, adapter, { retryPolicy: { attempts: 3, backoffMs: 1 } });

    const result = await runtime.execute(metadata.id);
    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
    expect(runtime.health(metadata.id)).toBe('connected');
  });

  it('honors sandbox fixtures and records secret rotation', async () => {
    const adapter: IntegrationAdapter = {
      async testConnection() {
        return { success: true };
      },
      async pull() {
        return { success: false, error: new Error('should not be called') };
      }
    };
    const vault = new SecretVault();
    const runtime = new ConnectorRuntime(undefined, vault);
    runtime.registerConnector(metadata, adapter, { retryPolicy: { attempts: 1, backoffMs: 1 }, sandboxMode: 'sandbox' });

    const secret = runtime.addSecret(metadata.id, 'token', 'abc');
    const rotated = runtime.rotateSecret(metadata.id, 'token', 'def');

    const result = await runtime.execute(metadata.id);
    expect(result.success).toBe(true);
    expect((result.data as { records: number }).records).toBe(3);
    expect(rotated.version).toBe(secret.version + 1);
    expect(runtime.auditedSecrets().length).toBe(2);
  });
});
