/**
 * Test Impact Analysis (TIA) - Composer vNext Sprint
 * Run only tests affected by changes with conservative fallbacks
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface ChangeSet {
  files: string[];
  commit?: string;
  base?: string;
}

export interface TestTarget {
  name: string;
  path: string;
  type: 'unit' | 'integration' | 'e2e';
  dependencies: string[];
  estimatedDuration: number;
}

export interface ImpactResult {
  impactedTests: TestTarget[];
  reason: 'changed' | 'dependency' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  recommendation: 'run_selected' | 'run_all' | 'run_fallback';
}

export class TestImpactAnalyzer {
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private testTargets: TestTarget[] = [];
  private packageBoundaries: Map<string, string[]> = new Map();

  constructor(private projectRoot: string = process.cwd()) {
    this.initializeAnalyzer();
  }

  private async initializeAnalyzer(): Promise<void> {
    console.log('🔍 Initializing Test Impact Analyzer...');

    await this.discoverTestTargets();
    await this.buildDependencyGraph();
    await this.mapPackageBoundaries();

    console.log(`📋 Discovered ${this.testTargets.length} test targets`);
    console.log(
      `🕸️  Mapped ${this.dependencyGraph.size} dependency relationships`,
    );
  }

  /**
   * Analyze impact of changes and return affected tests
   */
  async analyzeImpact(changeset: ChangeSet): Promise<ImpactResult> {
    console.log(
      `🎯 Analyzing impact for ${changeset.files.length} changed files...`,
    );

    const changedFiles = changeset.files.map((f) => this.normalizePath(f));
    const impactedTests = new Set<TestTarget>();
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let reason: 'changed' | 'dependency' | 'fallback' = 'changed';

    // Strategy 1: Direct test file changes
    for (const file of changedFiles) {
      if (this.isTestFile(file)) {
        const testTarget = this.findTestTarget(file);
        if (testTarget) {
          impactedTests.add(testTarget);
        }
      }
    }

    // Strategy 2: Source file changes -> related tests
    for (const file of changedFiles) {
      if (!this.isTestFile(file)) {
        const relatedTests = this.findTestsForSourceFile(file);
        relatedTests.forEach((test) => {
          impactedTests.add(test);
          if (reason === 'changed') reason = 'dependency';
        });
      }
    }

    // Strategy 3: Dependency graph traversal
    for (const file of changedFiles) {
      const dependentFiles = this.getDependentFiles(file);
      for (const dependent of dependentFiles) {
        const relatedTests = this.findTestsForSourceFile(dependent);
        relatedTests.forEach((test) => {
          impactedTests.add(test);
          if (reason !== 'fallback') reason = 'dependency';
        });
      }
    }

    // Fallback conditions
    const fallbackTriggers = this.checkFallbackConditions(changedFiles);
    if (fallbackTriggers.length > 0) {
      console.log(`⚠️  Fallback triggered: ${fallbackTriggers.join(', ')}`);
      return {
        impactedTests: this.testTargets,
        reason: 'fallback',
        confidence: 'low',
        recommendation: 'run_all',
      };
    }

    // Confidence assessment
    if (impactedTests.size === 0) {
      confidence = 'low';
      reason = 'fallback';
    } else if (impactedTests.size > this.testTargets.length * 0.7) {
      confidence = 'medium';
    }

    const result: ImpactResult = {
      impactedTests: Array.from(impactedTests),
      reason,
      confidence,
      recommendation: this.getRecommendation(
        impactedTests.size,
        this.testTargets.length,
      ),
    };

    this.logAnalysisResult(result);
    return result;
  }

  /**
   * Get changes from git diff
   */
  async getChangesFromGit(base: string = 'HEAD~1'): Promise<ChangeSet> {
    try {
      const gitOutput = execSync(`git diff --name-only ${base}`, {
        encoding: 'utf8',
        cwd: this.projectRoot,
      });

      const files = gitOutput
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);

      return {
        files,
        base,
        commit: execSync('git rev-parse HEAD', {
          encoding: 'utf8',
          cwd: this.projectRoot,
        }).trim(),
      };
    } catch (error) {
      console.warn('⚠️  Could not get git changes, using fallback');
      return { files: [] };
    }
  }

  private async discoverTestTargets(): Promise<void> {
    const testPatterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/test/**/*.ts',
      '**/tests/**/*.ts',
      '**/__tests__/**/*.ts',
    ];

    const testFiles: string[] = [];

    for (const pattern of testPatterns) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
      });
      testFiles.push(...matches);
    }

    // Deduplicate and create test targets
    const uniqueFiles = [...new Set(testFiles)];

    for (const file of uniqueFiles) {
      const fullPath = path.join(this.projectRoot, file);
      const stats = await fs.stat(fullPath).catch(() => null);

      if (stats) {
        const testTarget: TestTarget = {
          name: path.basename(file, path.extname(file)),
          path: file,
          type: this.classifyTestType(file),
          dependencies: await this.extractTestDependencies(file),
          estimatedDuration: this.estimateTestDuration(file, stats.size),
        };

        this.testTargets.push(testTarget);
      }
    }
  }

  private async buildDependencyGraph(): Promise<void> {
    // Simplified dependency analysis - in production this would be much more sophisticated
    const sourceFiles = await glob('**/*.{ts,js}', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    for (const file of sourceFiles) {
      const dependencies = await this.extractImports(file);
      this.dependencyGraph.set(file, new Set(dependencies));
    }
  }

  private async mapPackageBoundaries(): Promise<void> {
    // Find package.json files to understand module boundaries
    const packageFiles = await glob('**/package.json', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**'],
    });

    for (const pkgFile of packageFiles) {
      const pkgDir = path.dirname(pkgFile);
      const packageJson = JSON.parse(
        await fs.readFile(path.join(this.projectRoot, pkgFile), 'utf8'),
      );

      // Map files in this package
      const packageFiles = await glob('**/*.{ts,js}', {
        cwd: path.join(this.projectRoot, pkgDir),
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      this.packageBoundaries.set(
        packageJson.name || pkgDir,
        packageFiles.map((f) => path.join(pkgDir, f)),
      );
    }
  }

  private isTestFile(filePath: string): boolean {
    return (
      /\.(test|spec)\.(ts|js)$/.test(filePath) ||
      filePath.includes('/test/') ||
      filePath.includes('/tests/') ||
      filePath.includes('/__tests__/')
    );
  }

  private findTestTarget(filePath: string): TestTarget | undefined {
    return this.testTargets.find((target) => target.path === filePath);
  }

  private findTestsForSourceFile(sourceFile: string): TestTarget[] {
    const relatedTests: TestTarget[] = [];

    // Convention-based mapping
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const sourceDir = path.dirname(sourceFile);

    // Look for co-located test files
    const testPatterns = [
      `${baseName}.test.ts`,
      `${baseName}.test.js`,
      `${baseName}.spec.ts`,
      `${baseName}.spec.js`,
    ];

    for (const pattern of testPatterns) {
      const testPath = path.join(sourceDir, pattern);
      const testTarget = this.testTargets.find((t) =>
        t.path.endsWith(testPath),
      );
      if (testTarget) {
        relatedTests.push(testTarget);
      }
    }

    // Look in test directories
    const testDirs = ['test', 'tests', '__tests__'];
    for (const testDir of testDirs) {
      for (const pattern of testPatterns) {
        const testPath = path.join(sourceDir, testDir, pattern);
        const testTarget = this.testTargets.find((t) =>
          t.path.includes(testPath),
        );
        if (testTarget) {
          relatedTests.push(testTarget);
        }
      }
    }

    // Package-based mapping
    for (const [packageName, files] of this.packageBoundaries) {
      if (files.some((f) => f.includes(sourceFile))) {
        // Find tests in the same package
        const packageTests = this.testTargets.filter((t) =>
          files.some((f) => f.includes(t.path)),
        );
        relatedTests.push(...packageTests);
      }
    }

    return [...new Set(relatedTests)];
  }

  private getDependentFiles(file: string): string[] {
    const dependents: string[] = [];

    // Find files that import this file
    for (const [sourceFile, dependencies] of this.dependencyGraph) {
      if (dependencies.has(file)) {
        dependents.push(sourceFile);
      }
    }

    return dependents;
  }

  private checkFallbackConditions(changedFiles: string[]): string[] {
    const triggers: string[] = [];

    // Configuration file changes
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      'webpack.config.js',
      '.env',
    ];
    if (
      changedFiles.some((f) => configFiles.some((config) => f.endsWith(config)))
    ) {
      triggers.push('config_change');
    }

    // Core infrastructure changes
    if (
      changedFiles.some((f) => f.includes('build/') || f.includes('scripts/'))
    ) {
      triggers.push('build_infra_change');
    }

    // Large number of changes
    if (changedFiles.length > 50) {
      triggers.push('large_changeset');
    }

    // Unknown file types
    const knownExtensions = [
      '.ts',
      '.js',
      '.tsx',
      '.jsx',
      '.json',
      '.md',
      '.yml',
      '.yaml',
    ];
    if (
      changedFiles.some((f) => !knownExtensions.some((ext) => f.endsWith(ext)))
    ) {
      triggers.push('unknown_file_types');
    }

    return triggers;
  }

  private classifyTestType(file: string): 'unit' | 'integration' | 'e2e' {
    if (file.includes('e2e') || file.includes('integration')) {
      return file.includes('e2e') ? 'e2e' : 'integration';
    }
    return 'unit';
  }

  private async extractTestDependencies(file: string): Promise<string[]> {
    // Simplified - would use proper AST parsing in production
    try {
      const content = await fs.readFile(
        path.join(this.projectRoot, file),
        'utf8',
      );
      return this.extractImportsFromContent(content);
    } catch {
      return [];
    }
  }

  private async extractImports(file: string): Promise<string[]> {
    try {
      const content = await fs.readFile(
        path.join(this.projectRoot, file),
        'utf8',
      );
      return this.extractImportsFromContent(content);
    } catch {
      return [];
    }
  }

  private extractImportsFromContent(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        imports.push(importPath);
      }
    }

    return imports;
  }

  private estimateTestDuration(file: string, size: number): number {
    // Rough estimation based on file size and type
    const baseTime = 100; // 100ms base
    const sizeMultiplier = Math.max(1, size / 1000); // 1ms per KB

    if (file.includes('e2e')) return baseTime * 50 * sizeMultiplier;
    if (file.includes('integration')) return baseTime * 10 * sizeMultiplier;
    return baseTime * sizeMultiplier;
  }

  private getRecommendation(
    impactedCount: number,
    totalCount: number,
  ): 'run_selected' | 'run_all' | 'run_fallback' {
    const ratio = impactedCount / totalCount;

    if (ratio === 0) return 'run_fallback';
    if (ratio < 0.3) return 'run_selected';
    if (ratio < 0.7) return 'run_selected';
    return 'run_all';
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  private logAnalysisResult(result: ImpactResult): void {
    const total = this.testTargets.length;
    const impacted = result.impactedTests.length;
    const reduction = (((total - impacted) / total) * 100).toFixed(1);

    console.log('\n🎯 Test Impact Analysis Result');
    console.log('='.repeat(40));
    console.log(`Total tests: ${total}`);
    console.log(`Impacted tests: ${impacted}`);
    console.log(`Reduction: ${reduction}% (${total - impacted} tests skipped)`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Reason: ${result.reason}`);
    console.log(`Recommendation: ${result.recommendation}`);

    if (result.impactedTests.length > 0 && result.impactedTests.length < 10) {
      console.log('\nImpacted tests:');
      result.impactedTests.forEach((test) => {
        console.log(`  • ${test.name} (${test.type})`);
      });
    }
  }
}

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new TestImpactAnalyzer();

  analyzer.getChangesFromGit().then(async (changeset) => {
    const result = await analyzer.analyzeImpact(changeset);
    process.exit(result.recommendation === 'run_all' ? 1 : 0);
  });
}
