/**
 * Adversarial AI and ML Security Package
 *
 * Comprehensive adversarial machine learning capabilities including:
 * - White-box attacks (FGSM, PGD, C&W, DeepFool)
 * - Black-box attacks (ZOO, Boundary, Score-based)
 * - Model extraction and inversion
 * - Membership inference
 * - Robustness testing
 * - Defense evaluation
 * - Backdoor and poisoning detection
 */

// Types
export * from './types.js';

// Attack implementations
export { FGSMAttack } from './attacks/fgsm.js';
export { PGDAttack } from './attacks/pgd.js';
export { CarliniWagnerAttack } from './attacks/cw.js';
export { DeepFoolAttack } from './attacks/deepfool.js';
export { UniversalPerturbationAttack } from './attacks/universal.js';
export { BlackBoxAttack } from './attacks/black-box.js';
export {
  ModelInversionAttack,
  MembershipInferenceAttack,
  ModelExtractionAttack
} from './attacks/model-inversion.js';

// Robustness testing
export { RobustnessTester } from './robustness/robustness-tester.js';
