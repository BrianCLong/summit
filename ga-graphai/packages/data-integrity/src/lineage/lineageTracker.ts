import { stableHash } from "../canonical/canonicalizer.js";
import { EventLog } from "../eventlog/eventLog.js";

export interface ProvenanceStamp {
  source: string;
  ingress: "api" | "database" | "message-broker" | string;
  observedAt: string;
  traceId?: string;
  runId?: string;
  checksum: string;
  chain?: string[];
  attributes?: Record<string, unknown>;
  signature?: string;
}

export interface LineageEnvelope<TPayload> {
  payload: TPayload;
  provenance: ProvenanceStamp;
}

export interface LineageTrackerOptions {
  signer?: (hash: string) => string;
}

export interface IngressContext {
  source: string;
  ingress: ProvenanceStamp["ingress"];
  traceId?: string;
  runId?: string;
  observedAt?: string;
  attributes?: Record<string, unknown>;
  parentChecksums?: string[];
}

export interface HopContext {
  source?: string;
  ingress?: ProvenanceStamp["ingress"];
  observedAt?: string;
  attributes?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  hashMatches: boolean;
  sourceMatches: boolean;
  ingressMatches: boolean;
  chainDepth: number;
  signaturePresent: boolean;
}

export class LineageTracker {
  private readonly ledger: EventLog;

  constructor(private readonly options: LineageTrackerOptions = {}) {
    this.ledger = new EventLog({ signer: options.signer });
  }

  ingress<TPayload>(payload: TPayload, context: IngressContext): LineageEnvelope<TPayload> {
    const checksum = stableHash(payload);
    const observedAt = context.observedAt ?? new Date().toISOString();
    const provenance: ProvenanceStamp = {
      source: context.source,
      ingress: context.ingress,
      observedAt,
      traceId: context.traceId,
      runId: context.runId,
      checksum,
      chain: context.parentChecksums ?? [],
      attributes: context.attributes,
      signature: this.options.signer ? this.options.signer(checksum) : undefined,
    };

    this.ledger.append({
      id: `${context.source}:${checksum}`,
      type: "lineage.ingress",
      scope: context.source,
      actor: context.ingress,
      timestamp: observedAt,
      payload: provenance,
    });

    return { payload, provenance };
  }

  propagate<TPayload>(
    envelope: LineageEnvelope<TPayload>,
    hop: HopContext
  ): LineageEnvelope<TPayload> {
    const checksum = stableHash(envelope.payload);
    const observedAt = hop.observedAt ?? new Date().toISOString();
    const chain = [...(envelope.provenance.chain ?? []), envelope.provenance.checksum];
    const attributes = { ...envelope.provenance.attributes, ...hop.attributes };
    const provenance: ProvenanceStamp = {
      ...envelope.provenance,
      source: hop.source ?? envelope.provenance.source,
      ingress: hop.ingress ?? envelope.provenance.ingress,
      observedAt,
      checksum,
      chain,
      attributes,
      signature: this.options.signer
        ? this.options.signer(checksum)
        : envelope.provenance.signature,
    };

    this.ledger.append({
      id: `${provenance.source}:${checksum}`,
      type: "lineage.hop",
      scope: provenance.source,
      actor: provenance.ingress,
      timestamp: observedAt,
      payload: provenance,
    });

    return { payload: envelope.payload, provenance };
  }

  asHeaders(envelope: LineageEnvelope<unknown>): Record<string, string> {
    const { provenance } = envelope;
    const headers: Record<string, string> = {
      "x-lineage-source": provenance.source,
      "x-lineage-ingress": provenance.ingress,
      "x-lineage-observed-at": provenance.observedAt,
      "x-lineage-checksum": provenance.checksum,
    };
    if (provenance.traceId) headers["x-trace-id"] = provenance.traceId;
    if (provenance.runId) headers["x-run-id"] = provenance.runId;
    if (provenance.signature) headers["x-lineage-signature"] = provenance.signature;
    if (provenance.chain?.length) headers["x-lineage-chain"] = provenance.chain.join(",");
    if (provenance.attributes) {
      headers["x-lineage-attributes"] = JSON.stringify(provenance.attributes);
    }
    return headers;
  }

  fromHeaders<TPayload>(
    payload: TPayload,
    headers: Record<string, string>
  ): LineageEnvelope<TPayload> {
    const observedAt = headers["x-lineage-observed-at"] ?? new Date().toISOString();
    const checksum = headers["x-lineage-checksum"] ?? stableHash(payload);
    const chain = headers["x-lineage-chain"]?.split(",").filter(Boolean) ?? [];
    const attributes = headers["x-lineage-attributes"]
      ? JSON.parse(headers["x-lineage-attributes"])
      : undefined;
    const provenance: ProvenanceStamp = {
      source: headers["x-lineage-source"] ?? "unknown",
      ingress: headers["x-lineage-ingress"] ?? "api",
      observedAt,
      traceId: headers["x-trace-id"],
      runId: headers["x-run-id"],
      checksum,
      chain,
      attributes,
      signature: headers["x-lineage-signature"],
    };
    return { payload, provenance };
  }

  validate(
    envelope: LineageEnvelope<unknown>,
    expectations: Partial<Pick<ProvenanceStamp, "source" | "ingress">> = {}
  ): ValidationResult {
    const expectedChecksum = stableHash(envelope.payload);
    const hashMatches = expectedChecksum === envelope.provenance.checksum;
    const sourceMatches = expectations.source
      ? envelope.provenance.source === expectations.source
      : true;
    const ingressMatches = expectations.ingress
      ? envelope.provenance.ingress === expectations.ingress
      : true;
    const chainDepth = envelope.provenance.chain?.length ?? 0;
    const valid = hashMatches && sourceMatches && ingressMatches;
    return {
      valid,
      hashMatches,
      sourceMatches,
      ingressMatches,
      chainDepth,
      signaturePresent: Boolean(envelope.provenance.signature),
    };
  }

  ledgerEntries() {
    return this.ledger.list(0, 1000);
  }
}
