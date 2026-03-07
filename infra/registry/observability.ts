/**
 * Lightweight observability helpers for registry verification tools
 */

import { createHash } from "crypto";
import { SpanStatusCode, trace } from "@opentelemetry/api";

export interface VerificationTelemetry {
  stage: "build" | "verify";
  actor?: string;
  imageRef?: string;
  commit?: string;
  digest?: string;
  sbomHash?: string;
  rekorUuid?: string;
  policyOutcome: {
    allowed: boolean;
    summary?: string;
    violations?: string[];
  };
  metadata?: Record<string, unknown>;
}

function hashValue(value?: string): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex");
}

export function emitVerificationTelemetry(telemetry: VerificationTelemetry): void {
  const tracer = trace.getTracer("registry-tools");
  const span = tracer.startSpan(`supplychain.${telemetry.stage}`, {
    attributes: {
      "supplychain.actor": telemetry.actor ?? "unknown",
      "supplychain.digest": telemetry.digest ?? "unknown",
      "supplychain.image_ref": telemetry.imageRef ?? "unknown",
      "supplychain.commit": telemetry.commit ?? "unknown",
      "supplychain.rekor_uuid": telemetry.rekorUuid ?? "absent",
      "supplychain.sbom_hash": telemetry.sbomHash ?? "absent",
      "policy.allowed": telemetry.policyOutcome.allowed,
      "policy.summary": telemetry.policyOutcome.summary ?? "n/a",
    },
  });

  if (!telemetry.policyOutcome.allowed) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: telemetry.policyOutcome.summary ?? "policy-blocked",
    });
  }

  span.end();

  const logPayload = {
    ts: new Date().toISOString(),
    event: "supplychain.verify",
    ...telemetry,
    sbomHash: telemetry.sbomHash ? hashValue(telemetry.sbomHash) : undefined,
    metadata: telemetry.metadata ?? {},
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(logPayload));
}
