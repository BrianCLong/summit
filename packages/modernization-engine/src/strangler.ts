import { DomainDefinition, ServiceAccessDescriptor } from "./types.js";
import { BoundaryViolationError } from "./errors.js";

export interface ShadowConfig {
  shadowPercentage: number;
  allowWrites: boolean;
}

export class StranglerAdapter {
  constructor(
    private readonly domain: DomainDefinition,
    private readonly shadowConfig: ShadowConfig
  ) {}

  routeRequest(
    path: string,
    payload: Record<string, unknown>
  ): { destination: "legacy" | "modern"; payload: Record<string, unknown> } {
    const isWritePath = this.domain.commands.some((cmd) => cmd.path === path);
    if (isWritePath && !this.shadowConfig.allowWrites) {
      throw new BoundaryViolationError(
        `Write attempts blocked during shadowing for ${this.domain.name}`
      );
    }

    const target = Math.random() * 100 < this.shadowConfig.shadowPercentage ? "legacy" : "modern";
    return { destination: target, payload };
  }

  enforceCompatibility(descriptor: ServiceAccessDescriptor): void {
    const violatingWrite = descriptor.writes.find(
      (write) => write.domain === this.domain.name && !write.viaAdapter
    );
    if (violatingWrite) {
      throw new BoundaryViolationError(
        `Direct write to ${violatingWrite.resource} bypasses adapter`
      );
    }
  }
}
