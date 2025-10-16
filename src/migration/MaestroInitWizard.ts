import { promises as fs } from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface RepositoryConfig {
  name: string;
  rootPath: string;
  buildSystem: 'bazel' | 'npm' | 'gradle' | 'maven' | 'cargo' | 'unknown';
  primaryLanguages: string[];
  testFrameworks: string[];
  ciProvider?: 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circle';
  monorepoType?: 'lerna' | 'nx' | 'rush' | 'bazel' | 'single';
}

export interface MigrationPlan {
  phase: 'discovery' | 'shadow' | 'validation' | 'cutover' | 'cleanup';
  steps: MigrationStep[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string[];
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  command: string;
  estimatedDuration: number;
  prerequisites: string[];
  validations: string[];
  rollbackCommands: string[];
}

export interface ShadowBuildResult {
  buildId: string;
  status: 'success' | 'failure' | 'timeout';
  duration: number;
  artifacts: string[];
  testResults: TestResult[];
  parityReport: ParityReport;
}

export interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: TestFailure[];
}

export interface TestFailure {
  test: string;
  message: string;
  stackTrace: string;
  category: 'flaky' | 'environmental' | 'determinism' | 'regression';
}

export interface ParityReport {
  artifactParity: {
    matching: string[];
    different: string[];
    missing: string[];
  };
  testParity: {
    passingInBoth: number;
    failingInBoth: number;
    passingOnlyInOriginal: number;
    passingOnlyInMaestro: number;
  };
  performanceParity: {
    buildTimeRatio: number;
    testTimeRatio: number;
    cacheHitRate: number;
  };
  determinismScore: number;
}

export interface MigrationProgress {
  currentPhase: string;
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  startTime: Date;
  estimatedCompletion: Date;
  shadowBuilds: ShadowBuildResult[];
  issues: MigrationIssue[];
}

export interface MigrationIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  category: 'build' | 'test' | 'performance' | 'determinism';
  description: string;
  suggestion: string;
  autoFixable: boolean;
  relatedFiles: string[];
}

export class MaestroInitWizard extends EventEmitter {
  private config: RepositoryConfig | null = null;
  private migrationPlan: MigrationPlan | null = null;
  private progress: MigrationProgress | null = null;

  async discoverRepository(rootPath: string): Promise<RepositoryConfig> {
    this.emit('phase', 'discovery');
    this.emit('status', 'Analyzing repository structure...');

    const config: RepositoryConfig = {
      name: path.basename(rootPath),
      rootPath,
      buildSystem: 'unknown',
      primaryLanguages: [],
      testFrameworks: [],
    };

    try {
      const files = await fs.readdir(rootPath);

      // Detect build system
      if (files.includes('WORKSPACE') || files.includes('BUILD')) {
        config.buildSystem = 'bazel';
      } else if (files.includes('package.json')) {
        config.buildSystem = 'npm';
        const packageJson = JSON.parse(
          await fs.readFile(path.join(rootPath, 'package.json'), 'utf8'),
        );
        if (packageJson.workspaces || files.includes('lerna.json')) {
          config.monorepoType = files.includes('lerna.json') ? 'lerna' : 'nx';
        }
      } else if (
        files.includes('build.gradle') ||
        files.includes('build.gradle.kts')
      ) {
        config.buildSystem = 'gradle';
      } else if (files.includes('pom.xml')) {
        config.buildSystem = 'maven';
      } else if (files.includes('Cargo.toml')) {
        config.buildSystem = 'cargo';
      }

      // Detect languages
      config.primaryLanguages = await this.detectLanguages(rootPath);

      // Detect test frameworks
      config.testFrameworks = await this.detectTestFrameworks(rootPath);

      // Detect CI provider
      config.ciProvider = await this.detectCIProvider(rootPath);

      this.config = config;
      this.emit('discovered', config);

      return config;
    } catch (error) {
      this.emit(
        'error',
        `Repository discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async generateMigrationPlan(
    config: RepositoryConfig,
  ): Promise<MigrationPlan> {
    this.emit('status', 'Generating migration plan...');

    const steps: MigrationStep[] = [];
    let totalDuration = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Phase 1: Setup and Shadow Building
    steps.push({
      id: 'setup-maestro',
      name: 'Setup Maestro Configuration',
      description: 'Initialize Maestro build configuration and workspace',
      command: 'maestro init --config-only',
      estimatedDuration: 300,
      prerequisites: [],
      validations: ['maestro.yml exists', 'build targets configured'],
      rollbackCommands: ['rm -f maestro.yml', 'git checkout HEAD -- .maestro/'],
    });

    steps.push({
      id: 'shadow-baseline',
      name: 'Establish Shadow Build Baseline',
      description: 'Run parallel shadow builds to establish baseline metrics',
      command: 'maestro build --shadow --baseline',
      estimatedDuration: 1800,
      prerequisites: ['setup-maestro'],
      validations: [
        'shadow build success',
        'artifacts match',
        'determinism > 95%',
      ],
      rollbackCommands: ['maestro clean --shadow'],
    });

    // Phase 2: Gradual Migration
    if (config.buildSystem === 'bazel') {
      steps.push({
        id: 'migrate-core-targets',
        name: 'Migrate Core Build Targets',
        description: 'Convert core build targets to Maestro configuration',
        command: 'maestro migrate --targets=core --dry-run=false',
        estimatedDuration: 3600,
        prerequisites: ['shadow-baseline'],
        validations: ['core targets build', 'tests pass', 'no regressions'],
        rollbackCommands: ['git checkout HEAD -- BUILD', 'bazel clean'],
      });
      riskLevel = 'medium';
    }

    // Phase 3: Validation and Testing
    steps.push({
      id: 'comprehensive-validation',
      name: 'Comprehensive Validation Suite',
      description: 'Run full test suite and performance benchmarks',
      command: 'maestro validate --comprehensive',
      estimatedDuration: 2400,
      prerequisites: steps.map((s) => s.id),
      validations: [
        'all tests pass',
        'performance within 10%',
        'no flaky tests',
      ],
      rollbackCommands: ['maestro rollback --full'],
    });

    totalDuration = steps.reduce(
      (sum, step) => sum + step.estimatedDuration,
      0,
    );

    // Adjust risk based on repository complexity
    if (
      config.primaryLanguages.length > 3 ||
      config.buildSystem === 'unknown'
    ) {
      riskLevel = 'high';
    }

    const plan: MigrationPlan = {
      phase: 'discovery',
      steps,
      estimatedDuration: totalDuration,
      riskLevel,
      rollbackPlan: [
        'maestro rollback --full',
        'git reset --hard HEAD~1',
        'rm -rf .maestro/',
        'restore original CI configuration',
      ],
    };

    this.migrationPlan = plan;
    this.emit('plan-ready', plan);

    return plan;
  }

  async executeMigration(
    plan: MigrationPlan,
    options: { dryRun?: boolean; skipShadow?: boolean } = {},
  ): Promise<void> {
    if (!this.config) {
      throw new Error('Repository must be discovered before migration');
    }

    const startTime = new Date();
    this.progress = {
      currentPhase: 'shadow',
      currentStep: '',
      completedSteps: 0,
      totalSteps: plan.steps.length,
      startTime,
      estimatedCompletion: new Date(
        startTime.getTime() + plan.estimatedDuration * 1000,
      ),
      shadowBuilds: [],
      issues: [],
    };

    this.emit('migration-start', this.progress);

    try {
      for (const step of plan.steps) {
        this.progress.currentStep = step.name;
        this.emit('step-start', step);

        if (options.dryRun) {
          this.emit('status', `[DRY RUN] Would execute: ${step.command}`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate execution
        } else {
          await this.executeStep(step);
        }

        // Run validations
        for (const validation of step.validations) {
          const result = await this.runValidation(validation);
          if (!result.passed) {
            const issue: MigrationIssue = {
              id: `${step.id}-validation-${Date.now()}`,
              severity: 'major',
              category: 'build',
              description: `Validation failed: ${validation}`,
              suggestion: result.suggestion || 'Manual intervention required',
              autoFixable: result.autoFixable || false,
              relatedFiles: result.relatedFiles || [],
            };
            this.progress.issues.push(issue);
            this.emit('issue', issue);
          }
        }

        this.progress.completedSteps++;
        this.emit('step-complete', step);

        // Run shadow build after key steps
        if (step.id.includes('migrate') || step.id.includes('baseline')) {
          const shadowResult = await this.runShadowBuild();
          this.progress.shadowBuilds.push(shadowResult);
          this.emit('shadow-build', shadowResult);
        }
      }

      this.progress.currentPhase = 'validation';
      this.emit('migration-complete', this.progress);
    } catch (error) {
      this.emit('migration-error', error);

      // Attempt automatic rollback
      this.emit('status', 'Migration failed, attempting rollback...');
      try {
        await this.rollback();
        this.emit('rollback-complete');
      } catch (rollbackError) {
        this.emit('rollback-failed', rollbackError);
      }

      throw error;
    }
  }

  async generateParityReport(
    originalBuild: string,
    maestroBuild: string,
  ): Promise<ParityReport> {
    this.emit('status', 'Generating parity report...');

    const report: ParityReport = {
      artifactParity: {
        matching: [],
        different: [],
        missing: [],
      },
      testParity: {
        passingInBoth: 0,
        failingInBoth: 0,
        passingOnlyInOriginal: 0,
        passingOnlyInMaestro: 0,
      },
      performanceParity: {
        buildTimeRatio: 1.0,
        testTimeRatio: 1.0,
        cacheHitRate: 0.0,
      },
      determinismScore: 0.0,
    };

    try {
      // Compare build artifacts
      const originalArtifacts = await this.listArtifacts(originalBuild);
      const maestroArtifacts = await this.listArtifacts(maestroBuild);

      for (const artifact of originalArtifacts) {
        if (maestroArtifacts.includes(artifact)) {
          const originalHash = await this.hashArtifact(
            path.join(originalBuild, artifact),
          );
          const maestroHash = await this.hashArtifact(
            path.join(maestroBuild, artifact),
          );

          if (originalHash === maestroHash) {
            report.artifactParity.matching.push(artifact);
          } else {
            report.artifactParity.different.push(artifact);
          }
        } else {
          report.artifactParity.missing.push(artifact);
        }
      }

      // Calculate determinism score
      const totalArtifacts = originalArtifacts.length;
      const matchingArtifacts = report.artifactParity.matching.length;
      report.determinismScore =
        totalArtifacts > 0 ? matchingArtifacts / totalArtifacts : 0;

      this.emit('parity-report', report);
      return report;
    } catch (error) {
      this.emit(
        'error',
        `Parity report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async detectLanguages(rootPath: string): Promise<string[]> {
    const languages: string[] = [];
    const extensionMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.rb': 'ruby',
      '.php': 'php',
    };

    try {
      const files = await this.globFiles(rootPath, '**/*');
      const langCounts: { [key: string]: number } = {};

      for (const file of files) {
        const ext = path.extname(file);
        const lang = extensionMap[ext];
        if (lang) {
          langCounts[lang] = (langCounts[lang] || 0) + 1;
        }
      }

      // Return languages with significant presence (>5% of total files)
      const totalFiles = Object.values(langCounts).reduce(
        (sum, count) => sum + count,
        0,
      );
      for (const [lang, count] of Object.entries(langCounts)) {
        if (count / totalFiles > 0.05) {
          languages.push(lang);
        }
      }

      return languages;
    } catch {
      return [];
    }
  }

  private async detectTestFrameworks(rootPath: string): Promise<string[]> {
    const frameworks: string[] = [];

    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf8'),
        );
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (deps.jest) frameworks.push('jest');
        if (deps.mocha) frameworks.push('mocha');
        if (deps.jasmine) frameworks.push('jasmine');
        if (deps['@playwright/test']) frameworks.push('playwright');
        if (deps.cypress) frameworks.push('cypress');
      }

      // Check for other framework indicators
      if (await this.fileExists(path.join(rootPath, 'pytest.ini')))
        frameworks.push('pytest');
      if (await this.fileExists(path.join(rootPath, 'phpunit.xml')))
        frameworks.push('phpunit');

      return frameworks;
    } catch {
      return [];
    }
  }

  private async detectCIProvider(
    rootPath: string,
  ): Promise<'github' | 'gitlab' | 'jenkins' | 'azure' | 'circle' | undefined> {
    if (await this.fileExists(path.join(rootPath, '.github/workflows')))
      return 'github';
    if (await this.fileExists(path.join(rootPath, '.gitlab-ci.yml')))
      return 'gitlab';
    if (await this.fileExists(path.join(rootPath, 'Jenkinsfile')))
      return 'jenkins';
    if (await this.fileExists(path.join(rootPath, 'azure-pipelines.yml')))
      return 'azure';
    if (await this.fileExists(path.join(rootPath, '.circleci/config.yml')))
      return 'circle';
    return undefined;
  }

  private async executeStep(step: MigrationStep): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', step.command], {
        cwd: this.config?.rootPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        this.emit('step-output', data.toString());
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        this.emit('step-error', data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`Step ${step.id} failed with code ${code}: ${stderr}`),
          );
        }
      });

      // Timeout after step duration + buffer
      setTimeout(
        () => {
          child.kill();
          reject(new Error(`Step ${step.id} timed out`));
        },
        (step.estimatedDuration + 300) * 1000,
      );
    });
  }

  private async runValidation(validation: string): Promise<{
    passed: boolean;
    suggestion?: string;
    autoFixable?: boolean;
    relatedFiles?: string[];
  }> {
    // Simulate validation logic
    const mockValidations: { [key: string]: any } = {
      'maestro.yml exists': { passed: true },
      'shadow build success': { passed: true },
      'artifacts match': { passed: Math.random() > 0.1 },
      'determinism > 95%': { passed: Math.random() > 0.2 },
      'all tests pass': { passed: Math.random() > 0.15 },
      'performance within 10%': { passed: Math.random() > 0.25 },
    };

    return (
      mockValidations[validation] || {
        passed: false,
        suggestion: 'Unknown validation',
        autoFixable: false,
      }
    );
  }

  private async runShadowBuild(): Promise<ShadowBuildResult> {
    const buildId = `shadow-${Date.now()}`;
    const startTime = Date.now();

    // Simulate shadow build
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const duration = Date.now() - startTime;
    const success = Math.random() > 0.1;

    return {
      buildId,
      status: success ? 'success' : 'failure',
      duration,
      artifacts: ['app.js', 'styles.css', 'index.html'],
      testResults: [
        {
          suite: 'unit-tests',
          passed: 42,
          failed: success ? 0 : 2,
          skipped: 1,
          duration: duration / 2,
          failures: [],
        },
      ],
      parityReport: {
        artifactParity: {
          matching: success ? ['app.js', 'styles.css'] : ['app.js'],
          different: success ? [] : ['styles.css'],
          missing: [],
        },
        testParity: {
          passingInBoth: 42,
          failingInBoth: 0,
          passingOnlyInOriginal: 0,
          passingOnlyInMaestro: 0,
        },
        performanceParity: {
          buildTimeRatio: 0.85,
          testTimeRatio: 0.92,
          cacheHitRate: 0.73,
        },
        determinismScore: success ? 0.98 : 0.87,
      },
    };
  }

  private async rollback(): Promise<void> {
    if (!this.migrationPlan) return;

    for (const command of this.migrationPlan.rollbackPlan) {
      try {
        execSync(command, { cwd: this.config?.rootPath });
        this.emit('rollback-step', command);
      } catch (error) {
        this.emit('rollback-error', { command, error });
      }
    }
  }

  private async listArtifacts(buildPath: string): Promise<string[]> {
    try {
      const files = await this.globFiles(
        buildPath,
        '**/*.{js,css,html,jar,war,exe}',
      );
      return files.map((f) => path.relative(buildPath, f));
    } catch {
      return [];
    }
  }

  private async hashArtifact(filePath: string): Promise<string> {
    try {
      const crypto = await import('crypto');
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async globFiles(
    rootPath: string,
    pattern: string,
  ): Promise<string[]> {
    // Simplified glob implementation
    try {
      const glob = await import('glob');
      return glob.glob(pattern, { cwd: rootPath, absolute: true });
    } catch {
      return [];
    }
  }
}
