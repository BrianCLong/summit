import { promises as fs } from "node:fs";
import type { InvocationRequest, InvocationResult, RuntimeConfig } from "./types.js";
import { assertRegionAllowed, hashPolicy } from "./policy.js";
import { buildInvocationId, hashInputs, hashModule, loadKeyMaterial, signAttestation, verifyAttestation } from "./attestation.js";
import type { ChainState, ResidencyAttestation } from "./types.js";
import { appendToChain } from "./chain.js";

const RUNTIME_VERSION = "0.1.0";

export class RaewrRuntime {
  private readonly config: RuntimeConfig;
  private readonly policyHash: string;
  private chain: ChainState = { height: 0, headDigest: null };
  private keyPromise?: Promise<Awaited<ReturnType<typeof loadKeyMaterial>>>;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.policyHash = hashPolicy(config.policy);
  }

  async invoke<T = number>(request: InvocationRequest): Promise<InvocationResult<T>> {
    assertRegionAllowed(this.config.policy, this.config.region);

    const wasmBytes = await fs.readFile(request.wasmPath);
    const wasmModuleHash = hashModule(wasmBytes);
    const wasmArrayBuffer = wasmBytes.buffer.slice(
      wasmBytes.byteOffset,
      wasmBytes.byteOffset + wasmBytes.byteLength
    ) as ArrayBuffer;
    const module = await WebAssembly.compile(wasmArrayBuffer);
    const instance = await WebAssembly.instantiate(module, {});
    const exported = instance.exports[request.exportName];

    if (typeof exported !== "function") {
      throw new Error(`Export ${request.exportName} is not a callable function in the provided module.`);
    }

    const args = request.args ?? [];
    const result = (exported as (...values: number[]) => unknown)(...args);

    const inputHash = hashInputs(args);
    const invocationId = buildInvocationId(wasmModuleHash, request.exportName, inputHash);
    const timestampLogical = this.chain.height + 1;

    const basePayload = {
      runtimeVersion: RUNTIME_VERSION,
      region: this.config.region,
      nodeId: this.config.nodeId,
      policyId: this.config.policy.policyId,
      policyHash: this.policyHash,
      invocationId,
      wasmModuleHash,
      exportName: request.exportName,
      inputHash,
      timestampLogical
    };

    const { payload, state } = appendToChain(this.chain, basePayload);
    const key = await this.loadKeys();
    const attestation = await signAttestation(payload, key);

    if (!verifyAttestation(attestation) && this.config.policy.denyWithoutValidAttestation) {
      throw new Error("Generated attestation failed verification; policy denies execution result.");
    }

    this.chain = state;

    return { result: result as T, attestation };
  }

  getChainState(): ChainState {
    return { ...this.chain };
  }

  getPolicyHash(): string {
    return this.policyHash;
  }

  async validateAttestation(attestation: ResidencyAttestation): Promise<boolean> {
    const key = await this.loadKeys();
    if (attestation.publicKey !== key.publicKey) {
      return false;
    }

    if (attestation.policyHash !== this.policyHash) {
      return false;
    }

    if (attestation.region !== this.config.region) {
      return false;
    }

    return verifyAttestation(attestation);
  }

  private async loadKeys() {
    if (!this.keyPromise) {
      this.keyPromise = loadKeyMaterial(this.config.privateKeyPath);
    }

    return this.keyPromise;
  }
}

export { RUNTIME_VERSION };
