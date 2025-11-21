/**
 * Adversarial Attack Types
 */
export enum AdversarialAttackType {
  FGSM = 'FGSM',
  PGD = 'PGD',
  CW = 'CW',
  DEEPFOOL = 'DEEPFOOL',
  UNIVERSAL = 'UNIVERSAL',
  BLACK_BOX = 'BLACK_BOX',
  MODEL_INVERSION = 'MODEL_INVERSION',
  MEMBERSHIP_INFERENCE = 'MEMBERSHIP_INFERENCE',
  MODEL_EXTRACTION = 'MODEL_EXTRACTION'
}

/**
 * Attack Configuration
 */
export interface AttackConfig {
  attackType?: AdversarialAttackType;
  epsilon?: number;
  iterations?: number;
  stepSize?: number;
  confidence?: number;
  targetClass?: number;
  untargeted?: boolean;
  perturbationBudget?: number;
  queryLimit?: number;
}

/**
 * Adversarial Example
 */
export interface AdversarialExample {
  id: string;
  originalInput: number[];
  perturbedInput: number[];
  perturbation: number[];
  originalPrediction: number;
  adversarialPrediction: number;
  confidence: number;
  perturbationNorm: number;
  attackType: AdversarialAttackType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Robustness Test Result
 */
export interface RobustnessTestResult {
  testId: string;
  modelId: string;
  attackType: AdversarialAttackType;
  totalSamples: number;
  successfulAttacks: number;
  successRate: number;
  averagePerturbation: number;
  averageConfidenceDrop: number;
  robustnessScore: number;
  results: AdversarialExample[];
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Model Inversion Result
 */
export interface ModelInversionResult {
  inversionId: string;
  targetClass: number;
  reconstructedInput: number[];
  confidence: number;
  iterations: number;
  loss: number;
  metadata: Record<string, unknown>;
}

/**
 * Membership Inference Result
 */
export interface MembershipInferenceResult {
  inferenceId: string;
  sampleId: string;
  isMember: boolean;
  confidence: number;
  attackAccuracy: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  metadata: Record<string, unknown>;
}

/**
 * Model Extraction Result
 */
export interface ModelExtractionResult {
  extractionId: string;
  queryCount: number;
  extractedModelAccuracy: number;
  fidelity: number;
  agreementRate: number;
  extractedParameters: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * Defense Mechanism
 */
export enum DefenseMechanism {
  ADVERSARIAL_TRAINING = 'ADVERSARIAL_TRAINING',
  GRADIENT_MASKING = 'GRADIENT_MASKING',
  INPUT_TRANSFORMATION = 'INPUT_TRANSFORMATION',
  DETECTION_NETWORK = 'DETECTION_NETWORK',
  CERTIFIED_DEFENSE = 'CERTIFIED_DEFENSE',
  ENSEMBLE = 'ENSEMBLE',
  DISTILLATION = 'DISTILLATION'
}

/**
 * Defense Evaluation Result
 */
export interface DefenseEvaluationResult {
  evaluationId: string;
  defenseMechanism: DefenseMechanism;
  cleanAccuracy: number;
  robustAccuracy: number;
  accuracyDrop: number;
  detectionRate: number;
  falsePositiveRate: number;
  metadata: Record<string, unknown>;
}

/**
 * Backdoor Detection Result
 */
export interface BackdoorDetectionResult {
  detectionId: string;
  modelId: string;
  isBackdoored: boolean;
  confidence: number;
  suspiciousNeurons: number[];
  triggerPattern?: number[];
  targetClass?: number;
  attackSuccessRate?: number;
  metadata: Record<string, unknown>;
}

/**
 * Poisoning Attack Detection Result
 */
export interface PoisoningDetectionResult {
  detectionId: string;
  datasetId: string;
  poisonedSamples: string[];
  poisonRate: number;
  detectionConfidence: number;
  poisonType: string;
  metadata: Record<string, unknown>;
}
