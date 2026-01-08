export type IncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "closed";

export type IncidentSeverity = "critical" | "high" | "medium" | "low";

/**
 * Represents an incident in the system.
 */
export interface Incident {
  /** The unique identifier for the incident. */
  id: string;
  /** The tenant this incident belongs to. */
  tenant_id: string;
  /** A short, descriptive title for the incident. */
  title: string;
  /** A detailed description of the incident. */
  description?: string;
  /** The current status of the incident. */
  status: IncidentStatus;
  /** The severity level of the incident. */
  severity: IncidentSeverity;
  /** The ID of the user who owns and is responsible for the incident. */
  owner_id: string;
  /** Tags for categorizing and searching for incidents. */
  tags: string[];
  /** The timestamp when the incident was created. */
  created_at: string; // ISO 8601 format
  /** The timestamp when the incident was last updated. */
  updated_at: string; // ISO 8601 format
}
