export type {
  RotationStatus,
  SecretResolution,
  SecretRotationResult,
  SecretsProvider,
  SecretRef,
  SecretRotationPolicy,
} from './types.js';
export { computeRotationStatus, rotationStatusForRef } from './rotation.js';
export { ZeroTrustSecretsManager } from './manager.js';
export {
  AwsKmsEnvelopeProvider,
  buildEnvelopeCiphertext,
  type KmsLikeClient,
} from './providers/kms.js';
export { VaultJwtSecretsProvider } from './providers/vault.js';
export { EnvironmentSecretsProvider } from './providers/env.js';
export {
  buildKeyRing,
  selectSigningKey,
  signTokenWithKeyRing,
  verifyTokenWithKeyRing,
  type KeyRing,
  type KeyMaterial,
  type RotatingKeyDefinition,
} from './keyring.js';
