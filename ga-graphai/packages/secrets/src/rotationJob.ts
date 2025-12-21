import type { SecretRef } from 'common-types';
import { ZeroTrustSecretsManager } from './manager.js';
import type { SecretResolution } from './types.js';

export interface DualReadPointer {
  active: SecretRef;
  previous?: SecretRef;
}

export interface RotationOutcome {
  pointer: DualReadPointer;
  rotated: SecretResolution;
  audit: { action: 'key.rotated'; key: string; previousKey?: string };
}

export class KeyRotationJob {
  private readonly manager: ZeroTrustSecretsManager;

  constructor(manager: ZeroTrustSecretsManager) {
    this.manager = manager;
  }

  async decrypt(pointer: DualReadPointer): Promise<SecretResolution> {
    try {
      return await this.manager.resolve(pointer.active);
    } catch (err) {
      if (pointer.previous) {
        return await this.manager.resolve(pointer.previous);
      }
      throw err;
    }
  }

  async rotate(pointer: DualReadPointer): Promise<RotationOutcome> {
    const rotated = await this.manager.rotate(pointer.active);
    const newPointer: DualReadPointer = {
      active: rotated.updatedRef ?? pointer.active,
      previous: pointer.active,
    };
    return {
      pointer: newPointer,
      rotated,
      audit: {
        action: 'key.rotated',
        key: newPointer.active.key,
        previousKey: pointer.active.key,
      },
    };
  }

  rollback(pointer: DualReadPointer): DualReadPointer {
    if (!pointer.previous) {
      return pointer;
    }
    return { active: pointer.previous };
  }
}
