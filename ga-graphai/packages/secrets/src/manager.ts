import type { SecretRef } from "common-types";
import { rotationStatusForRef } from "./rotation.js";
import type {
  RotationStatus,
  SecretResolution,
  SecretRotationResult,
  SecretsProvider,
} from "./types.js";

export class ZeroTrustSecretsManager {
  private readonly providers: SecretsProvider[];

  constructor(providers: SecretsProvider[] = []) {
    this.providers = [...providers];
  }

  register(provider: SecretsProvider): void {
    this.providers.push(provider);
  }

  supports(ref: SecretRef): boolean {
    return this.providers.some((candidate) => candidate.supports(ref));
  }

  private requireProvider(ref: SecretRef): SecretsProvider {
    const provider = this.providers.find((candidate) => candidate.supports(ref));
    if (!provider) {
      throw new Error(
        `No secrets provider registered for ${(ref as { provider?: string }).provider ?? "vault"}`
      );
    }
    return provider;
  }

  async resolve(ref: SecretRef): Promise<SecretResolution> {
    const provider = this.requireProvider(ref);
    const resolution = await provider.getSecret(ref);
    if (!resolution.rotation) {
      resolution.rotation = rotationStatusForRef(ref);
    }
    return resolution;
  }

  async rotate(ref: SecretRef): Promise<SecretRotationResult> {
    const provider = this.requireProvider(ref);
    if (!provider.rotateSecret) {
      throw new Error(`Provider ${provider.name} does not support rotation`);
    }
    const resolution = await provider.rotateSecret(ref);
    if (!resolution.rotation) {
      resolution.rotation = rotationStatusForRef(ref);
    }
    return resolution;
  }

  describeRotation(ref: SecretRef, now: Date = new Date()): RotationStatus {
    const provider = this.providers.find((candidate) => candidate.supports(ref));
    if (provider?.describeRotation) {
      return provider.describeRotation(ref);
    }
    return rotationStatusForRef(ref, now);
  }
}
