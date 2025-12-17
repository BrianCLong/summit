// server/src/echelon2/echelon2.types.ts

/**
 * Represents a raw sample of environmental DNA (eDNA) from a collector.
 */
export interface eDNAReading {
  readingId: string;
  collectorId: string; // The ID of the classified collector device
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  // A simplified representation of the collected DNA sequences
  dnaSequences: string[];
}

/**
 * Represents a target genome signature for matching against.
 */
export interface GenomeSignature {
  targetId: string; // The High-Value Target (HVT) identifier
  targetName: string;
  // The unique genomic marker used for matching
  genomeMarker: string;
}

/**
 * Represents a confirmed physical presence of a target at a specific location and time.
 * This is the primary output of the ECHELON-2 system.
 */
export interface PhysicalPresenceConfirmation {
  confirmationId: string;
  targetId: string;
  targetName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  detectionTimestamp: Date;
  confidence: number; // Confidence of the match (0.0 to 1.0)
  sourceReadingId: string; // The eDNA reading that triggered this confirmation
}
