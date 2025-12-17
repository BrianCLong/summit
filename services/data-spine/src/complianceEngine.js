/**
 * Data Spine Compliance Engine
 *
 * Checks data contracts against regulatory standards including GDPR, CCPA,
 * HIPAA, SOC2, and custom enterprise policies. Generates compliance reports
 * and tracks remediation efforts.
 */

const crypto = require('crypto');

const COMPLIANCE_STANDARDS = {
  GDPR: {
    id: 'GDPR',
    name: 'General Data Protection Regulation',
    version: '2016/679',
    jurisdiction: 'EU',
    requirements: [
      {
        id: 'gdpr-lawful-basis',
        description: 'Processing must have lawful basis',
        category: 'lawfulness',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.lawfulBasis != null;
        },
      },
      {
        id: 'gdpr-purpose-limitation',
        description: 'Data collected for specified, explicit purposes',
        category: 'purpose',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.purposes?.length > 0;
        },
      },
      {
        id: 'gdpr-data-minimization',
        description: 'Only necessary data is processed',
        category: 'minimization',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.dataMinimization !== false;
        },
      },
      {
        id: 'gdpr-storage-limitation',
        description: 'Retention period defined',
        category: 'retention',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.retention?.maxDays != null;
        },
      },
      {
        id: 'gdpr-security',
        description: 'Appropriate security measures in place',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          if (!meta?.classification?.includes('PII')) return true;
          return ['tokenize', 'encrypt'].includes(meta?.policies?.lowerEnvironmentHandling);
        },
      },
      {
        id: 'gdpr-cross-border',
        description: 'Cross-border transfers documented',
        category: 'transfer',
        mandatory: false,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.residency?.crossBorderPolicy != null;
        },
      },
    ],
  },
  CCPA: {
    id: 'CCPA',
    name: 'California Consumer Privacy Act',
    version: '2018',
    jurisdiction: 'US-CA',
    requirements: [
      {
        id: 'ccpa-disclosure',
        description: 'Categories of personal information disclosed',
        category: 'transparency',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.classification?.length > 0;
        },
      },
      {
        id: 'ccpa-purpose',
        description: 'Business purpose documented',
        category: 'purpose',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.businessPurpose != null;
        },
      },
      {
        id: 'ccpa-opt-out',
        description: 'Opt-out mechanism available for sale of data',
        category: 'rights',
        mandatory: false,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.optOutEnabled !== false;
        },
      },
      {
        id: 'ccpa-deletion',
        description: 'Deletion capability documented',
        category: 'rights',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.retention?.deletionPolicy != null;
        },
      },
    ],
  },
  HIPAA: {
    id: 'HIPAA',
    name: 'Health Insurance Portability and Accountability Act',
    version: '1996',
    jurisdiction: 'US',
    requirements: [
      {
        id: 'hipaa-phi-identification',
        description: 'PHI properly classified',
        category: 'classification',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          if (!meta) return false;
          // Must explicitly classify PHI if health data
          const hasHealthData = contract.title?.toLowerCase().includes('health') ||
            contract.description?.toLowerCase().includes('patient');
          if (!hasHealthData) return true;
          return meta.classification?.includes('PHI') || meta.classification?.includes('PII');
        },
      },
      {
        id: 'hipaa-encryption',
        description: 'PHI encrypted at rest and in transit',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          if (!meta?.classification?.includes('PHI')) return true;
          return meta.policies?.encryption?.atRest && meta.policies?.encryption?.inTransit;
        },
      },
      {
        id: 'hipaa-access-controls',
        description: 'Access controls documented',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.accessControl != null;
        },
      },
      {
        id: 'hipaa-audit-trail',
        description: 'Audit logging enabled',
        category: 'audit',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.auditEnabled !== false;
        },
      },
    ],
  },
  SOC2: {
    id: 'SOC2',
    name: 'Service Organization Control 2',
    version: '2017',
    jurisdiction: 'Global',
    requirements: [
      {
        id: 'soc2-access-control',
        description: 'Logical access controls defined',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.accessControl != null;
        },
      },
      {
        id: 'soc2-encryption',
        description: 'Data encryption documented',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          const handling = meta?.policies?.lowerEnvironmentHandling;
          return ['tokenize', 'encrypt', 'redact'].includes(handling);
        },
      },
      {
        id: 'soc2-monitoring',
        description: 'Monitoring and alerting in place',
        category: 'operations',
        mandatory: false,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.monitoring != null;
        },
      },
      {
        id: 'soc2-incident-response',
        description: 'Incident response documented',
        category: 'operations',
        mandatory: false,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.policies?.incidentResponse != null;
        },
      },
    ],
  },
  'DATA-RESIDENCY': {
    id: 'DATA-RESIDENCY',
    name: 'Data Residency Requirements',
    version: '1.0',
    jurisdiction: 'Multi-region',
    requirements: [
      {
        id: 'residency-regions-defined',
        description: 'Allowed regions explicitly defined',
        category: 'residency',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.residency?.allowedRegions?.length > 0;
        },
      },
      {
        id: 'residency-default-set',
        description: 'Default region configured',
        category: 'residency',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.residency?.defaultRegion != null;
        },
      },
      {
        id: 'residency-validation',
        description: 'Default region in allowed list',
        category: 'residency',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          return meta?.residency?.allowedRegions?.includes(meta?.residency?.defaultRegion);
        },
      },
    ],
  },
  'PII-PROTECTION': {
    id: 'PII-PROTECTION',
    name: 'PII Protection Standard',
    version: '1.0',
    jurisdiction: 'Enterprise',
    requirements: [
      {
        id: 'pii-classification',
        description: 'PII properly classified',
        category: 'classification',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          // Check if any field policies indicate PII handling
          const hasPiiFields = meta?.policies?.fieldPolicies?.some(
            (p) => p.action === 'tokenize' || p.action === 'redact'
          );
          if (!hasPiiFields) return true;
          return meta?.classification?.includes('PII');
        },
      },
      {
        id: 'pii-lower-env-protection',
        description: 'PII protected in lower environments',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          if (!meta?.classification?.includes('PII')) return true;
          return ['tokenize', 'redact'].includes(meta?.policies?.lowerEnvironmentHandling);
        },
      },
      {
        id: 'pii-deterministic-transform',
        description: 'PII transformations are deterministic',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          if (!meta?.classification?.includes('PII')) return true;
          return meta?.policies?.transformations?.deterministic === true;
        },
      },
      {
        id: 'pii-reversible-transform',
        description: 'PII transformations are reversible',
        category: 'security',
        mandatory: true,
        check: (contract) => {
          const meta = contract['x-data-spine'];
          if (!meta?.classification?.includes('PII')) return true;
          return meta?.policies?.transformations?.reversible === true;
        },
      },
    ],
  },
};

class ComplianceEngine {
  constructor(options = {}) {
    this.standards = new Map(Object.entries(COMPLIANCE_STANDARDS));
    this.assessments = [];
    this.violations = new Map();
    this.remediations = new Map();
    this.auditTrail = options.auditTrail;

    // Load custom standards if provided
    if (options.customStandards) {
      Object.entries(options.customStandards).forEach(([id, standard]) => {
        this.standards.set(id, standard);
      });
    }
  }

  // ============================================================================
  // Standard Management
  // ============================================================================

  registerStandard(standard) {
    if (!standard.id || !standard.requirements) {
      throw new Error('Standard must have id and requirements');
    }
    this.standards.set(standard.id, standard);
  }

  getStandard(standardId) {
    return this.standards.get(standardId);
  }

  listStandards() {
    return Array.from(this.standards.values()).map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version,
      jurisdiction: s.jurisdiction,
      requirementCount: s.requirements.length,
    }));
  }

  // ============================================================================
  // Compliance Assessment
  // ============================================================================

  assessContract(contract, standardIds = null) {
    const applicableStandards = standardIds
      ? standardIds.map((id) => this.standards.get(id)).filter(Boolean)
      : this.getApplicableStandards(contract);

    const assessment = {
      assessmentId: crypto.randomUUID(),
      contractName: contract['x-data-spine']?.contract || contract.title,
      contractVersion: contract['x-data-spine']?.version,
      assessedAt: new Date().toISOString(),
      standards: [],
      overallScore: 0,
      overallCompliant: true,
      violations: [],
      recommendations: [],
    };

    let totalChecks = 0;
    let passedChecks = 0;

    applicableStandards.forEach((standard) => {
      const standardResult = this.assessStandard(contract, standard);
      assessment.standards.push(standardResult);

      totalChecks += standardResult.totalRequirements;
      passedChecks += standardResult.metRequirements;

      if (!standardResult.compliant) {
        assessment.overallCompliant = false;
      }

      assessment.violations.push(...standardResult.violations);
      assessment.recommendations.push(...standardResult.recommendations);
    });

    assessment.overallScore = totalChecks > 0
      ? Math.round((passedChecks / totalChecks) * 100)
      : 100;

    this.assessments.push(assessment);

    // Record violations
    assessment.violations.forEach((violation) => {
      this.violations.set(violation.id, violation);
    });

    // Record in audit trail
    if (this.auditTrail) {
      this.auditTrail.recordComplianceCheck(
        { name: assessment.contractName, version: assessment.contractVersion },
        { id: 'multi-standard', version: '1.0' },
        {
          compliant: assessment.overallCompliant,
          score: assessment.overallScore,
          violations: assessment.violations,
          recommendations: assessment.recommendations,
        }
      );
    }

    return assessment;
  }

  assessStandard(contract, standard) {
    const result = {
      standardId: standard.id,
      standardName: standard.name,
      version: standard.version,
      totalRequirements: standard.requirements.length,
      metRequirements: 0,
      compliant: true,
      violations: [],
      recommendations: [],
      details: [],
    };

    standard.requirements.forEach((requirement) => {
      const checkResult = {
        requirementId: requirement.id,
        description: requirement.description,
        category: requirement.category,
        mandatory: requirement.mandatory,
        status: 'unknown',
      };

      try {
        const passed = requirement.check(contract);
        checkResult.status = passed ? 'met' : 'not_met';

        if (passed) {
          result.metRequirements++;
        } else {
          if (requirement.mandatory) {
            result.compliant = false;
            result.violations.push({
              id: crypto.randomUUID(),
              requirementId: requirement.id,
              standardId: standard.id,
              severity: requirement.mandatory ? 'critical' : 'medium',
              description: requirement.description,
              category: requirement.category,
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          }

          result.recommendations.push({
            requirementId: requirement.id,
            description: `Implement: ${requirement.description}`,
            category: requirement.category,
            priority: requirement.mandatory ? 'high' : 'medium',
          });
        }
      } catch (error) {
        checkResult.status = 'error';
        checkResult.error = error.message;
        if (requirement.mandatory) {
          result.compliant = false;
        }
      }

      result.details.push(checkResult);
    });

    return result;
  }

  getApplicableStandards(contract) {
    const meta = contract['x-data-spine'];
    const applicable = [];

    // Always check data residency
    applicable.push(this.standards.get('DATA-RESIDENCY'));

    // Check PII standards if PII classified
    if (meta?.classification?.includes('PII')) {
      applicable.push(this.standards.get('PII-PROTECTION'));
      applicable.push(this.standards.get('GDPR'));
      applicable.push(this.standards.get('CCPA'));
    }

    // Check HIPAA if health data
    if (meta?.classification?.includes('PHI') ||
        contract.title?.toLowerCase().includes('health')) {
      applicable.push(this.standards.get('HIPAA'));
    }

    // Always check SOC2 for enterprise contracts
    if (meta?.classification?.includes('Internal') ||
        meta?.classification?.includes('Confidential')) {
      applicable.push(this.standards.get('SOC2'));
    }

    return applicable.filter(Boolean);
  }

  // ============================================================================
  // Violation Management
  // ============================================================================

  getViolation(violationId) {
    return this.violations.get(violationId);
  }

  listViolations(filters = {}) {
    let results = Array.from(this.violations.values());

    if (filters.standardId) {
      results = results.filter((v) => v.standardId === filters.standardId);
    }
    if (filters.severity) {
      results = results.filter((v) => v.severity === filters.severity);
    }
    if (filters.resolved !== undefined) {
      results = results.filter((v) => v.resolved === filters.resolved);
    }
    if (filters.category) {
      results = results.filter((v) => v.category === filters.category);
    }

    return results;
  }

  resolveViolation(violationId, resolution) {
    const violation = this.violations.get(violationId);
    if (!violation) {
      throw new Error(`Violation ${violationId} not found`);
    }

    violation.resolved = true;
    violation.resolvedAt = new Date().toISOString();
    violation.resolution = resolution;

    this.remediations.set(violationId, {
      violationId,
      resolution,
      resolvedAt: violation.resolvedAt,
      resolvedBy: resolution.resolvedBy,
    });

    return violation;
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  generateComplianceReport(options = {}) {
    const period = {
      start: options.startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: options.endTime || new Date().toISOString(),
    };

    const assessments = this.assessments.filter(
      (a) => a.assessedAt >= period.start && a.assessedAt <= period.end
    );

    const violations = this.listViolations({ resolved: false });
    const resolved = this.listViolations({ resolved: true });

    const byStandard = {};
    assessments.forEach((assessment) => {
      assessment.standards.forEach((s) => {
        if (!byStandard[s.standardId]) {
          byStandard[s.standardId] = {
            assessments: 0,
            compliant: 0,
            avgScore: 0,
            scores: [],
          };
        }
        byStandard[s.standardId].assessments++;
        if (s.compliant) byStandard[s.standardId].compliant++;
        const score = (s.metRequirements / s.totalRequirements) * 100;
        byStandard[s.standardId].scores.push(score);
      });
    });

    Object.values(byStandard).forEach((data) => {
      data.avgScore = data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0;
      delete data.scores;
    });

    return {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period,
      summary: {
        totalAssessments: assessments.length,
        compliantAssessments: assessments.filter((a) => a.overallCompliant).length,
        avgComplianceScore: assessments.length > 0
          ? Math.round(assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length)
          : 0,
        openViolations: violations.length,
        resolvedViolations: resolved.length,
        criticalViolations: violations.filter((v) => v.severity === 'critical').length,
      },
      byStandard,
      topViolations: violations
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 10),
      recommendations: this.generateRecommendations(violations),
    };
  }

  generateRecommendations(violations) {
    const categories = {};
    violations.forEach((v) => {
      if (!categories[v.category]) {
        categories[v.category] = { count: 0, items: [] };
      }
      categories[v.category].count++;
      categories[v.category].items.push(v);
    });

    return Object.entries(categories)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([category, data]) => ({
        category,
        violationCount: data.count,
        priority: data.items.some((v) => v.severity === 'critical') ? 'critical' : 'high',
        recommendation: `Address ${data.count} ${category} violations`,
        affectedContracts: [...new Set(data.items.map((v) => v.contractName))],
      }));
  }

  // ============================================================================
  // Continuous Monitoring
  // ============================================================================

  scheduleAssessment(contractName, intervalMs, callback) {
    const interval = setInterval(async () => {
      try {
        // In a real implementation, this would load the contract
        // For now, callback provides the contract
        const contract = await callback();
        if (contract) {
          const result = this.assessContract(contract);
          if (!result.overallCompliant) {
            this.emitAlert({
              type: 'compliance_drift',
              contract: contractName,
              assessment: result,
            });
          }
        }
      } catch (error) {
        this.emitAlert({
          type: 'assessment_error',
          contract: contractName,
          error: error.message,
        });
      }
    }, intervalMs);

    return { stop: () => clearInterval(interval) };
  }

  emitAlert(alert) {
    // In a real implementation, this would integrate with alerting systems
    console.warn('Compliance Alert:', JSON.stringify(alert, null, 2));
  }
}

module.exports = {
  ComplianceEngine,
  COMPLIANCE_STANDARDS,
};
