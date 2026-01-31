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
export * from './types';

// Attack implementations
export { FGSMAttack } from './attacks/fgsm';
export { PGDAttack } from './attacks/pgd';
export { CarliniWagnerAttack } from './attacks/cw';
export { DeepFoolAttack } from './attacks/deepfool';
export { UniversalPerturbationAttack } from './attacks/universal';
export { BlackBoxAttack } from './attacks/black-box';
export {
  ModelInversionAttack,
  MembershipInferenceAttack,
  ModelExtractionAttack
} from './attacks/model-inversion';

// Robustness testing
export { RobustnessTester } from './robustness/robustness-tester';
