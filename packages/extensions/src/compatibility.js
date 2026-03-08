"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompatibilityChecker = void 0;
const semver_1 = __importDefault(require("semver"));
class CompatibilityChecker {
    platformVersion;
    supportedBackwardsMajorVersions;
    constructor(options) {
        this.platformVersion = options.platformVersion;
        this.supportedBackwardsMajorVersions = options.supportedBackwardsMajorVersions ?? 1;
    }
    validate(manifest) {
        const { summit } = manifest;
        const normalizedPlatform = semver_1.default.coerce(this.platformVersion);
        if (!normalizedPlatform) {
            throw new Error(`Invalid platform version: ${this.platformVersion}`);
        }
        const minSupported = semver_1.default.coerce(summit?.minVersion || this.platformVersion);
        const maxSupported = semver_1.default.coerce(summit?.maxVersion || this.platformVersion);
        if (!minSupported || !maxSupported) {
            throw new Error(`Extension ${manifest.name} has invalid Summit version bounds`);
        }
        if (semver_1.default.gt(minSupported, normalizedPlatform)) {
            throw new Error(`Extension ${manifest.name} requires Summit >= ${minSupported.version}, current ${normalizedPlatform.version}`);
        }
        if (semver_1.default.lt(maxSupported, normalizedPlatform)) {
            throw new Error(`Extension ${manifest.name} supports Summit <= ${maxSupported.version}, current ${normalizedPlatform.version}`);
        }
        const majorDiff = Math.abs(semver_1.default.major(normalizedPlatform) - semver_1.default.major(minSupported));
        if (majorDiff > this.supportedBackwardsMajorVersions) {
            throw new Error(`Extension ${manifest.name} is outside compatibility window (N-${this.supportedBackwardsMajorVersions})`);
        }
    }
}
exports.CompatibilityChecker = CompatibilityChecker;
