/**
 * FlightRecorder — in-process telemetry sink for the Summit control plane.
 *
 * Responsibilities:
 *   - Collect TraceEnvelopes.
 *   - Strip NEVER_LOG_FIELDS before any serialisation.
 *   - Expose a drain() for tests and audit export.
 *
 * Production deployments should replace the in-memory sink with an
 * OpenTelemetry exporter or Kafka producer via the connectors layer.
 *
 * EVD-AFCP-ARCH-001
 */

import type { TraceEnvelope } from "./TraceEnvelope.js";
import { NEVER_LOG_FIELDS } from "./TraceEnvelope.js";

export class FlightRecorder {
  private readonly records: TraceEnvelope[] = [];

  /** Emit a trace event.  Sensitive fields are stripped before storage. */
  emit(envelope: TraceEnvelope): void {
    const sanitised = this.sanitise(envelope);
    this.records.push(sanitised);
  }

  /** Return all recorded envelopes (shallow copy). */
  drain(): TraceEnvelope[] {
    return [...this.records];
  }

  /** Clear the in-memory store. */
  clear(): void {
    this.records.length = 0;
  }

  /** Return the number of recorded events. */
  count(): number {
    return this.records.length;
  }

  private sanitise(envelope: TraceEnvelope): TraceEnvelope {
    if (!envelope.payload) return envelope;

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(envelope.payload)) {
      if (!(NEVER_LOG_FIELDS as readonly string[]).includes(k)) {
        cleaned[k] = v;
      }
    }

    return { ...envelope, payload: cleaned };
  }
}
