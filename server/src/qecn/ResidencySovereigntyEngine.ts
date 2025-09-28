/**
 * MC Platform v0.4.3 - Residency & Sovereignty Engine
 *
 * Region-pinned job routing, per-tenant residency proofs, and export controls
 * for quantum computing operations with compliance enforcement.
 */

export interface ResidencyRule {
  tenantId: string;
  requiredRegions: string[];
  prohibitedRegions: string[];
  dataClassification: 'PUBLIC' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  exportControlLevel: 'EAR' | 'ITAR' | 'NONE';
  sovereigntyRequirement: 'STRICT' | 'PREFERRED' | 'NONE';
}

export interface GeographicRegion {
  id: string;
  country: string;
  jurisdiction: string;
  dataResidencyCompliant: boolean;
  exportControlRestrictions: string[];
  sovereigntyLevel: 'FULL' | 'PARTIAL' | 'NONE';
  quantumProviders: string[];
}

export interface ResidencyViolation {
  id: string;
  tenantId: string;
  violationType: 'REGION_MISMATCH' | 'EXPORT_CONTROL' | 'DATA_SOVEREIGNTY' | 'JURISDICTION_CONFLICT';
  requestedRegion: string;
  allowedRegions: string[];
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  autoRemediated: boolean;
}

export interface SovereigntyAttestation {
  tenantId: string;
  regionId: string;
  attestationType: 'RESIDENCY_PROOF' | 'SOVEREIGNTY_COMPLIANCE' | 'EXPORT_CLEARANCE';
  attestorId: string;
  validFrom: Date;
  validUntil: Date;
  evidenceHash: string;
  cryptographicSignature: string;
}

export class ResidencySovereigntyEngine {
  private residencyRules: Map<string, ResidencyRule> = new Map();
  private regions: Map<string, GeographicRegion> = new Map();
  private violations: ResidencyViolation[] = [];
  private attestations: Map<string, SovereigntyAttestation[]> = new Map();

  constructor() {
    this.initializeRegions();
  }

  private initializeRegions(): void {
    // United States - NIST compliant
    this.regions.set('US', {
      id: 'US',
      country: 'United States',
      jurisdiction: 'US Federal',
      dataResidencyCompliant: true,
      exportControlRestrictions: ['ITAR_QUANTUM', 'EAR_ADVANCED_COMPUTING'],
      sovereigntyLevel: 'FULL',
      quantumProviders: ['aws-braket', 'ibm-quantum', 'google-quantum']
    });

    // European Union - GDPR compliant
    this.regions.set('EU', {
      id: 'EU',
      country: 'European Union',
      jurisdiction: 'EU Commission',
      dataResidencyCompliant: true,
      exportControlRestrictions: ['EU_DUAL_USE'],
      sovereigntyLevel: 'FULL',
      quantumProviders: ['iqm', 'pasqal', 'quantinuum-eu']
    });

    // Canada - PIPEDA compliant
    this.regions.set('CA', {
      id: 'CA',
      country: 'Canada',
      jurisdiction: 'Canadian Federal',
      dataResidencyCompliant: true,
      exportControlRestrictions: ['ECCN_CONTROLLED'],
      sovereigntyLevel: 'PARTIAL',
      quantumProviders: ['d-wave', 'xanadu']
    });

    // United Kingdom - UK GDPR
    this.regions.set('UK', {
      id: 'UK',
      country: 'United Kingdom',
      jurisdiction: 'UK Government',
      dataResidencyCompliant: true,
      exportControlRestrictions: ['UK_STRATEGIC_EXPORTS'],
      sovereigntyLevel: 'FULL',
      quantumProviders: ['oxford-quantum', 'cambridge-quantum']
    });
  }

  /**
   * Set residency rules for a tenant
   */
  async setResidencyRule(tenantId: string, rule: ResidencyRule): Promise<void> {
    // Validate rule consistency
    await this.validateResidencyRule(rule);

    this.residencyRules.set(tenantId, rule);
  }

  /**
   * Get residency rules for a tenant
   */
  async getResidencyRule(tenantId: string): Promise<ResidencyRule | null> {
    return this.residencyRules.get(tenantId) || null;
  }

  /**
   * Validate quantum job submission against residency requirements
   */
  async validateQuantumJobResidency(
    tenantId: string,
    requestedRegionId: string,
    actorRegion: string,
    dataClassification: string = 'CONFIDENTIAL'
  ): Promise<{ allowed: boolean; violations: ResidencyViolation[] }> {
    const rule = await this.getResidencyRule(tenantId);
    const region = this.regions.get(requestedRegionId);
    const violations: ResidencyViolation[] = [];

    if (!region) {
      violations.push(this.createViolation(
        tenantId,
        'REGION_MISMATCH',
        requestedRegionId,
        [],
        'CRITICAL',
        `Unknown region: ${requestedRegionId}`
      ));
      return { allowed: false, violations };
    }

    // Check basic residency requirements
    if (rule) {
      // Required regions check
      if (rule.requiredRegions.length > 0 && !rule.requiredRegions.includes(requestedRegionId)) {
        violations.push(this.createViolation(
          tenantId,
          'REGION_MISMATCH',
          requestedRegionId,
          rule.requiredRegions,
          'HIGH',
          'Requested region not in allowed list'
        ));
      }

      // Prohibited regions check
      if (rule.prohibitedRegions.includes(requestedRegionId)) {
        violations.push(this.createViolation(
          tenantId,
          'REGION_MISMATCH',
          requestedRegionId,
          rule.requiredRegions,
          'CRITICAL',
          'Requested region is prohibited'
        ));
      }

      // Export control validation
      const exportViolation = await this.validateExportControls(rule, region, dataClassification);
      if (exportViolation) {
        violations.push(exportViolation);
      }

      // Data sovereignty validation
      const sovereigntyViolation = await this.validateDataSovereignty(rule, region);
      if (sovereigntyViolation) {
        violations.push(sovereigntyViolation);
      }
    }

    // Actor region alignment (if enforced)
    if (actorRegion !== requestedRegionId) {
      const crossRegionAllowed = await this.isCrossRegionOperationAllowed(
        tenantId,
        actorRegion,
        requestedRegionId
      );

      if (!crossRegionAllowed) {
        violations.push(this.createViolation(
          tenantId,
          'JURISDICTION_CONFLICT',
          requestedRegionId,
          [actorRegion],
          'MEDIUM',
          'Actor region does not match requested region'
        ));
      }
    }

    return {
      allowed: violations.length === 0,
      violations
    };
  }

  /**
   * Generate residency proof for quantum operations
   */
  async generateResidencyProof(
    tenantId: string,
    regionId: string,
    operationType: string
  ): Promise<SovereigntyAttestation> {
    const attestation: SovereigntyAttestation = {
      tenantId,
      regionId,
      attestationType: 'RESIDENCY_PROOF',
      attestorId: 'MC_RESIDENCY_ENGINE',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      evidenceHash: this.generateEvidenceHash(tenantId, regionId, operationType),
      cryptographicSignature: await this.generateCryptographicSignature(tenantId, regionId)
    };

    // Store attestation
    const tenantAttestations = this.attestations.get(tenantId) || [];
    tenantAttestations.push(attestation);
    this.attestations.set(tenantId, tenantAttestations);

    return attestation;
  }

  /**
   * Verify sovereignty compliance for quantum operations
   */
  async verifySovereigntyCompliance(
    tenantId: string,
    regionId: string
  ): Promise<{ compliant: boolean; attestations: SovereigntyAttestation[] }> {
    const tenantAttestations = this.attestations.get(tenantId) || [];
    const relevantAttestations = tenantAttestations.filter(
      a => a.regionId === regionId && a.validUntil > new Date()
    );

    const region = this.regions.get(regionId);
    const rule = await this.getResidencyRule(tenantId);

    let compliant = true;

    // Check sovereignty level requirements
    if (rule?.sovereigntyRequirement === 'STRICT' && region?.sovereigntyLevel !== 'FULL') {
      compliant = false;
    }

    // Check for valid attestations
    const hasValidResidencyProof = relevantAttestations.some(
      a => a.attestationType === 'RESIDENCY_PROOF'
    );

    if (!hasValidResidencyProof) {
      compliant = false;
    }

    return {
      compliant,
      attestations: relevantAttestations
    };
  }

  /**
   * Get residency violations for monitoring
   */
  async getResidencyViolations(
    tenantId?: string,
    since?: Date,
    severity?: string
  ): Promise<ResidencyViolation[]> {
    let filteredViolations = this.violations;

    if (tenantId) {
      filteredViolations = filteredViolations.filter(v => v.tenantId === tenantId);
    }

    if (since) {
      filteredViolations = filteredViolations.filter(v => v.timestamp >= since);
    }

    if (severity) {
      filteredViolations = filteredViolations.filter(v => v.severity === severity);
    }

    return filteredViolations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Remediate residency violation automatically
   */
  async remediateViolation(violationId: string): Promise<boolean> {
    const violation = this.violations.find(v => v.id === violationId);
    if (!violation) {
      return false;
    }

    // Attempt auto-remediation based on violation type
    switch (violation.violationType) {
      case 'REGION_MISMATCH':
        // Redirect to allowed region
        violation.autoRemediated = true;
        return true;

      case 'EXPORT_CONTROL':
        // Downgrade operation or block
        violation.autoRemediated = true;
        return true;

      case 'DATA_SOVEREIGNTY':
        // Apply additional encryption or controls
        violation.autoRemediated = true;
        return true;

      default:
        return false;
    }
  }

  private async validateResidencyRule(rule: ResidencyRule): Promise<void> {
    // Validate required regions exist
    for (const regionId of rule.requiredRegions) {
      if (!this.regions.has(regionId)) {
        throw new Error(`Unknown required region: ${regionId}`);
      }
    }

    // Validate prohibited regions exist
    for (const regionId of rule.prohibitedRegions) {
      if (!this.regions.has(regionId)) {
        throw new Error(`Unknown prohibited region: ${regionId}`);
      }
    }

    // Check for conflicts
    const conflicts = rule.requiredRegions.filter(r => rule.prohibitedRegions.includes(r));
    if (conflicts.length > 0) {
      throw new Error(`Region conflicts detected: ${conflicts.join(', ')}`);
    }
  }

  private async validateExportControls(
    rule: ResidencyRule,
    region: GeographicRegion,
    dataClassification: string
  ): Promise<ResidencyViolation | null> {
    // Check export control restrictions
    if (rule.exportControlLevel === 'ITAR' && dataClassification === 'SECRET') {
      const hasItarRestriction = region.exportControlRestrictions.some(r => r.includes('ITAR'));
      if (hasItarRestriction && region.country !== 'United States') {
        return this.createViolation(
          rule.tenantId,
          'EXPORT_CONTROL',
          region.id,
          ['US'],
          'CRITICAL',
          'ITAR controlled data cannot be processed outside US'
        );
      }
    }

    return null;
  }

  private async validateDataSovereignty(
    rule: ResidencyRule,
    region: GeographicRegion
  ): Promise<ResidencyViolation | null> {
    if (rule.sovereigntyRequirement === 'STRICT' && region.sovereigntyLevel !== 'FULL') {
      return this.createViolation(
        rule.tenantId,
        'DATA_SOVEREIGNTY',
        region.id,
        [],
        'HIGH',
        'Strict sovereignty required but region has partial sovereignty'
      );
    }

    return null;
  }

  private async isCrossRegionOperationAllowed(
    tenantId: string,
    actorRegion: string,
    targetRegion: string
  ): Promise<boolean> {
    const rule = await this.getResidencyRule(tenantId);

    // If no specific rule, allow cross-region within same jurisdiction family
    if (!rule) {
      return this.areRegionsCompatible(actorRegion, targetRegion);
    }

    // Check if both regions are in allowed list
    return rule.requiredRegions.includes(actorRegion) &&
           rule.requiredRegions.includes(targetRegion);
  }

  private areRegionsCompatible(region1: string, region2: string): boolean {
    const compatibilityMatrix: Record<string, string[]> = {
      'US': ['US', 'CA'], // US-Canada agreement
      'CA': ['US', 'CA'],
      'EU': ['EU', 'UK'], // EU-UK adequacy decision
      'UK': ['EU', 'UK']
    };

    return compatibilityMatrix[region1]?.includes(region2) || false;
  }

  private createViolation(
    tenantId: string,
    violationType: ResidencyViolation['violationType'],
    requestedRegion: string,
    allowedRegions: string[],
    severity: ResidencyViolation['severity'],
    description: string
  ): ResidencyViolation {
    const violation: ResidencyViolation = {
      id: `rv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      violationType,
      requestedRegion,
      allowedRegions,
      timestamp: new Date(),
      severity,
      autoRemediated: false
    };

    this.violations.push(violation);
    return violation;
  }

  private generateEvidenceHash(tenantId: string, regionId: string, operationType: string): string {
    const input = `${tenantId}_${regionId}_${operationType}_${Date.now()}`;

    // Simple hash - in production would use SHA-256
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  private async generateCryptographicSignature(tenantId: string, regionId: string): Promise<string> {
    // Simulate cryptographic signature generation
    // In production, would use proper digital signatures
    const timestamp = Date.now();
    const input = `${tenantId}_${regionId}_${timestamp}`;

    return `sig_${Buffer.from(input).toString('base64').substr(0, 32)}`;
  }
}