import { describe, it, expect, beforeEach } from '@jest/globals';
import { SupplyChainRiskEngine } from '../SupplyChainRiskEngine';
import { SBOMParser } from '../SBOMParser';
import { VulnerabilityService } from '../VulnerabilityService';
import { ContractAnalyzer } from '../ContractAnalyzer';
import { Vendor } from '../types';

describe('SupplyChainRiskEngine', () => {
  let engine: SupplyChainRiskEngine;
  let mockVendor: Vendor;

  beforeEach(() => {
    engine = new SupplyChainRiskEngine();
    mockVendor = {
      id: 'v1',
      name: 'Acme Corp',
      domain: 'acme.com',
      tier: 'strategic',
      status: 'active',
      complianceStatus: {
        soc2: true,
        iso27001: true,
        gdpr: true,
      },
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };
  });

  it('should calculate perfect score for safe vendor', () => {
    const score = engine.calculateScore(mockVendor, [], {
      id: 'c1',
      vendorId: 'v1',
      hasIndemnification: true,
      hasSLA: true,
      hasSecurityRequirements: true,
      hasIncidentReporting: true,
      riskFactors: [],
      analyzedAt: '2023-01-01',
    });

    expect(score.overallScore).toBe(100);
    expect(score.riskLevel).toBe('low');
  });

  it('should penalize for missing compliance', () => {
    mockVendor.complianceStatus.soc2 = false;
    const score = engine.calculateScore(mockVendor, [], {
        id: 'c1',
        vendorId: 'v1',
        hasIndemnification: true,
        hasSLA: true,
        hasSecurityRequirements: true,
        hasIncidentReporting: true,
        riskFactors: [],
        analyzedAt: '2023-01-01',
    });

    expect(score.overallScore).toBeLessThan(100);
    expect(score.breakdown.complianceRisk).toBeGreaterThan(0);
  });
});

describe('SBOMParser', () => {
  const parser = new SBOMParser();

  it('should parse simple JSON', async () => {
    const json = {
      components: [
        { name: 'lib-a', version: '1.0.0', purl: 'pkg:npm/lib-a@1.0.0' }
      ]
    };
    const result = await parser.parse(json, 'v1', 'ProductA', '1.0');
    expect(result.components).toHaveLength(1);
    expect(result.components[0].name).toBe('lib-a');
  });
});

describe('VulnerabilityService', () => {
    const service = new VulnerabilityService();

    it('should detect known vulnerabilities', async () => {
        const components = [
            { name: 'log4j-core', version: '2.14.1' }, // Known vulnerable
            { name: 'safe-lib', version: '1.0.0' }
        ];
        const findings = await service.scanComponents(components);
        expect(findings).toHaveLength(1);
        expect(findings[0].cveId).toBe('CVE-2021-44228');
    });
});
