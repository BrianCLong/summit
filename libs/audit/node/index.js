"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAudit = emitAudit;
const crypto_1 = require("crypto");
const api_1 = require("@opentelemetry/api");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const json_canon_1 = require("./json-canon"); // Internal helper
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
function getCursorPath(tenant) {
  const safeTenant = tenant.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(MANIFEST_DIR, `cursor_${safeTenant}.json`);
}
async function getPrevHash(tenant) {
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
async function updatePrevHash(tenant, hash) {
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
async function emitAudit(event) {
  const tracer = api_1.trace.getTracer("audit-sdk");
  const span = tracer.startSpan("emit_audit");
  try {
    const currentSpan = api_1.trace.getSpan(api_1.context.active());
    const traceCtx = currentSpan?.spanContext();
    const fullEvent = {
      ...event,
      version: "1.0",
      event_id: (0, crypto_1.randomUUID)(),
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
    const payloadToHash = (0, json_canon_1.stableStringify)(contentToHash);
    const hash = (0, crypto_1.createHash)("sha256");
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
    span.recordException(error);
    span.setStatus({ code: api_1.SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
