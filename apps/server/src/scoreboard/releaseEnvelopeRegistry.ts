import { randomUUID } from "crypto";
import { ReleaseEnvelope } from "./types.js";

export class ReleaseEnvelopeRegistry {
  private envelopes: Map<string, ReleaseEnvelope> = new Map();

  register(
    params: Omit<ReleaseEnvelope, "id" | "createdAt"> & { createdAt?: string }
  ): ReleaseEnvelope {
    const createdAt = params.createdAt ?? new Date().toISOString();
    const envelope: ReleaseEnvelope = {
      ...params,
      id: randomUUID(),
      createdAt,
    };

    this.envelopes.set(params.domainId, envelope);
    return envelope;
  }

  get(domainId: string): ReleaseEnvelope | undefined {
    const envelope = this.envelopes.get(domainId);
    if (!envelope) return undefined;
    if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() <= Date.now()) {
      this.envelopes.delete(domainId);
      return undefined;
    }
    return envelope;
  }
}
