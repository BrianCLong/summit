import { FeatureFlagProvider, FlagContext } from './provider.js';
import { FeatureFlag } from './registry.js';

export * from './registry.js';
export * from './provider.js';

export function isEnabled(flag: FeatureFlag, context?: FlagContext): boolean {
  return FeatureFlagProvider.getInstance().isEnabled(flag, context);
}

export function requireFlag(flag: FeatureFlag) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      if (!isEnabled(flag)) {
        throw new Error(`Feature ${flag} is not enabled`);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
