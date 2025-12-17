import { SchemaVersion } from './types.js';

export class SchemaRegistry {
  private readonly versions: SchemaVersion[] = [];

  register(version: SchemaVersion): void {
    const exists = this.versions.find((entry) => entry.version === version.version);
    if (exists) {
      throw new Error(`Schema version ${version.version} already registered`);
    }
    this.versions.push(version);
  }

  latest(): SchemaVersion | undefined {
    return this.versions[this.versions.length - 1];
  }

  get(version: string): SchemaVersion | undefined {
    return this.versions.find((entry) => entry.version === version);
  }
}
