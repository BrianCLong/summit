import semver from "semver";
import { ExtensionManifest } from "./types.js";

export interface CompatibilityWindowOptions {
  platformVersion: string;
  supportedBackwardsMajorVersions?: number;
}

export class CompatibilityChecker {
  private platformVersion: string;
  private supportedBackwardsMajorVersions: number;

  constructor(options: CompatibilityWindowOptions) {
    this.platformVersion = options.platformVersion;
    this.supportedBackwardsMajorVersions = options.supportedBackwardsMajorVersions ?? 1;
  }

  validate(manifest: ExtensionManifest): void {
    const { summit } = manifest;
    const normalizedPlatform = semver.coerce(this.platformVersion);

    if (!normalizedPlatform) {
      throw new Error(`Invalid platform version: ${this.platformVersion}`);
    }

    const minSupported = semver.coerce(summit?.minVersion || this.platformVersion);
    const maxSupported = semver.coerce(summit?.maxVersion || this.platformVersion);

    if (!minSupported || !maxSupported) {
      throw new Error(`Extension ${manifest.name} has invalid Summit version bounds`);
    }

    if (semver.gt(minSupported, normalizedPlatform)) {
      throw new Error(
        `Extension ${manifest.name} requires Summit >= ${minSupported.version}, current ${normalizedPlatform.version}`
      );
    }

    if (semver.lt(maxSupported, normalizedPlatform)) {
      throw new Error(
        `Extension ${manifest.name} supports Summit <= ${maxSupported.version}, current ${normalizedPlatform.version}`
      );
    }

    const majorDiff = Math.abs(semver.major(normalizedPlatform) - semver.major(minSupported));
    if (majorDiff > this.supportedBackwardsMajorVersions) {
      throw new Error(
        `Extension ${manifest.name} is outside compatibility window (N-${this.supportedBackwardsMajorVersions})`
      );
    }
  }
}
