import jwt from "jsonwebtoken";
import type { SecretRef } from "common-types";
import { ZeroTrustSecretsManager } from "./manager.js";

export interface RotatingKeyDefinition {
  kid: string;
  secret: string | SecretRef;
  algorithm?: jwt.Algorithm;
  notBefore?: Date | string;
  expiresAt?: Date | string;
}

export interface KeyMaterial {
  kid: string;
  secret: string;
  algorithm: jwt.Algorithm;
  notBefore?: Date;
  expiresAt?: Date;
}

export interface KeyRing {
  active: KeyMaterial;
  keys: KeyMaterial[];
  overlapSeconds: number;
  rotationEnabled: boolean;
  evaluatedAt: Date;
}

export interface BuildKeyRingOptions {
  overlapSeconds?: number;
  now?: Date;
  rotationEnabled?: boolean;
}

async function resolveSecret(
  definition: RotatingKeyDefinition,
  manager: ZeroTrustSecretsManager | null
): Promise<string> {
  if (typeof definition.secret === "string") {
    return definition.secret;
  }
  if (!manager) {
    throw new Error("Secret manager is required to resolve external secret references");
  }
  const resolution = await manager.resolve(definition.secret);
  return resolution.value;
}

function normalizeDate(value?: Date | string): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function chooseActiveKey(keys: KeyMaterial[], now: Date, rotationEnabled: boolean): KeyMaterial {
  if (!rotationEnabled) {
    return keys[0];
  }

  const eligible = keys
    .filter((key) => !key.notBefore || key.notBefore <= now)
    .sort((a, b) => {
      const aTime = a.notBefore?.getTime() ?? 0;
      const bTime = b.notBefore?.getTime() ?? 0;
      return bTime - aTime;
    });

  return eligible[0] ?? keys[0];
}

export async function buildKeyRing(
  definitions: RotatingKeyDefinition[],
  manager: ZeroTrustSecretsManager | null,
  options: BuildKeyRingOptions = {}
): Promise<KeyRing> {
  if (definitions.length === 0) {
    throw new Error("At least one key definition is required to build a key ring");
  }

  const now = options.now ?? new Date();
  const rotationEnabled = options.rotationEnabled ?? process.env.KEY_ROTATION === "1";
  const overlapSeconds = options.overlapSeconds ?? 300;

  const materials: KeyMaterial[] = [];
  for (const definition of definitions) {
    const secret = await resolveSecret(definition, manager);
    materials.push({
      kid: definition.kid,
      secret,
      algorithm: definition.algorithm ?? "HS256",
      notBefore: normalizeDate(definition.notBefore),
      expiresAt: normalizeDate(definition.expiresAt),
    });
  }

  const active = chooseActiveKey(materials, now, rotationEnabled);

  return {
    active,
    keys: materials,
    overlapSeconds,
    rotationEnabled,
    evaluatedAt: now,
  };
}

export function selectSigningKey(ring: KeyRing): KeyMaterial {
  return ring.active;
}

function withinOverlapWindow(target: KeyMaterial, ring: KeyRing, now: Date): boolean {
  if (!ring.rotationEnabled || target.kid === ring.active.kid) {
    return true;
  }

  const anchor = ring.active.notBefore?.getTime() ?? ring.evaluatedAt.getTime();
  const overlapEnd = anchor + ring.overlapSeconds * 1000;
  return now.getTime() <= overlapEnd;
}

export function signTokenWithKeyRing(
  payload: object,
  ring: KeyRing,
  options: jwt.SignOptions = {}
): string {
  const key = selectSigningKey(ring);

  return jwt.sign(payload, key.secret, {
    keyid: key.kid,
    algorithm: key.algorithm,
    ...options,
  });
}

export interface VerifyOptions extends jwt.VerifyOptions {
  now?: Date;
}

export function verifyTokenWithKeyRing(
  token: string,
  ring: KeyRing,
  options: VerifyOptions = {}
): jwt.JwtPayload | string {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new Error("Token could not be decoded");
  }

  const now = options.now ?? new Date();
  const kid = decoded.header.kid;
  if (!kid) {
    throw new Error("Token missing kid header");
  }

  const candidate = ring.keys.find((key) => key.kid === kid);
  if (!candidate) {
    throw new Error(`No key found for kid ${kid}`);
  }

  if (candidate.expiresAt && now > candidate.expiresAt) {
    throw new Error(`Key ${kid} expired`);
  }

  if (!withinOverlapWindow(candidate, ring, now)) {
    throw new Error(`Key ${kid} is outside the rotation overlap window`);
  }

  return jwt.verify(token, candidate.secret, {
    algorithms: [candidate.algorithm],
    ...options,
  });
}
