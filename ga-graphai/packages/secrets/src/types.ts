import type { SecretRef, SecretRotationPolicy } from "common-types";

export interface RotationStatus {
  intervalDays?: number;
  lastRotated?: string;
  nextRotationDue?: string;
  needsRotation: boolean;
  reason?: string;
}

export interface SecretResolution {
  provider: string;
  value: string;
  version?: string;
  rotation?: RotationStatus;
  metadata?: Record<string, unknown>;
}

export interface SecretRotationResult extends SecretResolution {
  updatedRef?: SecretRef;
}

export interface SecretsProvider {
  name: string;
  supports(ref: SecretRef): boolean;
  getSecret(ref: SecretRef): Promise<SecretResolution>;
  rotateSecret?(ref: SecretRef): Promise<SecretRotationResult>;
  describeRotation?(ref: SecretRef): RotationStatus;
}

export type HttpClient = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{ status: number; json(): Promise<unknown> }>;

export type { SecretRef, SecretRotationPolicy };
