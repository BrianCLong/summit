import {
  ComplianceRequirement,
  ComplianceStatus,
  Certification,
  SupplyChainNode,
} from '@intelgraph/supply-chain-types';

/**
 * Regulatory change tracking
 */
export interface RegulatoryChange {
  id: string;
  jurisdiction: string;
  category: string;
  title: string;
  description: string;
  effectiveDate: Date;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedNodes: string[];
  affectedComponents: string[];
  actionRequired: boolean;
  deadline?: Date;
  status: 'identified' | 'assessed' | 'implementing' | 'completed';
}

/**
 * Export control screening result
 */
export interface ExportControlScreening {
  entityId: string;
  entityName: string;
  screenedAgainst: string[];
  result: 'clear' | 'potential-match' | 'denied';
  matches: Array<{
    listName: string;
    matchType: 'exact' | 'fuzzy' | 'alias';
    confidence: number;
    details: string;
  }>;
  recommendations: string[];
  screenedAt: Date;
  nextScreeningDue: Date;
}

/**
 * Conflict minerals assessment
 */
export interface ConflictMineralsAssessment {
  componentId: string;
  containsConflictMinerals: boolean;
  minerals: Array<{
    mineral: 'tin' | 'tantalum' | 'tungsten' | 'gold';
    source: string;
    conflictFree: boolean;
    certificationStatus: string;
  }>;
  drcCompliant: boolean; // Democratic Republic of Congo compliance
  reportingRequired: boolean;
  lastAssessed: Date;
}

/**
 * Compliance monitoring and regulatory tracking
 */
export class ComplianceMonitor {
  /**
   * Check compliance status for a node
   */
  async checkCompliance(
    node: SupplyChainNode,
    requirements: ComplianceRequirement[]
  ): Promise<{
    overallCompliance: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
    compliantCount: number;
    nonCompliantCount: number;
    unknownCount: number;
    details: ComplianceStatus[];
  }> {
    const details: ComplianceStatus[] = [];

    for (const req of requirements) {
      // Check if requirement applies to this node type
      if (!req.applicableNodeTypes.includes(node.type)) {
        continue;
      }

      // Simulate compliance check
      const status = await this.assessComplianceRequirement(node, req);
      details.push(status);
    }

    const compliantCount = details.filter(d => d.status === 'compliant').length;
    const nonCompliantCount = details.filter(d => d.status === 'non-compliant').length;
    const unknownCount = details.filter(d => d.status === 'under-review').length;

    let overallCompliance: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
    if (nonCompliantCount > 0) {
      overallCompliance = 'non-compliant';
    } else if (unknownCount > 0) {
      overallCompliance = 'unknown';
    } else if (compliantCount === details.length && details.length > 0) {
      overallCompliance = 'compliant';
    } else {
      overallCompliance = 'partial';
    }

    return {
      overallCompliance,
      compliantCount,
      nonCompliantCount,
      unknownCount,
      details,
    };
  }

  /**
   * Track regulatory changes
   */
  async trackRegulatoryChanges(
    jurisdiction: string
  ): Promise<RegulatoryChange[]> {
    // Placeholder - would integrate with regulatory monitoring services
    return [
      {
        id: crypto.randomUUID(),
        jurisdiction,
        category: 'export-control',
        title: 'Updated Export Control List',
        description: 'New items added to controlled export list',
        effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        impactLevel: 'medium',
        affectedNodes: [],
        affectedComponents: [],
        actionRequired: true,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'identified',
      },
    ];
  }

  /**
   * Screen entity against sanctions and denied party lists
   */
  async screenExportControl(
    entityId: string,
    entityName: string,
    country: string
  ): Promise<ExportControlScreening> {
    const screeningLists = [
      'OFAC SDN List',
      'BIS Denied Persons List',
      'EU Sanctions List',
      'UN Sanctions List',
    ];

    // Simulate screening
    const matches: Array<{
      listName: string;
      matchType: 'exact' | 'fuzzy' | 'alias';
      confidence: number;
      details: string;
    }> = [];

    // Check for high-risk countries
    const deniedCountries = ['North Korea', 'Iran', 'Syria', 'Cuba'];
    let result: 'clear' | 'potential-match' | 'denied' = 'clear';

    if (deniedCountries.includes(country)) {
      result = 'denied';
      matches.push({
        listName: 'Country Sanctions',
        matchType: 'exact',
        confidence: 1.0,
        details: `Entity located in sanctioned country: ${country}`,
      });
    }

    const recommendations: string[] = [];
    if (result === 'denied') {
      recommendations.push('Do not engage in transactions with this entity');
      recommendations.push('Seek legal counsel for any existing contracts');
    } else if (result === 'potential-match') {
      recommendations.push('Conduct enhanced due diligence');
      recommendations.push('Verify entity identity and ownership');
    } else {
      recommendations.push('Entity cleared for transactions');
      recommendations.push('Continue regular screening (quarterly)');
    }

    return {
      entityId,
      entityName,
      screenedAgainst: screeningLists,
      result,
      matches,
      recommendations,
      screenedAt: new Date(),
      nextScreeningDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Assess conflict minerals compliance
   */
  async assessConflictMinerals(
    componentId: string,
    bomData: { materials: Array<{ name: string; source?: string }> }
  ): Promise<ConflictMineralsAssessment> {
    const conflictMinerals: Array<'tin' | 'tantalum' | 'tungsten' | 'gold'> = [
      'tin',
      'tantalum',
      'tungsten',
      'gold',
    ];

    const minerals: ConflictMineralsAssessment['minerals'] = [];
    let containsConflictMinerals = false;
    let drcCompliant = true;

    for (const material of bomData.materials) {
      const mineralName = material.name.toLowerCase();
      const isConflictMineral = conflictMinerals.some(cm => mineralName.includes(cm));

      if (isConflictMineral) {
        containsConflictMinerals = true;
        const mineral = conflictMinerals.find(cm => mineralName.includes(cm))!;

        // Simulate conflict-free certification check
        const conflictFree = Math.random() > 0.3; // 70% are conflict-free
        if (!conflictFree) {
          drcCompliant = false;
        }

        minerals.push({
          mineral,
          source: material.source || 'Unknown',
          conflictFree,
          certificationStatus: conflictFree ? 'Certified Conflict-Free' : 'Uncertified',
        });
      }
    }

    return {
      componentId,
      containsConflictMinerals,
      minerals,
      drcCompliant,
      reportingRequired: containsConflictMinerals,
      lastAssessed: new Date(),
    };
  }

  /**
   * Manage certifications
   */
  async manageCertifications(
    nodeId: string,
    certifications: Certification[]
  ): Promise<{
    valid: Certification[];
    expiring: Certification[];
    expired: Certification[];
    actions: Array<{
      certificationId: string;
      action: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      deadline?: Date;
    }>;
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const valid = certifications.filter(c => {
      if (c.status !== 'valid') return false;
      if (!c.expirationDate) return true;
      return c.expirationDate > thirtyDaysFromNow;
    });

    const expiring = certifications.filter(c => {
      if (c.status !== 'valid') return false;
      if (!c.expirationDate) return false;
      return c.expirationDate > now && c.expirationDate <= thirtyDaysFromNow;
    });

    const expired = certifications.filter(c => {
      return c.status === 'expired' ||
             (c.expirationDate && c.expirationDate <= now);
    });

    const actions: Array<{
      certificationId: string;
      action: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      deadline?: Date;
    }> = [];

    for (const cert of expiring) {
      actions.push({
        certificationId: cert.id,
        action: `Renew ${cert.name} certification`,
        priority: 'high',
        deadline: cert.expirationDate,
      });
    }

    for (const cert of expired) {
      actions.push({
        certificationId: cert.id,
        action: `Urgent: Restore ${cert.name} certification`,
        priority: 'critical',
        deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return {
      valid,
      expiring,
      expired,
      actions,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    nodeIds: string[],
    nodes: Map<string, SupplyChainNode>,
    requirements: ComplianceRequirement[]
  ): Promise<{
    reportDate: Date;
    summary: {
      totalNodes: number;
      compliantNodes: number;
      nonCompliantNodes: number;
      complianceRate: number;
    };
    requirementsCoverage: Array<{
      requirementId: string;
      requirement: string;
      applicableNodes: number;
      compliantNodes: number;
      complianceRate: number;
    }>;
    criticalFindings: Array<{
      nodeId: string;
      nodeName: string;
      requirement: string;
      severity: 'high' | 'critical';
      finding: string;
    }>;
  }> {
    let compliantCount = 0;
    let nonCompliantCount = 0;
    const criticalFindings: Array<{
      nodeId: string;
      nodeName: string;
      requirement: string;
      severity: 'high' | 'critical';
      finding: string;
    }> = [];

    for (const nodeId of nodeIds) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      const compliance = await this.checkCompliance(node, requirements);
      if (compliance.overallCompliance === 'compliant') {
        compliantCount++;
      } else {
        nonCompliantCount++;

        // Add critical findings
        for (const detail of compliance.details) {
          if (detail.status === 'non-compliant' && detail.findings) {
            for (const finding of detail.findings) {
              if (finding.severity === 'high' || finding.severity === 'critical') {
                criticalFindings.push({
                  nodeId,
                  nodeName: node.name,
                  requirement: requirements.find(r => r.id === detail.requirementId)?.title || 'Unknown',
                  severity: finding.severity,
                  finding: finding.description,
                });
              }
            }
          }
        }
      }
    }

    const requirementsCoverage = requirements.map(req => ({
      requirementId: req.id,
      requirement: req.title,
      applicableNodes: nodeIds.filter(id => {
        const node = nodes.get(id);
        return node && req.applicableNodeTypes.includes(node.type);
      }).length,
      compliantNodes: 0, // Would calculate from detailed checks
      complianceRate: 0,
    }));

    return {
      reportDate: new Date(),
      summary: {
        totalNodes: nodeIds.length,
        compliantNodes: compliantCount,
        nonCompliantNodes: nonCompliantCount,
        complianceRate: nodeIds.length > 0 ? compliantCount / nodeIds.length : 0,
      },
      requirementsCoverage,
      criticalFindings,
    };
  }

  // Private helper methods

  private async assessComplianceRequirement(
    node: SupplyChainNode,
    requirement: ComplianceRequirement
  ): Promise<ComplianceStatus> {
    // Simulate compliance assessment
    const statuses: Array<'compliant' | 'non-compliant' | 'under-review'> = [
      'compliant',
      'compliant',
      'compliant',
      'non-compliant',
      'under-review',
    ];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      id: crypto.randomUUID(),
      nodeId: node.id,
      requirementId: requirement.id,
      status: randomStatus,
      lastAssessedAt: new Date(),
    };
  }
}
