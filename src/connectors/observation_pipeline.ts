/**
 * Observation Pipeline — SWMA Observation Layer
 *
 * Ingests enterprise signals across all modalities and normalises them
 * into the canonical Observation type consumed by the Representation Layer.
 *
 * Feature-gated: WORLD_MODEL_ENABLED=true required.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

export type Modality = "text" | "image" | "video" | "audio" | "graph"

export interface Observation {
  id: string
  modality: Modality
  /** ISO-8601 timestamp of the signal */
  timestamp: string
  /** Raw payload — opaque to this layer; typed downstream per modality */
  payload: unknown
  /** Optional data-classification tag */
  classification?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
}

export interface ObservationSource {
  /** Human-readable name, e.g. "email", "meeting-transcript", "neo4j-kg" */
  name: string
  modality: Modality
  /** Pull one observation from this source */
  pull(): Promise<Observation>
}

/**
 * Collects observations from all registered sources.
 * Returns them in arrival order; never logs CONFIDENTIAL / RESTRICTED payloads.
 */
export async function collectObservations(
  sources: ObservationSource[]
): Promise<Observation[]> {
  const results: Observation[] = []
  for (const source of sources) {
    const obs = await source.pull()
    if (
      obs.classification === "CONFIDENTIAL" ||
      obs.classification === "RESTRICTED"
    ) {
      // Payload must not appear in any log stream — strip before forwarding
      results.push({ ...obs, payload: "[REDACTED]" })
    } else {
      results.push(obs)
    }
  }
  return results
}
