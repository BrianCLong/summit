#!/usr/bin/env node

import { MaestroInitWizard } from '../migration/MaestroInitWizard.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MaestroInitCLI {
  constructor() {
    this.wizard = new MaestroInitWizard();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wizard.on('phase', (phase) => {
      console.log(`\n🎯 Phase: ${phase.toUpperCase()}`);
    });

    this.wizard.on('status', (status) => {
      console.log(`   ${status}`);
    });

    this.wizard.on('discovered', (config) => {
      console.log(`\n📊 Repository Analysis Complete:`);
      console.log(`   Name: ${config.name}`);
      console.log(`   Build System: ${config.buildSystem}`);
      console.log(`   Languages: ${config.primaryLanguages.join(', ')}`);
      console.log(`   Test Frameworks: ${config.testFrameworks.join(', ')}`);
      if (config.ciProvider)
        console.log(`   CI Provider: ${config.ciProvider}`);
      if (config.monorepoType)
        console.log(`   Monorepo: ${config.monorepoType}`);
    });

    this.wizard.on('plan-ready', (plan) => {
      console.log(`\n📋 Migration Plan Generated:`);
      console.log(`   Phases: ${plan.steps.length} steps`);
      console.log(
        `   Estimated Duration: ${Math.round(plan.estimatedDuration / 60)} minutes`,
      );
      console.log(`   Risk Level: ${plan.riskLevel.toUpperCase()}`);
      console.log(`\n   Steps:`);
      plan.steps.forEach((step, i) => {
        console.log(
          `   ${i + 1}. ${step.name} (~${Math.round(step.estimatedDuration / 60)}min)`,
        );
        console.log(`      ${step.description}`);
      });
    });

    this.wizard.on('migration-start', (progress) => {
      console.log(`\n🚀 Migration Started`);
      console.log(`   Total Steps: ${progress.totalSteps}`);
      console.log(
        `   Estimated Completion: ${progress.estimatedCompletion.toLocaleTimeString()}`,
      );
    });

    this.wizard.on('step-start', (step) => {
      console.log(`\n   ⚙️  ${step.name}`);
      console.log(`      ${step.description}`);
      console.log(`      Command: ${step.command}`);
    });

    this.wizard.on('step-complete', (step) => {
      console.log(`   ✅ ${step.name} - Complete`);
    });

    this.wizard.on('step-output', (output) => {
      // Only show important output lines to avoid spam
      const lines = output
        .split('\n')
        .filter(
          (line) =>
            line.includes('ERROR') ||
            line.includes('SUCCESS') ||
            line.includes('WARN') ||
            line.includes('Built') ||
            line.includes('Test'),
        );
      lines.forEach((line) => {
        if (line.trim()) console.log(`      ${line.trim()}`);
      });
    });

    this.wizard.on('shadow-build', (result) => {
      console.log(`\n   🔍 Shadow Build Complete:`);
      console.log(`      Status: ${result.status}`);
      console.log(`      Duration: ${Math.round(result.duration / 1000)}s`);
      console.log(`      Artifacts: ${result.artifacts.length}`);
      console.log(
        `      Determinism: ${Math.round(result.parityReport.determinismScore * 100)}%`,
      );

      if (result.parityReport.artifactParity.different.length > 0) {
        console.log(
          `      ⚠️  Different artifacts: ${result.parityReport.artifactParity.different.join(', ')}`,
        );
      }
    });

    this.wizard.on('issue', (issue) => {
      const icon =
        issue.severity === 'critical'
          ? '🚨'
          : issue.severity === 'major'
            ? '⚠️'
            : 'ℹ️';
      console.log(
        `\n   ${icon} ${issue.severity.toUpperCase()}: ${issue.description}`,
      );
      console.log(`      Suggestion: ${issue.suggestion}`);
      if (issue.autoFixable) {
        console.log(`      🔧 Auto-fixable`);
      }
    });

    this.wizard.on('migration-complete', (progress) => {
      console.log(`\n🎉 Migration Complete!`);
      console.log(
        `   Completed: ${progress.completedSteps}/${progress.totalSteps} steps`,
      );
      console.log(`   Shadow Builds: ${progress.shadowBuilds.length}`);
      console.log(`   Issues: ${progress.issues.length}`);

      if (progress.issues.length > 0) {
        const critical = progress.issues.filter(
          (i) => i.severity === 'critical',
        ).length;
        const major = progress.issues.filter(
          (i) => i.severity === 'major',
        ).length;
        console.log(
          `   Issues Breakdown: ${critical} critical, ${major} major`,
        );
      }
    });

    this.wizard.on('error', (error) => {
      console.error(`\n❌ Error: ${error}`);
    });

    this.wizard.on('migration-error', (error) => {
      console.error(`\n💥 Migration Failed: ${error.message}`);
    });

    this.wizard.on('rollback-complete', () => {
      console.log(
        `\n🔄 Rollback Complete - Repository restored to original state`,
      );
    });
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'interactive';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎼 Maestro Init Wizard                    ║
║              One-Click Repository Migration                   ║
╚══════════════════════════════════════════════════════════════╝
`);

    try {
      switch (command) {
        case 'interactive':
          await this.runInteractive();
          break;
        case 'analyze':
          await this.runAnalyze(args[1] || process.cwd());
          break;
        case 'migrate':
          await this.runMigrate(args[1] || process.cwd(), {
            dryRun: args.includes('--dry-run'),
            skipShadow: args.includes('--skip-shadow'),
          });
          break;
        case 'parity':
          await this.runParityReport(args[1], args[2]);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(
        `\n💥 Fatal Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      process.exit(1);
    }
  }

  async runInteractive() {
    const rootPath = process.cwd();
    console.log(`🔍 Analyzing repository at: ${rootPath}\n`);

    // Step 1: Discovery
    const config = await this.wizard.discoverRepository(rootPath);

    // Step 2: Generate Plan
    const plan = await this.wizard.generateMigrationPlan(config);

    // Step 3: Confirm with user
    const shouldProceed = await this.askYesNo(
      `\nProceed with migration? (y/n): `,
    );
    if (!shouldProceed) {
      console.log('Migration cancelled.');
      return;
    }

    const dryRun = await this.askYesNo(`Run in dry-run mode first? (y/n): `);

    // Step 4: Execute Migration
    await this.wizard.executeMigration(plan, { dryRun });

    if (dryRun) {
      const runForReal = await this.askYesNo(
        `\nDry run complete. Execute for real? (y/n): `,
      );
      if (runForReal) {
        await this.wizard.executeMigration(plan, { dryRun: false });
      }
    }
  }

  async runAnalyze(rootPath) {
    console.log(`🔍 Analyzing repository at: ${rootPath}\n`);

    const config = await this.wizard.discoverRepository(rootPath);
    const plan = await this.wizard.generateMigrationPlan(config);

    // Save analysis results
    const analysisPath = path.join(rootPath, '.maestro-analysis.json');
    await fs.writeFile(analysisPath, JSON.stringify({ config, plan }, null, 2));
    console.log(`\n📄 Analysis saved to: ${analysisPath}`);
  }

  async runMigrate(rootPath, options = {}) {
    console.log(`🚀 Starting migration for: ${rootPath}\n`);

    // Load existing analysis if available
    const analysisPath = path.join(rootPath, '.maestro-analysis.json');
    let config, plan;

    try {
      const analysis = JSON.parse(await fs.readFile(analysisPath, 'utf8'));
      config = analysis.config;
      plan = analysis.plan;
      console.log(`📄 Using existing analysis from ${analysisPath}`);
    } catch {
      console.log(`🔍 No existing analysis found, analyzing repository...`);
      config = await this.wizard.discoverRepository(rootPath);
      plan = await this.wizard.generateMigrationPlan(config);
    }

    await this.wizard.executeMigration(plan, options);
  }

  async runParityReport(originalBuild, maestroBuild) {
    if (!originalBuild || !maestroBuild) {
      console.error(
        'Usage: maestro-init parity <original-build-path> <maestro-build-path>',
      );
      return;
    }

    console.log(`📊 Generating parity report...`);
    console.log(`   Original: ${originalBuild}`);
    console.log(`   Maestro:  ${maestroBuild}`);

    const report = await this.wizard.generateParityReport(
      originalBuild,
      maestroBuild,
    );

    console.log(`\n📋 Parity Report:`);
    console.log(`   Artifact Parity:`);
    console.log(`     Matching: ${report.artifactParity.matching.length}`);
    console.log(`     Different: ${report.artifactParity.different.length}`);
    console.log(`     Missing: ${report.artifactParity.missing.length}`);

    console.log(`   Performance Parity:`);
    console.log(
      `     Build Time Ratio: ${report.performanceParity.buildTimeRatio.toFixed(2)}`,
    );
    console.log(
      `     Test Time Ratio: ${report.performanceParity.testTimeRatio.toFixed(2)}`,
    );
    console.log(
      `     Cache Hit Rate: ${(report.performanceParity.cacheHitRate * 100).toFixed(1)}%`,
    );

    console.log(
      `   Determinism Score: ${(report.determinismScore * 100).toFixed(1)}%`,
    );

    // Save report
    const reportPath = path.join(process.cwd(), 'maestro-parity-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  async askYesNo(question) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  showHelp() {
    console.log(`
Usage: maestro-init [command] [options]

Commands:
  interactive    Run interactive migration wizard (default)
  analyze        Analyze repository and generate migration plan
  migrate        Execute migration plan
  parity         Generate parity report between builds

Options:
  --dry-run     Run migration in dry-run mode
  --skip-shadow Skip shadow build validation

Examples:
  maestro-init                                    # Interactive wizard
  maestro-init analyze                            # Analyze current directory
  maestro-init migrate --dry-run                  # Dry run migration
  maestro-init parity ./original ./maestro       # Compare builds
`);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new MaestroInitCLI();
  cli.run().catch(console.error);
}

export { MaestroInitCLI };
