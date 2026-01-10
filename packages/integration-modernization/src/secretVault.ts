import { randomUUID } from 'crypto';

export type SecretRecord = {
  id: string;
  connectorId: string;
  key: string;
  value: string;
  version: number;
  createdAt: number;
  rotatedAt?: number;
};

export class SecretVault {
  private secrets: Map<string, SecretRecord[]> = new Map();
  private auditTrail: { id: string; action: string; connectorId: string; timestamp: number }[] = [];

  setSecret(connectorId: string, key: string, value: string): SecretRecord {
    const record: SecretRecord = {
      id: randomUUID(),
      connectorId,
      key,
      value,
      version: 1,
      createdAt: Date.now()
    };
    this.secrets.set(connectorId, [record]);
    this.auditTrail.push({ id: randomUUID(), action: 'set', connectorId, timestamp: Date.now() });
    return record;
  }

  rotateSecret(connectorId: string, key: string, value: string): SecretRecord {
    const existing = this.secrets.get(connectorId) ?? [];
    const version = (existing.at(-1)?.version ?? 0) + 1;
    const record: SecretRecord = {
      id: randomUUID(),
      connectorId,
      key,
      value,
      version,
      createdAt: existing.at(-1)?.createdAt ?? Date.now(),
      rotatedAt: Date.now()
    };
    this.secrets.set(connectorId, [...existing, record]);
    this.auditTrail.push({ id: randomUUID(), action: 'rotate', connectorId, timestamp: Date.now() });
    return record;
  }

  getSecret(connectorId: string, key: string): SecretRecord | undefined {
    const records = this.secrets.get(connectorId) ?? [];
    return [...records].reverse().find((record) => record.key === key);
  }

  audit() {
    return [...this.auditTrail];
  }
}
