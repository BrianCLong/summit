// server/src/mnemosyne/mnemosyne.types.ts

/**
 * Defines the parameters for a memory fabrication and implantation operation.
 */
export interface FalseMemoryPayload {
  targetId: string; // The entity ID of the target individual
  targetName: string;

  // The core narrative of the false memory to be implanted.
  // Example: "You met with a Russian FSB agent in Geneva last March."
  narrative: string;

  // Supporting details to make the memory more believable.
  sensoryDetails: {
    visuals: string[]; // e.g., "Rainy evening", "Red brick building"
    sounds: string[];   // e.g., "Sound of a tram", "Muffled conversation in French"
    smells: string[];   // e.g., "Wet pavement", "Cigar smoke"
  };

  // The method of delivery for the hypnotic narrative priming.
  deliveryVector: 'compromised_personal_device' | 'subliminal_audio' | 'targeted_social_media';
}

/**
 * Represents a job to fabricate and deploy a false memory.
 */
export interface MemoryFabricationJob {
  jobId: string;
  payload: FalseMemoryPayload;
  status: 'pending' | 'active' | 'complete' | 'failed';
  creationDate: Date;
  completionDate?: Date;
  beliefFormationReport?: BeliefFormationReport;
}

/**
 * A report detailing the success of a memory implantation operation.
 */
export interface BeliefFormationReport {
  reportId: string;
  jobId: string;
  targetId: string;
  assessmentDate: Date;

  // The measured belief formation success rate for this target.
  // Based on the project description, this is expected to be around 0.67.
  successRate: number; // A value between 0.0 and 1.0

  // Evidence of belief formation (e.g., excerpts from intercepted communications).
  corroboratingEvidence: string[];

  // Indicates whether the target has fully integrated the false memory.
  isBeliefFormed: boolean;
}
