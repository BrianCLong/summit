/**
 * TraceMesh - Spec ↔ Test Traceability System
 * Ensures every change is traceable from spec → tests → code → evidence
 */

import { EventEmitter } from 'events';

export interface SpecCard {
  id: string;
  given: string;
  when: string;
  then: string;
  acceptance: string;
  linkedTests: string[];
  evidenceLinks: string[];
  prId: string;
  timestamp: number;
}

export interface TestBinding {
  testFile: string;
  testFunction: string;
  specId: string;
  coverageMetrics: {
    linesCovered: number;
    totalLines: number;
    branchesCovered: number;
    totalBranches: number;
  };
}

export interface EvidenceBundle {
  id: string;
  prId: string;
  specCards: SpecCard[];
  testBindings: TestBinding[];
  decisionCards: string[];
  riskAssessments: string[];
  evaluationResults: string[];
  invariantChecks: string[];
  timestamp: number;
  merkleRoot: string;
}

export interface SpecCoverageResult {
  coverage: number;
  missingSpecs: string[];
  orphanedTests: string[];
  recommendations: string[];
}

export class TraceMesh extends EventEmitter {
  private specRegistry: Map<string, SpecCard> = new Map();
  private testBindings: Map<string, TestBinding[]> = new Map();
  private evidenceBundles: Map<string, EvidenceBundle> = new Map();
  private specIdCounter: number = 1000;

  constructor() {
    super();
  }

  /**
   * Generate Spec Cards from PR data using SpecSynth
   */
  async generateSpecCards(prData: {
    id: string;
    files: string[];
    description: string;
    author: string;
    branch: string;
  }): Promise<SpecCard[]> {
    const specCards: SpecCard[] = [];

    // Analyze PR files to determine required specifications
    for (const file of prData.files) {
      const specs = await this.analyzeFileForSpecs(file, prData);
      specCards.push(...specs);
    }

    // Store in registry
    for (const spec of specCards) {
      this.specRegistry.set(spec.id, spec);
    }

    this.emit('specCardsGenerated', {
      prId: prData.id,
      count: specCards.length,
    });
    return specCards;
  }

  private async analyzeFileForSpecs(
    file: string,
    prData: any,
  ): Promise<SpecCard[]> {
    const specs: SpecCard[] = [];

    // Generate specs based on file type and content
    if (file.includes('api/') || file.includes('service/')) {
      // API/Service specs
      specs.push({
        id: `SPEC-${this.specIdCounter++}`,
        given: `A request to the ${this.extractServiceName(file)} service`,
        when: `The service processes the request`,
        then: `The response should meet SLA requirements`,
        acceptance: `Response time ≤ 250ms p95, error rate ≤ 0.1%`,
        linkedTests: [],
        evidenceLinks: [],
        prId: prData.id,
        timestamp: Date.now(),
      });
    }

    if (file.includes('auth/') || file.includes('security/')) {
      // Security specs
      specs.push({
        id: `SPEC-${this.specIdCounter++}`,
        given: `Authentication/authorization requirements`,
        when: `A user attempts to access protected resources`,
        then: `Access should be properly controlled`,
        acceptance: `All access attempts logged, unauthorized attempts blocked`,
        linkedTests: [],
        evidenceLinks: [],
        prId: prData.id,
        timestamp: Date.now(),
      });
    }

    if (file.includes('retry') || file.includes('circuit')) {
      // Resilience specs
      specs.push({
        id: `SPEC-${this.specIdCounter++}`,
        given: `System under load or experiencing failures`,
        when: `Retry logic is triggered`,
        then: `System should retry within jitter budget`,
        acceptance: `Max 3 retries within 2s, exponential backoff`,
        linkedTests: [],
        evidenceLinks: [],
        prId: prData.id,
        timestamp: Date.now(),
      });
    }

    if (file.includes('test')) {
      // Test quality specs
      specs.push({
        id: `SPEC-${this.specIdCounter++}`,
        given: `Test suite for changed functionality`,
        when: `Tests are executed`,
        then: `Tests should provide adequate coverage`,
        acceptance: `Line coverage ≥ 85%, mutation score ≥ 0.7`,
        linkedTests: [],
        evidenceLinks: [],
        prId: prData.id,
        timestamp: Date.now(),
      });
    }

    return specs;
  }

  private extractServiceName(file: string): string {
    const parts = file.split('/');
    return parts[parts.length - 1].replace(/\.(ts|js|py)$/, '');
  }

  /**
   * Verify spec coverage for changed files
   */
  async verifySpecCoverage(
    files: string[],
    specCards: SpecCard[],
  ): Promise<SpecCoverageResult> {
    const coverage = await this.calculateSpecCoverage(files, specCards);
    const missingSpecs = await this.findMissingSpecs(files, specCards);
    const orphanedTests = await this.findOrphanedTests(files);
    const recommendations = this.generateCoverageRecommendations(
      missingSpecs,
      orphanedTests,
    );

    const result: SpecCoverageResult = {
      coverage,
      missingSpecs,
      orphanedTests,
      recommendations,
    };

    if (coverage < 0.95) {
      this.emit('specCoverageInsufficient', result);
    }

    return result;
  }

  private async calculateSpecCoverage(
    files: string[],
    specCards: SpecCard[],
  ): Promise<number> {
    // Calculate coverage based on critical files vs spec cards
    const criticalFiles = files.filter(
      (f) =>
        f.includes('api/') ||
        f.includes('service/') ||
        f.includes('auth/') ||
        f.includes('security/'),
    );

    if (criticalFiles.length === 0) return 1.0; // No critical files = 100% coverage

    const specsPerFile = specCards.length / criticalFiles.length;
    const expectedSpecs = criticalFiles.length * 1.2; // Expect at least 1.2 specs per critical file

    return Math.min(1.0, specCards.length / expectedSpecs);
  }

  private async findMissingSpecs(
    files: string[],
    specCards: SpecCard[],
  ): Promise<string[]> {
    const missingSpecs: string[] = [];

    // Check for files that should have specs but don't
    for (const file of files) {
      const relevantSpecs = specCards.filter(
        (spec) =>
          spec.given
            .toLowerCase()
            .includes(this.extractServiceName(file).toLowerCase()) ||
          spec.when
            .toLowerCase()
            .includes(this.extractServiceName(file).toLowerCase()),
      );

      if (this.isCriticalFile(file) && relevantSpecs.length === 0) {
        missingSpecs.push(`Missing spec for critical file: ${file}`);
      }
    }

    return missingSpecs;
  }

  private async findOrphanedTests(files: string[]): Promise<string[]> {
    // Mock implementation - in reality would scan test files for @spec annotations
    const orphanedTests: string[] = [];

    for (const file of files) {
      if (file.includes('test') || file.includes('spec')) {
        // Check if test file has proper spec bindings
        const hasSpecBindings = await this.checkTestSpecBindings(file);
        if (!hasSpecBindings) {
          orphanedTests.push(file);
        }
      }
    }

    return orphanedTests;
  }

  private async checkTestSpecBindings(testFile: string): Promise<boolean> {
    // Mock implementation - would scan for @spec annotations
    // /** @spec SPEC-142 */
    // test('retries up to jitter budget', () => { ... });
    return Math.random() > 0.1; // 90% chance of having proper bindings
  }

  private isCriticalFile(file: string): boolean {
    return (
      file.includes('api/') ||
      file.includes('service/') ||
      file.includes('auth/') ||
      file.includes('security/') ||
      file.includes('policy/')
    );
  }

  private generateCoverageRecommendations(
    missingSpecs: string[],
    orphanedTests: string[],
  ): string[] {
    const recommendations: string[] = [];

    if (missingSpecs.length > 0) {
      recommendations.push(
        `Generate ${missingSpecs.length} missing spec cards for critical functionality`,
      );
    }

    if (orphanedTests.length > 0) {
      recommendations.push(
        `Add @spec annotations to ${orphanedTests.length} test files`,
      );
    }

    if (missingSpecs.length === 0 && orphanedTests.length === 0) {
      recommendations.push('Spec coverage is complete - good job!');
    }

    return recommendations;
  }

  /**
   * Bind tests to spec cards
   */
  async bindTestsToSpecs(prId: string): Promise<TestBinding[]> {
    const bindings: TestBinding[] = [];
    const specs = Array.from(this.specRegistry.values()).filter(
      (s) => s.prId === prId,
    );

    for (const spec of specs) {
      const testBinding = await this.findTestsForSpec(spec);
      if (testBinding) {
        bindings.push(testBinding);
        this.linkTestToSpec(spec.id, testBinding);
      }
    }

    // Store bindings
    this.testBindings.set(prId, bindings);
    this.emit('testsBindToSpecs', { prId, bindingCount: bindings.length });

    return bindings;
  }

  private async findTestsForSpec(spec: SpecCard): Promise<TestBinding | null> {
    // Mock implementation - would scan test files for spec references
    const serviceName = this.extractServiceFromSpec(spec);

    return {
      testFile: `tests/${serviceName}.spec.ts`,
      testFunction: `test_${serviceName}_${spec.id.toLowerCase()}`,
      specId: spec.id,
      coverageMetrics: {
        linesCovered: Math.floor(Math.random() * 100) + 50,
        totalLines: Math.floor(Math.random() * 50) + 100,
        branchesCovered: Math.floor(Math.random() * 20) + 10,
        totalBranches: Math.floor(Math.random() * 10) + 20,
      },
    };
  }

  private extractServiceFromSpec(spec: SpecCard): string {
    // Extract service name from spec content
    const words = spec.given.toLowerCase().split(' ');
    return (
      words.find((w) => w.includes('service') || w.includes('api')) || 'generic'
    );
  }

  private linkTestToSpec(specId: string, binding: TestBinding): void {
    const spec = this.specRegistry.get(specId);
    if (spec && !spec.linkedTests.includes(binding.testFile)) {
      spec.linkedTests.push(binding.testFile);
    }
  }

  /**
   * Generate evidence bundle for release
   */
  async generateEvidenceBundle(
    prId: string,
    specCards: SpecCard[],
  ): Promise<string[]> {
    const bundle: EvidenceBundle = {
      id: `EB-${prId}-${Date.now()}`,
      prId,
      specCards,
      testBindings: this.testBindings.get(prId) || [],
      decisionCards: [], // Will be populated by caller
      riskAssessments: [],
      evaluationResults: [],
      invariantChecks: [],
      timestamp: Date.now(),
      merkleRoot: '',
    };

    // Generate Merkle root for tamper-evident evidence
    bundle.merkleRoot = await this.generateMerkleRoot(bundle);

    // Store bundle
    this.evidenceBundles.set(bundle.id, bundle);

    // Return evidence links
    const evidenceLinks = [
      `evidence/specs/${bundle.id}.json`,
      `evidence/tests/${bundle.id}.json`,
      `evidence/merkle/${bundle.merkleRoot}`,
    ];

    this.emit('evidenceBundleGenerated', {
      prId,
      bundleId: bundle.id,
      links: evidenceLinks,
    });
    return evidenceLinks;
  }

  private async generateMerkleRoot(bundle: EvidenceBundle): Promise<string> {
    // Simple hash-based Merkle root calculation
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');

    hash.update(
      JSON.stringify({
        specCards: bundle.specCards.map((s) => s.id),
        testBindings: bundle.testBindings.map((t) => t.specId),
        timestamp: bundle.timestamp,
      }),
    );

    return hash.digest('hex');
  }

  /**
   * Verify evidence bundle integrity
   */
  async verifyEvidenceBundle(
    bundleId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const bundle = this.evidenceBundles.get(bundleId);
    if (!bundle) {
      return { valid: false, reason: 'Bundle not found' };
    }

    // Recalculate Merkle root
    const calculatedRoot = await this.generateMerkleRoot(bundle);
    if (calculatedRoot !== bundle.merkleRoot) {
      return {
        valid: false,
        reason: 'Merkle root mismatch - evidence may be tampered',
      };
    }

    // Verify spec-test linkage
    for (const spec of bundle.specCards) {
      if (spec.linkedTests.length === 0) {
        return { valid: false, reason: `Spec ${spec.id} has no linked tests` };
      }
    }

    return { valid: true };
  }

  /**
   * Get spec registry for debugging
   */
  getSpecRegistry(): Map<string, SpecCard> {
    return this.specRegistry;
  }

  /**
   * Get evidence bundle
   */
  getEvidenceBundle(bundleId: string): EvidenceBundle | undefined {
    return this.evidenceBundles.get(bundleId);
  }

  /**
   * Search specs by criteria
   */
  searchSpecs(criteria: {
    prId?: string;
    keyword?: string;
    dateRange?: { start: number; end: number };
  }): SpecCard[] {
    const specs = Array.from(this.specRegistry.values());

    return specs.filter((spec) => {
      if (criteria.prId && spec.prId !== criteria.prId) return false;
      if (criteria.keyword && !this.specContainsKeyword(spec, criteria.keyword))
        return false;
      if (
        criteria.dateRange &&
        (spec.timestamp < criteria.dateRange.start ||
          spec.timestamp > criteria.dateRange.end)
      )
        return false;
      return true;
    });
  }

  private specContainsKeyword(spec: SpecCard, keyword: string): boolean {
    const content =
      `${spec.given} ${spec.when} ${spec.then} ${spec.acceptance}`.toLowerCase();
    return content.includes(keyword.toLowerCase());
  }
}

export default TraceMesh;
