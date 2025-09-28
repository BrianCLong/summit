import { createHash } from "node:crypto";
import type { AttestationPayload, ChainState, ResidencyAttestation } from "./types.js";

export const GENESIS_MARKER = "genesis";

export function computeChainDigest(
  invocationId: string,
  previousDigest: string | null,
  policyHash: string,
  wasmModuleHash: string
): string {
  return createHash("sha256")
    .update(`${invocationId}:${previousDigest ?? GENESIS_MARKER}:${policyHash}:${wasmModuleHash}`)
    .digest("hex");
}

export function appendToChain(
  state: ChainState,
  payload: Omit<AttestationPayload, "chainDigest" | "previousDigest">
): { payload: AttestationPayload; state: ChainState } {
  const previousDigest = state.headDigest;
  const chainDigest = computeChainDigest(
    payload.invocationId,
    previousDigest,
    payload.policyHash,
    payload.wasmModuleHash
  );

  const nextPayload: AttestationPayload = {
    ...payload,
    previousDigest,
    chainDigest
  };

  const nextState: ChainState = {
    height: state.height + 1,
    headDigest: chainDigest
  };

  return { payload: nextPayload, state: nextState };
}

export interface ChainVerificationResult {
  valid: boolean;
  failures: string[];
}

export interface VerifyChainOptions {
  minimumLength?: number;
}

export function verifyChain(
  attestations: ResidencyAttestation[],
  options: VerifyChainOptions = {}
): ChainVerificationResult {
  const failures: string[] = [];
  let previousDigest: string | null = null;

  attestations.forEach((attestation, index) => {
    if (attestation.previousDigest !== previousDigest) {
      failures.push(
        `Attestation index ${index} previousDigest mismatch: expected ${previousDigest}, received ${attestation.previousDigest}`
      );
    }

    const expectedDigest = computeChainDigest(
      attestation.invocationId,
      previousDigest,
      attestation.policyHash,
      attestation.wasmModuleHash
    );

    if (expectedDigest !== attestation.chainDigest) {
      failures.push(
        `Attestation index ${index} chainDigest mismatch: expected ${expectedDigest}, received ${attestation.chainDigest}`
      );
    }

    previousDigest = attestation.chainDigest;
  });

  if (typeof options.minimumLength === "number" && attestations.length < options.minimumLength) {
    failures.push(
      `Chain length ${attestations.length} is shorter than the required minimum ${options.minimumLength}.`
    );
  }

  return { valid: failures.length === 0, failures };
}
