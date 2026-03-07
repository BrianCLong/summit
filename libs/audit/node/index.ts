import { createHash, randomUUID } from "crypto";
import { trace, context, SpanStatusCode } from "@opentelemetry/api";
import * as fs from "fs/promises";
import * as path from "path";
import { stableStringify } from "./json-canon"; // Internal helper

/**
 * Canonical Audit Event Interface
 */
export interface AuditEvent {
  version: string;
  event_id: string;
  ts: string;
  actor: {
    id: string;
    type: "user" | "svc";
    roles: string[];
    mfa?: string;
  };
  tenant: string;
  resource: {
    type: string;
    id: string;
    classification: "restricted" | "confidential" | "internal" | "public";
  };
  action: "read" | "get" | "export" | "delete" | "impersonate" | "admin";
  rfa?: {
    required: boolean;
    reason: string;
    ticket?: string;
  };
  authz: {
    decision: "allow" | "deny";
    policy_bundle?: string;
    reasons?: string[];
    opa_trace_id?: string;
  };
  request?: {
    ip: string;
    ua: string;
    method: string;
    route: string;
  };
  trace?: {
    trace_id: string;
    span_id: string;
    release?: string;
  };
  outcome: {
    status: "success" | "failure";
    http: number;
    latency_ms: number;
  };
  hash_chain?: {
    prev: string;
    self: string;
  };
}

const MANIFEST_DIR = path.resolve(process.cwd(), "audit/manifest");

let dirEnsured = false;

async function ensureDir() {
  if (!dirEnsured) {
    try {
      await fs.mkdir(MANIFEST_DIR, { recursive: true });
      dirEnsured = true;
    } catch (e) {
      console.error("Failed to create manifest dir", e);
    }
  }
}

function getCursorPath(tenant: string): string {
  const safeTenant = tenant.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(MANIFEST_DIR, `cursor_${safeTenant}.json`);
}

async function getPrevHash(tenant: string): Promise<string> {
  try {
    await ensureDir();
    const cursorPath = getCursorPath(tenant);
    const data = await fs.readFile(cursorPath, "utf-8");
    const cursor = JSON.parse(data);
    return cursor.hash;
  } catch (e) {
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

async function updatePrevHash(tenant: string, hash: string) {
  try {
    await ensureDir();
    const cursorPath = getCursorPath(tenant);
    await fs.writeFile(cursorPath, JSON.stringify({ hash, ts: new Date().toISOString() }));
  } catch (e) {
    console.error("Failed to write cursor", e);
  }
}

/**
 * Emit an audit event.
 * Computes hash chain and links OTEL trace.
 */
export async function emitAudit(
  event: Omit<AuditEvent, "version" | "ts" | "event_id" | "hash_chain" | "trace">
): Promise<AuditEvent> {
  const tracer = trace.getTracer("audit-sdk");
  const span = tracer.startSpan("emit_audit");

  try {
    const currentSpan = trace.getSpan(context.active());
    const traceCtx = currentSpan?.spanContext();

    const fullEvent: AuditEvent = {
      ...event,
      version: "1.0",
      event_id: randomUUID(),
      ts: new Date().toISOString(),
      trace: traceCtx
        ? {
            trace_id: traceCtx.traceId,
            span_id: traceCtx.spanId,
          }
        : undefined,
    };

    // Compute Hash Chain
    const prevHash = await getPrevHash(fullEvent.tenant);

    // Canonical hashing setup
    const contentToHash = { ...fullEvent, hash_chain: { prev: prevHash } };
    // We intentionally omit 'self' from the object being hashed to match verification logic

    const payloadToHash = stableStringify(contentToHash);
    const hash = createHash("sha256");
    hash.update(prevHash);
    hash.update(payloadToHash);
    const selfHash = hash.digest("hex");

    fullEvent.hash_chain = {
      prev: prevHash,
      self: selfHash,
    };

    await updatePrevHash(fullEvent.tenant, selfHash);

    // Send to Sink
    console.log(JSON.stringify(fullEvent));

    // Also add to span
    span.addEvent("audit_event_emitted", {
      "audit.event_id": fullEvent.event_id,
      "audit.action": fullEvent.action,
      "audit.tenant": fullEvent.tenant,
    });

    return fullEvent;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
