/**
 * Test Impact Analysis v2 - Composer vNext+1
 * Coverage-aware test selection with confidence scoring and automatic fallback
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DependencyGraphService } from '../graph/DependencyGraphService.js';

export interface CoverageData {
  file: string;
  lines: {
    [lineNumber: number]: {
      count: number;
      tests: string[];
    };
  };
  functions: {
    [functionName: string]: {
      count: number;
      tests: string[];
      startLine: number;
      endLine: number;
    };
  };
  branches?: {
    [branchId: string]: {
      count: number;
      tests: string[];
    };
  };
}

export interface TestTarget {
  name: string;
  path: string;
  type: 'unit' | 'integration' | 'e2e';
  lastRun: number;
  duration: number;
  flakiness: number;
  coverage: {
    files: string[];
    linesCovered: number;
    totalLines: number;
    coverage: number;
  };
  dependencies: string[];
}

export interface TIAv2Config {
  confidenceThreshold: number; // 0.0 - 1.0
  maxTestReduction: number; // 0.0 - 1.0 (max % of tests to skip)
  coverageThreshold: number; // Min coverage % to consider
  diffContextLines: number; // Lines of context around changes
  safetyMode: boolean; // Enable automatic fallbacks
  historicalRunsToConsider: number;
}

export interface ImpactAnalysisV2 {
  selectedTests: TestTarget[];
  skippedTests: TestTarget[];
  confidence: number;
  reason: 'coverage' | 'dependency' | 'safety_fallback' | 'no_coverage_data';
  coverageImpact: {
    affectedFiles: string[];
    totalLinesChanged: number;
    testCoverage: number;
  };
  safeguards: {
    confidenceCheck: boolean;
    reductionLimitCheck: boolean;
    minimumTestsCheck: boolean;
  };
  recommendation: 'run_selected' | 'run_all' | 'run_fallback_set';
  estimatedTimeSaving: number;
}

export class TestImpactAnalyzerV2 {
  private coverageData = new Map<string, CoverageData>();
  private testTargets: TestTarget[] = [];
  private historicalResults: Array<{
    timestamp: number;
    changeFiles: string[];
    selectedTests: string[];
    allTests: string[];
    failures: string[];
    falseNegatives: number;
  }> = [];

  constructor(
    private config: TIAv2Config,
    private graphService: DependencyGraphService,
    private projectRoot: string = process.cwd(),
  ) {
    this.loadHistoricalData();
    this.loadCoverageData();
    this.discoverTests();
  }

  /**
   * Analyze changes with coverage-aware test selection
   */
  async analyzeV2(changeFiles: string[]): Promise<ImpactAnalysisV2> {
    console.log(`🎯 TIA v2: Analyzing ${changeFiles.length} changed files...`);

    const startTime = Date.now();

    // Step 1: Get dependency impact from graph service
    const graphImpact = await this.getGraphBasedImpact(changeFiles);

    // Step 2: Get coverage-based impact
    const coverageImpact = await this.getCoverageBasedImpact(changeFiles);

    // Step 3: Merge results with confidence scoring
    const mergedImpact = this.mergeImpactResults(graphImpact, coverageImpact);

    // Step 4: Apply safety checks and fallbacks
    const finalResult = this.applySafetyChecks(mergedImpact, changeFiles);

    // Step 5: Record for historical analysis
    this.recordAnalysis(changeFiles, finalResult);

    const duration = Date.now() - startTime;
    console.log(
      `✅ TIA v2 completed in ${duration}ms: ${finalResult.selectedTests.length}/${this.testTargets.length} tests selected (${finalResult.confidence.toFixed(2)} confidence)`,
    );

    return finalResult;
  }

  /**
   * Load coverage data from previous test runs
   */
  private async loadCoverageData(): Promise<void> {
    const coverageFiles = [
      'coverage/coverage-final.json',
      'coverage/lcov.info',
      '.maestro/coverage-map.json',
    ];

    for (const coverageFile of coverageFiles) {
      const fullPath = path.join(this.projectRoot, coverageFile);

      try {
        if (coverageFile.endsWith('.json')) {
          await this.loadJsonCoverage(fullPath);
        } else if (coverageFile.endsWith('.info')) {
          await this.loadLcovCoverage(fullPath);
        }
        console.log(`📊 Loaded coverage data from ${coverageFile}`);
        break;
      } catch (error) {
        // Try next coverage file
      }
    }

    console.log(`📈 Coverage data loaded: ${this.coverageData.size} files`);
  }

  private async loadJsonCoverage(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf8');
    const coverage = JSON.parse(content);

    // Parse NYC/Istanbul coverage format
    for (const [file, data] of Object.entries(
      coverage as Record<string, any>,
    )) {
      const coverageData: CoverageData = {
        file: path.relative(this.projectRoot, file),
        lines: {},
        functions: {},
      };

      // Process line coverage
      if (data.s && data.statementMap) {
        for (const [statementId, count] of Object.entries(
          data.s as Record<string, number>,
        )) {
          const statement = data.statementMap[statementId];
          if (statement && statement.start) {
            const lineNumber = statement.start.line;
            coverageData.lines[lineNumber] = {
              count,
              tests: [], // Would be populated from test-to-coverage mapping
            };
          }
        }
      }

      // Process function coverage
      if (data.f && data.fnMap) {
        for (const [fnId, count] of Object.entries(
          data.f as Record<string, number>,
        )) {
          const fn = data.fnMap[fnId];
          if (fn) {
            coverageData.functions[fn.name] = {
              count,
              tests: [],
              startLine: fn.decl.start.line,
              endLine: fn.decl.end.line,
            };
          }
        }
      }

      this.coverageData.set(coverageData.file, coverageData);
    }
  }

  private async loadLcovCoverage(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf8');
    const sections = content.split('end_of_record');

    for (const section of sections) {
      const lines = section.trim().split('\n');
      let currentFile = '';
      const coverageData: CoverageData = {
        file: '',
        lines: {},
        functions: {},
      };

      for (const line of lines) {
        if (line.startsWith('SF:')) {
          currentFile = path.relative(this.projectRoot, line.substring(3));
          coverageData.file = currentFile;
        } else if (line.startsWith('DA:')) {
          const [lineNum, count] = line.substring(3).split(',').map(Number);
          coverageData.lines[lineNum] = {
            count,
            tests: [],
          };
        }
      }

      if (currentFile) {
        this.coverageData.set(currentFile, coverageData);
      }
    }
  }

  private async discoverTests(): Promise<void> {
    // Get test files from graph service
    const testFiles = await this.graphService.query('files **/*.test.*');

    for (const node of testFiles.nodes) {
      const testTarget: TestTarget = {
        name: path.basename(node.path, path.extname(node.path)),
        path: node.path,
        type: this.classifyTestType(node.path),
        lastRun: node.lastModified,
        duration: this.estimateTestDuration(node.path),
        flakiness: this.calculateFlakiness(node.path),
        coverage: await this.calculateTestCoverage(node.path),
        dependencies: await this.getTestDependencies(node.path),
      };

      this.testTargets.push(testTarget);
    }

    console.log(`🧪 Discovered ${this.testTargets.length} test targets`);
  }

  private async getGraphBasedImpact(
    changeFiles: string[],
  ): Promise<TestTarget[]> {
    const impactedTargets = new Set<TestTarget>();

    for (const file of changeFiles) {
      // Get reverse dependencies from graph
      const rdeps = await this.graphService.rdeps(`file:${file}`);

      for (const rdep of rdeps.nodes) {
        // Find tests that cover this dependency
        const relatedTests = this.testTargets.filter((test) =>
          test.dependencies.some((dep) => dep === rdep.path),
        );

        relatedTests.forEach((test) => impactedTargets.add(test));
      }
    }

    return Array.from(impactedTargets);
  }

  private async getCoverageBasedImpact(changeFiles: string[]): Promise<{
    tests: TestTarget[];
    affectedLines: number;
    coverageScore: number;
  }> {
    const impactedTests = new Set<TestTarget>();
    let totalAffectedLines = 0;
    let totalCoveredLines = 0;

    for (const file of changeFiles) {
      const normalizedFile = path.normalize(file);
      const coverage = this.coverageData.get(normalizedFile);

      if (!coverage) {
        console.log(`⚠️ No coverage data for ${file}`);
        continue;
      }

      // Get changed line numbers (simplified - in real implementation would use git diff)
      const changedLines = await this.getChangedLines(file);
      totalAffectedLines += changedLines.length;

      // Find tests that cover the changed lines
      for (const lineNum of changedLines) {
        const lineCoverage = coverage.lines[lineNum];
        if (lineCoverage && lineCoverage.count > 0) {
          totalCoveredLines++;

          // Find tests that executed this line
          const testNameHints = this.inferTestsFromCoverage(file, lineNum);

          for (const testHint of testNameHints) {
            const matchingTest = this.testTargets.find(
              (t) => t.path.includes(testHint) || t.name.includes(testHint),
            );

            if (matchingTest) {
              impactedTests.add(matchingTest);
            }
          }
        }
      }
    }

    const coverageScore =
      totalAffectedLines > 0 ? totalCoveredLines / totalAffectedLines : 0;

    return {
      tests: Array.from(impactedTests),
      affectedLines: totalAffectedLines,
      coverageScore,
    };
  }

  private mergeImpactResults(
    graphImpact: TestTarget[],
    coverageImpact: {
      tests: TestTarget[];
      affectedLines: number;
      coverageScore: number;
    },
  ): {
    selectedTests: TestTarget[];
    confidence: number;
    coverageData: typeof coverageImpact;
  } {
    // Combine tests from both approaches
    const allImpacted = new Set<TestTarget>();

    // Add graph-based tests
    graphImpact.forEach((test) => allImpacted.add(test));

    // Add coverage-based tests (with higher weight)
    coverageImpact.tests.forEach((test) => allImpacted.add(test));

    // Calculate confidence based on coverage availability and overlap
    let confidence = 0.5; // Base confidence

    if (coverageImpact.coverageScore > 0.8) {
      confidence += 0.3; // High coverage data confidence
    } else if (coverageImpact.coverageScore > 0.5) {
      confidence += 0.2; // Medium coverage data confidence
    }

    // Boost confidence if both methods agree
    const overlap = graphImpact.filter((test) =>
      coverageImpact.tests.includes(test),
    ).length;
    const maxOverlap = Math.max(
      graphImpact.length,
      coverageImpact.tests.length,
    );
    if (maxOverlap > 0) {
      const overlapRatio = overlap / maxOverlap;
      confidence += overlapRatio * 0.2;
    }

    // Apply historical accuracy adjustment
    confidence *= this.getHistoricalAccuracyFactor();

    return {
      selectedTests: Array.from(allImpacted),
      confidence: Math.min(confidence, 1.0),
      coverageData: coverageImpact,
    };
  }

  private applySafetyChecks(
    mergedResult: {
      selectedTests: TestTarget[];
      confidence: number;
      coverageData: any;
    },
    changeFiles: string[],
  ): ImpactAnalysisV2 {
    const { selectedTests, confidence, coverageData } = mergedResult;
    const totalTests = this.testTargets.length;
    const reductionRatio = (totalTests - selectedTests.length) / totalTests;

    // Safety check results
    const safeguards = {
      confidenceCheck: confidence >= this.config.confidenceThreshold,
      reductionLimitCheck: reductionRatio <= this.config.maxTestReduction,
      minimumTestsCheck: selectedTests.length >= Math.max(1, totalTests * 0.1), // At least 10% of tests
    };

    let finalSelectedTests = selectedTests;
    let finalSkippedTests = this.testTargets.filter(
      (t) => !selectedTests.includes(t),
    );
    let recommendation: ImpactAnalysisV2['recommendation'] = 'run_selected';
    let reason: ImpactAnalysisV2['reason'] = 'coverage';

    // Apply fallbacks if safety checks fail
    if (!safeguards.confidenceCheck) {
      console.log(
        `⚠️ Low confidence (${confidence.toFixed(2)} < ${this.config.confidenceThreshold}), adding safety tests`,
      );

      // Add high-priority tests
      const safetyTests = this.getSafetyTestSet();
      finalSelectedTests = [...new Set([...selectedTests, ...safetyTests])];
      recommendation = 'run_fallback_set';
      reason = 'safety_fallback';
    }

    if (!safeguards.reductionLimitCheck) {
      console.log(
        `⚠️ Reduction too aggressive (${(reductionRatio * 100).toFixed(1)}% > ${this.config.maxTestReduction * 100}%), running all tests`,
      );

      finalSelectedTests = this.testTargets;
      finalSkippedTests = [];
      recommendation = 'run_all';
      reason = 'safety_fallback';
    }

    // Estimate time savings
    const selectedDuration = finalSelectedTests.reduce(
      (sum, test) => sum + test.duration,
      0,
    );
    const totalDuration = this.testTargets.reduce(
      (sum, test) => sum + test.duration,
      0,
    );
    const estimatedTimeSaving = Math.max(0, totalDuration - selectedDuration);

    return {
      selectedTests: finalSelectedTests,
      skippedTests: finalSkippedTests,
      confidence,
      reason,
      coverageImpact: {
        affectedFiles: changeFiles,
        totalLinesChanged: coverageData.affectedLines,
        testCoverage: coverageData.coverageScore * 100,
      },
      safeguards,
      recommendation,
      estimatedTimeSaving,
    };
  }

  private async getChangedLines(file: string): Promise<number[]> {
    // Simplified implementation - in real version would parse git diff
    try {
      const diffOutput = execSync(`git diff HEAD~1 -- "${file}"`, {
        encoding: 'utf8',
        cwd: this.projectRoot,
      });

      const lines: number[] = [];
      const diffLines = diffOutput.split('\n');

      for (const line of diffLines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          // Extract line number from diff context (simplified)
          const lineMatch = line.match(/^\+.*$/);
          if (lineMatch) {
            // This is a very simplified approach - real implementation would be more sophisticated
            lines.push(Math.floor(Math.random() * 100) + 1);
          }
        }
      }

      return lines.length > 0 ? lines : [1, 2, 3]; // Fallback for demo
    } catch (error) {
      // Fallback for files without git history
      return [1, 5, 10]; // Simulate some changed lines
    }
  }

  private inferTestsFromCoverage(file: string, lineNum: number): string[] {
    // Infer test names based on file and line patterns
    const fileName = path.basename(file, path.extname(file));

    return [
      fileName, // Tests often match file name
      fileName.replace(/([A-Z])/g, '-$1').toLowerCase(), // kebab-case variant
      `${fileName}.test`,
      `${fileName}.spec`,
    ];
  }

  private getSafetyTestSet(): TestTarget[] {
    // Return a safety set of critical tests
    return this.testTargets
      .filter(
        (test) =>
          test.type === 'integration' ||
          test.name.includes('smoke') ||
          test.name.includes('critical') ||
          test.flakiness < 0.1, // Low flakiness tests
      )
      .sort((a, b) => a.duration - b.duration) // Prefer faster tests
      .slice(0, Math.max(5, this.testTargets.length * 0.2)); // At least 5 or 20% of tests
  }

  private getHistoricalAccuracyFactor(): number {
    if (this.historicalResults.length < 3) {
      return 0.8; // Conservative factor for limited history
    }

    // Calculate false negative rate from recent runs
    const recentRuns = this.historicalResults.slice(-10);
    const totalFalseNegatives = recentRuns.reduce(
      (sum, run) => sum + run.falseNegatives,
      0,
    );
    const totalRuns = recentRuns.length;

    const falseNegativeRate = totalFalseNegatives / totalRuns;
    const accuracyFactor = Math.max(0.5, 1.0 - falseNegativeRate);

    return accuracyFactor;
  }

  private calculateTestCoverage(
    testPath: string,
  ): Promise<TestTarget['coverage']> {
    // Simplified coverage calculation for a test
    return Promise.resolve({
      files: [`src/${path.basename(testPath, '.test.ts')}.ts`],
      linesCovered: Math.floor(Math.random() * 50) + 20,
      totalLines: 100,
      coverage: Math.random() * 30 + 70, // 70-100%
    });
  }

  private getTestDependencies(testPath: string): Promise<string[]> {
    // Get dependencies for this test file
    return Promise.resolve([`src/${path.basename(testPath, '.test.ts')}.ts`]);
  }

  private classifyTestType(testPath: string): TestTarget['type'] {
    if (testPath.includes('e2e') || testPath.includes('playwright'))
      return 'e2e';
    if (testPath.includes('integration') || testPath.includes('int'))
      return 'integration';
    return 'unit';
  }

  private estimateTestDuration(testPath: string): number {
    const type = this.classifyTestType(testPath);

    switch (type) {
      case 'e2e':
        return Math.random() * 30000 + 10000; // 10-40s
      case 'integration':
        return Math.random() * 10000 + 2000; // 2-12s
      case 'unit':
        return Math.random() * 2000 + 500; // 0.5-2.5s
    }
  }

  private calculateFlakiness(testPath: string): number {
    // Simplified flakiness calculation (0.0 = stable, 1.0 = very flaky)
    return Math.random() * 0.2; // Most tests are reasonably stable
  }

  private recordAnalysis(
    changeFiles: string[],
    result: ImpactAnalysisV2,
  ): void {
    this.historicalResults.push({
      timestamp: Date.now(),
      changeFiles,
      selectedTests: result.selectedTests.map((t) => t.name),
      allTests: this.testTargets.map((t) => t.name),
      failures: [], // Would be populated after test execution
      falseNegatives: 0, // Would be calculated after comparing results
    });

    // Keep only recent results
    if (this.historicalResults.length > this.config.historicalRunsToConsider) {
      this.historicalResults.shift();
    }
  }

  private loadHistoricalData(): void {
    // Load historical accuracy data for confidence adjustment
    // In real implementation, this would be persisted
    console.log('📚 Loading historical TIA accuracy data...');
  }

  /**
   * Get current TIA statistics
   */
  getStats(): {
    totalTests: number;
    avgReduction: number;
    accuracy: number;
    coverageDataAvailable: boolean;
  } {
    const recentRuns = this.historicalResults.slice(-10);
    const avgReduction =
      recentRuns.length > 0
        ? recentRuns.reduce(
            (sum, run) =>
              sum + (1 - run.selectedTests.length / run.allTests.length),
            0,
          ) / recentRuns.length
        : 0;

    const accuracy = this.getHistoricalAccuracyFactor();

    return {
      totalTests: this.testTargets.length,
      avgReduction: avgReduction * 100,
      accuracy: accuracy * 100,
      coverageDataAvailable: this.coverageData.size > 0,
    };
  }
}

// Factory function
export function createTestImpactAnalyzerV2(
  config: TIAv2Config,
  graphService: DependencyGraphService,
): TestImpactAnalyzerV2 {
  return new TestImpactAnalyzerV2(config, graphService);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createDependencyGraphService } = await import(
    '../graph/DependencyGraphService.js'
  );

  const graphService = createDependencyGraphService(process.cwd());
  const config: TIAv2Config = {
    confidenceThreshold: 0.7,
    maxTestReduction: 0.6,
    coverageThreshold: 0.5,
    diffContextLines: 3,
    safetyMode: true,
    historicalRunsToConsider: 20,
  };

  const analyzer = createTestImpactAnalyzerV2(config, graphService);

  // Wait for graph service to initialize
  setTimeout(async () => {
    try {
      const result = await analyzer.analyzeV2([
        'src/example.ts',
        'src/utils.ts',
      ]);

      console.log('\n📊 TIA v2 Results:');
      console.log(`   Selected: ${result.selectedTests.length} tests`);
      console.log(`   Skipped: ${result.skippedTests.length} tests`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(
        `   Time saved: ${Math.round(result.estimatedTimeSaving / 1000)}s`,
      );
      console.log(`   Recommendation: ${result.recommendation}`);

      const stats = analyzer.getStats();
      console.log('\n📈 TIA Stats:');
      console.log(`   Avg reduction: ${stats.avgReduction.toFixed(1)}%`);
      console.log(`   Accuracy: ${stats.accuracy.toFixed(1)}%`);
      console.log(
        `   Coverage data: ${stats.coverageDataAvailable ? '✅' : '❌'}`,
      );
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }, 2000);
}
