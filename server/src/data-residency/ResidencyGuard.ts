
export interface ResidencyConfig {
  allowedRegions: string[];
  strictMode: boolean;
}

export class ResidencyGuard {
  constructor(private config: ResidencyConfig) {}

  checkAccess(dataRegion: string, userRegion: string): boolean {
    if (!this.config.allowedRegions.includes(dataRegion)) {
      return false;
    }
    if (this.config.strictMode && dataRegion !== userRegion) {
      return false;
    }
    return true;
  }

  validateStorage(region: string): boolean {
    return this.config.allowedRegions.includes(region);
  }
}
