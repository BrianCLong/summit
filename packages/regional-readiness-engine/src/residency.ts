import { CrossBorderAllowance, RegionId, ResidencyControlState } from "./types.js";

interface AccessDecision {
  allowed: boolean;
  reasons: string[];
}

export class ResidencyPolicyEngine {
  private readonly tenantHomeRegions = new Map<string, RegionId>();
  private readonly regionControls = new Map<RegionId, ResidencyControlState>();
  private readonly allowances: CrossBorderAllowance[] = [];

  setTenantHomeRegion(tenantId: string, regionId: RegionId): void {
    this.tenantHomeRegions.set(tenantId, regionId);
  }

  registerRegionControls(regionId: RegionId, controls: ResidencyControlState): void {
    this.regionControls.set(regionId, { ...controls });
  }

  allowCrossBorderTransfer(allowance: CrossBorderAllowance): void {
    if (!this.regionControls.has(allowance.fromRegion)) {
      throw new Error(
        `Region controls for ${allowance.fromRegion} must be registered before granting allowances`
      );
    }

    if (allowance.expiresAt && allowance.expiresAt < new Date()) {
      throw new Error("Cannot create an allowance that is already expired");
    }

    this.allowances.push({ ...allowance });
  }

  canStoreData(tenantId: string, targetRegion: RegionId): AccessDecision {
    const reasons: string[] = [];
    const homeRegion = this.tenantHomeRegions.get(tenantId);
    if (!homeRegion) {
      reasons.push("Tenant home region not set");
      return { allowed: false, reasons };
    }

    if (homeRegion !== targetRegion) {
      reasons.push(`Tenant home region ${homeRegion} differs from target region ${targetRegion}`);
      return { allowed: false, reasons };
    }

    const controls = this.regionControls.get(targetRegion);
    if (!controls || !controls.residencyEnforced) {
      reasons.push("Residency controls are not registered or not enforced for target region");
      return { allowed: false, reasons };
    }

    if (!controls.backupsVerified) {
      reasons.push("Regional backups are not verified");
    }

    if (!controls.kmsKeyId) {
      reasons.push("Regional KMS key is not configured");
    }

    return { allowed: reasons.length === 0, reasons };
  }

  canAccess(
    tenantId: string,
    dataRegion: RegionId,
    requestRegion: RegionId,
    dataClass: string,
    purpose: string,
    now: Date = new Date()
  ): AccessDecision {
    const reasons: string[] = [];
    const homeRegion = this.tenantHomeRegions.get(tenantId);
    if (!homeRegion) {
      reasons.push("Tenant home region not set");
      return { allowed: false, reasons };
    }

    const regionControls = this.regionControls.get(dataRegion);
    if (!regionControls || !regionControls.residencyEnforced) {
      reasons.push("Residency controls are not enforced for data region");
      return { allowed: false, reasons };
    }

    if (dataRegion === requestRegion) {
      return { allowed: true, reasons };
    }

    if (!regionControls.egressAllowlist.includes(requestRegion)) {
      reasons.push("Requested region is not in egress allowlist");
      return { allowed: false, reasons };
    }

    const allowance = this.allowances.find(
      (entry) =>
        entry.tenantId === tenantId &&
        entry.fromRegion === dataRegion &&
        entry.toRegion === requestRegion &&
        entry.dataClasses.includes(dataClass)
    );

    if (!allowance) {
      reasons.push("No cross-border allowance configured for this data class");
      return { allowed: false, reasons };
    }

    if (allowance.expiresAt && allowance.expiresAt < now) {
      reasons.push("Cross-border allowance has expired");
      return { allowed: false, reasons };
    }

    if (!purpose.toLowerCase().includes(allowance.purpose.toLowerCase())) {
      reasons.push("Purpose does not align with approved allowance");
      return { allowed: false, reasons };
    }

    return { allowed: true, reasons };
  }

  getEvidence(regionId: RegionId) {
    const controls = this.regionControls.get(regionId);
    if (!controls) {
      return null;
    }

    return {
      regionId,
      residencyEnforced: controls.residencyEnforced,
      kmsKeyId: controls.kmsKeyId,
      kmsRotationVerifiedAt: controls.kmsRotationVerifiedAt?.toISOString(),
      backupsVerified: controls.backupsVerified,
      egressAllowlist: controls.egressAllowlist,
      allowances: this.allowances.filter((entry) => entry.fromRegion === regionId),
    };
  }
}
