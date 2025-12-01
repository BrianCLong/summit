// server/src/phantom_limb/phantom_limb.types.ts

/**
 * Represents the collection of digital artifacts from a deceased analyst,
 * used as the source material for reconstitution.
 */
export interface AnalystArtifacts {
  sourceAnalystId: string;
  sourceAnalystName: string;
  // A list of URIs pointing to artifact collections (e.g., email archives, note databases)
  artifactUris: string[];
}

/**
 * Represents the reconstituted digital cognition of a deceased master analyst,
 * now operating as a permanent autonomous agent within the system.
 */
export interface DigitalGhost {
  ghostId: string; // The unique ID for this autonomous agent
  sourceAnalystName: string; // The name of the original analyst
  resurrectionDate: Date; // When the agent was brought "back online"
  status: 'online' | 'recalibrating' | 'dormant' | 'degraded';
  expertise: string[]; // Areas of expertise derived from the source artifacts
  lastActivityTimestamp: Date;
  confidenceScore: number; // A score from 0.0 to 1.0 indicating operational integrity
}

/**
 * Represents a query sent to a digital ghost and the subsequent response.
 */
export interface GhostQueryResponse {
  responseId: string;
  ghostId: string;
  query: string;
  response: string; // The analytical output from the digital ghost
  confidence: number; // The ghost's confidence in its own response
  timestamp: Date;
}
