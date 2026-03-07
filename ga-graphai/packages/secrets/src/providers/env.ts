import type { EnvSecretRef, SecretRef } from "common-types";
import { rotationStatusForRef } from "../rotation.js";
import type { SecretResolution, SecretRotationResult, SecretsProvider } from "../types.js";

interface EnvironmentSecretsProviderOptions {
  prefix?: string;
  fallbackProviders?: SecretsProvider[];
}

function buildEnvKey(ref: EnvSecretRef, prefix?: string): string {
  return prefix ? `${prefix}${ref.env}` : ref.env;
}

export class EnvironmentSecretsProvider implements SecretsProvider {
  readonly name = "env";
  private readonly options: EnvironmentSecretsProviderOptions;

  constructor(options: EnvironmentSecretsProviderOptions = {}) {
    this.options = options;
  }

  supports(ref: SecretRef): boolean {
    return (ref as EnvSecretRef).env !== undefined || (ref as EnvSecretRef).provider === "env";
  }

  private assertEnvRef(ref: SecretRef): EnvSecretRef {
    if (!this.supports(ref)) {
      throw new Error("EnvironmentSecretsProvider only handles env references");
    }
    return ref as EnvSecretRef;
  }

  private async delegate(ref: SecretRef): Promise<SecretResolution | null> {
    if (!this.options.fallbackProviders || this.options.fallbackProviders.length === 0) {
      return null;
    }

    for (const provider of this.options.fallbackProviders) {
      if (!provider.supports(ref)) continue;
      return provider.getSecret(ref);
    }

    return null;
  }

  async getSecret(ref: SecretRef): Promise<SecretResolution> {
    const envRef = this.assertEnvRef(ref);
    const envKey = buildEnvKey(envRef, this.options.prefix);
    const value = process.env[envKey];

    if (value !== undefined && value !== "") {
      return {
        provider: this.name,
        value,
        version: envRef.version ?? envRef.kid ?? envRef.key,
        rotation: rotationStatusForRef(envRef),
        metadata: envRef.kid ? { kid: envRef.kid } : undefined,
      };
    }

    const delegated = envRef.allowFallback ? await this.delegate(ref) : null;
    if (delegated) {
      return delegated;
    }

    throw new Error(`Environment variable ${envKey} is not set for ${envRef.key}`);
  }

  async rotateSecret(ref: SecretRef): Promise<SecretRotationResult> {
    const envRef = this.assertEnvRef(ref);
    const resolution = await this.getSecret(envRef);
    return {
      ...resolution,
      rotation: rotationStatusForRef(envRef),
    };
  }

  describeRotation(ref: SecretRef) {
    return rotationStatusForRef(this.assertEnvRef(ref));
  }
}
