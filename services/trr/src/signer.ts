import { createHash, createHmac, randomBytes } from 'node:crypto';
import { AllowlistEntry, AllowlistManifest } from './types.js';

export interface AllowlistSignerConfig {
  secret: string;
  keyId?: string;
  algorithm?: 'sha256' | 'sha512';
  deterministicBase?: string;
}

function canonicalizeEntries(entries: AllowlistEntry[]): AllowlistEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      networkEgressClasses: [...entry.networkEgressClasses].sort(),
    }))
    .sort((a, b) => {
      const toolCompare = a.tool.localeCompare(b.tool);
      if (toolCompare !== 0) {
        return toolCompare;
      }
      return a.version.localeCompare(b.version);
    });
}

export class AllowlistSigner {
  private readonly secret: string;
  private readonly keyId: string;
  private readonly algorithm: 'sha256' | 'sha512';
  private readonly baseTimestamp: Date;

  constructor(config: AllowlistSignerConfig) {
    this.secret = config.secret;
    this.keyId = config.keyId ?? `key-${randomBytes(4).toString('hex')}`;
    this.algorithm = config.algorithm ?? 'sha256';
    this.baseTimestamp = new Date(
      config.deterministicBase ?? '2020-01-01T00:00:00.000Z',
    );
  }

  sign(payload: {
    environment: string;
    entries: AllowlistEntry[];
    generatedAt?: string;
  }): AllowlistManifest {
    const canonicalEntries = canonicalizeEntries(payload.entries);
    const generatedAt =
      payload.generatedAt ??
      this.canonicalTimestamp(canonicalEntries, payload.environment);
    const canonical = JSON.stringify({
      environment: payload.environment,
      generatedAt,
      entries: canonicalEntries,
    });
    const signature = createHmac(this.algorithm, this.secret)
      .update(canonical)
      .digest('hex');
    return {
      environment: payload.environment,
      generatedAt,
      entries: canonicalEntries,
      signature,
      signer: this.keyId,
    };
  }

  private canonicalTimestamp(
    entries: AllowlistEntry[],
    environment: string,
  ): string {
    if (entries.length === 0) {
      return this.baseTimestamp.toISOString();
    }
    const hash = createHash('sha256').update(environment).digest('hex');
    const seconds = Number(BigInt(`0x${hash.slice(0, 8)}`) % BigInt(3600 * 24));
    const generatedDate = new Date(
      this.baseTimestamp.getTime() + seconds * 1000,
    );
    generatedDate.setUTCMilliseconds(0);
    return generatedDate.toISOString();
  }
}
