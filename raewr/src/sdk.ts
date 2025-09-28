import type { InvocationRequest, InvocationResult, ResidencyAttestation } from "./types.js";
import { RaewrRuntime } from "./runtime.js";
import { verifyChain, type ChainVerificationResult, type VerifyChainOptions } from "./chain.js";

export class RaewrSDK {
  constructor(private readonly runtime: RaewrRuntime) {}

  async invoke<T = number>(request: InvocationRequest): Promise<InvocationResult<T>> {
    return this.runtime.invoke<T>(request);
  }

  async verify(attestation: ResidencyAttestation): Promise<boolean> {
    return this.runtime.validateAttestation(attestation);
  }

  static verifyChain(
    attestations: ResidencyAttestation[],
    options: VerifyChainOptions = {}
  ): ChainVerificationResult {
    return verifyChain(attestations, options);
  }
}

export { RaewrRuntime } from "./runtime.js";
export type { ResidencyAttestation, InvocationResult, InvocationRequest } from "./types.js";
export type { ChainVerificationResult, VerifyChainOptions } from "./chain.js";
