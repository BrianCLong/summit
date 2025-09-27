import { CriticAgent } from './critic';
import { FixerAgent } from './fixer';
import { ReflectiveLoop } from './reflectiveLoop';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

type AgentMode = 'ci' | 'pr' | 'dev' | 'plan';

type CriticAnalysis = Awaited<ReturnType<CriticAgent['analyze']>>;

interface PlanItem {
  title: string;
  priority: 'high' | 'medium' | 'low';
  summary: string;
  actions: string[];
  relatedChecks?: string[];
}

export interface AgentOrchestrationResult {
  phase: 'planning' | 'implementation' | 'criticism' | 'fixing' | 'testing' | 'review';
  success: boolean;
  results: any;
  nextPhase?: string;
  shouldProceed: boolean;
}

export class AgentOrchestrator {
  private projectRoot: string;
  private critic: CriticAgent;
  private fixer: FixerAgent;
  private reflectiveLoop: ReflectiveLoop;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.critic = new CriticAgent(projectRoot);
    this.fixer = new FixerAgent(projectRoot);
    this.reflectiveLoop = new ReflectiveLoop(projectRoot);
  }

  async orchestrate(mode: AgentMode = 'ci'): Promise<AgentOrchestrationResult[]> {
    console.log(`🎭 Starting agent orchestration in ${mode} mode...`);

    const results: AgentOrchestrationResult[] = [];
    const planMode = mode === 'plan';

    try {
      // Phase 1: Planning (analyze current state)
      console.log('\n📋 Phase 1: Planning & Analysis');
      const planningResult = await this.runPhase('planning', async () => {
        const criticResult: CriticAnalysis = await this.critic.analyze();
        return {
          riskScore: criticResult.riskScore,
          shouldProceed: criticResult.shouldProceed,
          recommendations: criticResult.recommendations,
          diffSummary: criticResult.diffSummary,
          staticChecks: criticResult.staticCheckResults.map(r => ({
            tool: r.tool,
            passed: r.passed,
            issueCount: r.issues.length,
            errors: r.issues.filter(i => i.severity === 'error').length,
            warnings: r.issues.filter(i => i.severity === 'warning').length
          })),
          plan: this.generateActionPlan(criticResult)
        };
      });

      results.push(planningResult);

      if (planMode) {
        console.log('\n🧭 Plan mode enabled: skipping automated remediation and verification phases.');
      }

      if (!planMode && !planningResult.results.shouldProceed && mode === 'ci') {
        console.log('🛑 High risk detected in CI mode - stopping pipeline');
        return results;
      }

      // Phase 2: Implementation (fixes)
      if (!planMode && planningResult.results.riskScore > 10) {
        console.log('\n🔧 Phase 2: Implementation & Fixing');
        const implementationResult = await this.runPhase('implementation', async () => {
          const loopResult = await this.reflectiveLoop.execute();
          return {
            finalState: loopResult.finalState,
            iterations: loopResult.iterations.length,
            issuesResolved: loopResult.metrics.issuesResolved,
            recommendations: loopResult.recommendations
          };
        });
        
        results.push(implementationResult);

        // Phase 3: Testing (verify fixes)
        if (implementationResult.success) {
          console.log('\n🧪 Phase 3: Testing & Verification');
          const testingResult = await this.runPhase('testing', async () => {
            return await this.runTestSuite(mode);
          });

          results.push(testingResult);
        }
      }

      // Phase 4: Final Review
      if (!planMode) {
        console.log('\n👀 Phase 4: Final Review');
        const reviewResult = await this.runPhase('review', async () => {
          const finalAnalysis = await this.critic.analyze();
          return {
            finalRiskScore: finalAnalysis.riskScore,
            readyForMerge: finalAnalysis.shouldProceed,
            finalRecommendations: finalAnalysis.recommendations,
            gate: this.determineGate(finalAnalysis, mode)
          };
        });

        results.push(reviewResult);
      }

    } catch (error) {
      console.error('❌ Agent orchestration failed:', error);
      results.push({
        phase: 'review',
        success: false,
        results: { error: error.message },
        shouldProceed: false
      });
    }

    this.logOrchestrationSummary(results, mode);
    return results;
  }

  private async runPhase(
    phase: AgentOrchestrationResult['phase'],
    operation: () => Promise<any>
  ): Promise<AgentOrchestrationResult> {
    try {
      const results = await operation();
      const success = this.evaluatePhaseSuccess(phase, results);
      const shouldProceed =
        typeof results?.shouldProceed === 'boolean' ? results.shouldProceed : success;

      return {
        phase,
        success,
        results,
        shouldProceed,
        nextPhase: this.getNextPhase(phase, shouldProceed)
      };
    } catch (error) {
      return {
        phase,
        success: false,
        results: { error: error.message },
        shouldProceed: false
      };
    }
  }

  private evaluatePhaseSuccess(phase: string, results: any): boolean {
    switch (phase) {
      case 'planning':
        return results.riskScore !== undefined;
      case 'implementation':
        return results.finalState === 'success' || results.finalState === 'partial';
      case 'testing':
        return results.testsPass && results.buildsPass;
      case 'review':
        return results.finalRiskScore < 50;
      default:
        return false;
    }
  }

  private getNextPhase(currentPhase: string, success: boolean): string | undefined {
    if (!success) return undefined;

    const phaseFlow = {
      'planning': 'implementation',
      'implementation': 'testing', 
      'testing': 'review',
      'review': undefined
    };

    return phaseFlow[currentPhase];
  }

  private async runTestSuite(mode: AgentMode): Promise<any> {
    const results = {
      testsPass: false,
      buildsPass: false,
      lintPass: false,
      typeCheckPass: false,
      details: {}
    };

    try {
      // Build check
      console.log('Building project...');
      await execAsync('npm run build', { cwd: this.projectRoot, timeout: 120000 });
      results.buildsPass = true;
      console.log('✅ Build successful');
    } catch (error) {
      console.log('❌ Build failed:', error.message);
      results.details.buildError = error.message;
    }

    try {
      // Lint check
      console.log('Running linter...');
      await execAsync('npm run lint', { cwd: this.projectRoot, timeout: 60000 });
      results.lintPass = true;
      console.log('✅ Lint successful');
    } catch (error) {
      console.log('❌ Lint failed:', error.message);
      results.details.lintError = error.message;
    }

    try {
      // TypeScript check
      console.log('Running type checker...');
      await execAsync('npm run typecheck', { cwd: this.projectRoot, timeout: 60000 });
      results.typeCheckPass = true;
      console.log('✅ Type check successful');
    } catch (error) {
      console.log('❌ Type check failed:', error.message);
      results.details.typeError = error.message;
    }

    // Test suite (mode-dependent)
    try {
      console.log('Running test suite...');
      const testCommand = mode === 'ci' ? 'npm run test:ci' : 'npm run test';
      await execAsync(testCommand, { cwd: this.projectRoot, timeout: 300000 });
      results.testsPass = true;
      console.log('✅ Tests successful');
    } catch (error) {
      console.log('❌ Tests failed:', error.message);
      results.details.testError = error.message;
      
      // In dev mode, test failures are less critical
      if (mode === 'dev') {
        results.testsPass = true; // Allow continuation in dev mode
      }
    }

    return results;
  }

  private determineGate(analysis: any, mode: AgentMode): string {
    const riskScore = analysis.riskScore;

    if (mode === 'plan') {
      return 'planning-only';
    }

    if (mode === 'ci') {
      if (riskScore <= 10) return 'auto-merge';
      if (riskScore <= 30) return 'auto-approve';
      if (riskScore <= 50) return 'review-required';
      return 'blocked';
    } else if (mode === 'pr') {
      if (riskScore <= 20) return 'approved';
      if (riskScore <= 40) return 'review-requested';
      return 'changes-requested';
    } else { // dev mode
      if (riskScore <= 30) return 'continue';
      return 'fix-recommended';
    }
  }

  private generateActionPlan(analysis: CriticAnalysis): PlanItem[] {
    const plan: PlanItem[] = [];

    for (const result of analysis.staticCheckResults) {
      const issues = Array.isArray(result.issues) ? result.issues : [];
      const errors = issues.filter((issue: any) => issue.severity === 'error');
      const warnings = issues.filter((issue: any) => issue.severity === 'warning');

      if (errors.length === 0 && warnings.length === 0) {
        continue;
      }

      const summaryParts: string[] = [];
      if (errors.length) {
        summaryParts.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
      }
      if (warnings.length) {
        summaryParts.push(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
      }

      const actions = [
        `Review ${result.tool} findings and group them by root cause.`,
      ];

      if (errors.length) {
        actions.push(
          `Resolve ${errors.length === 1 ? 'the blocking error' : `${errors.length} blocking errors`} reported by ${result.tool}.`
        );
      }

      if (warnings.length) {
        actions.push(
          `Address ${warnings.length === 1 ? 'the warning' : `${warnings.length} warnings`} to maintain quality.`
        );
      }

      actions.push(`Re-run ${result.tool} to confirm the workspace is clean.`);

      plan.push({
        title: `Resolve ${result.tool} findings`,
        priority: errors.length ? 'high' : 'medium',
        summary: summaryParts.length
          ? `${result.tool} reported ${summaryParts.join(' and ')}.`
          : `${result.tool} identified follow-up work.`,
        actions: this.dedupeList(actions),
        relatedChecks: [result.tool]
      });
    }

    const diff = analysis.diffSummary;

    if (diff) {
      const modules = Array.isArray(diff.affectedModules)
        ? diff.affectedModules.filter(Boolean)
        : [];
      const highlightedModules = modules.slice(0, 5);
      const modulesSummary = highlightedModules.length
        ? ` Key modules: ${highlightedModules.join(', ')}${modules.length > highlightedModules.length ? ', ...' : ''}.`
        : '';

      const footprintSummary = `Touches ${diff.filesChanged} file${diff.filesChanged === 1 ? '' : 's'} with ${diff.linesAdded} additions and ${diff.linesRemoved} deletions (complexity: ${diff.complexity}).`;

      plan.push({
        title: 'Assess change impact footprint',
        priority: diff.complexity === 'high' ? 'high' : diff.complexity === 'medium' ? 'medium' : 'low',
        summary: footprintSummary + modulesSummary,
        actions: [
          'Review architectural and dependency impacts with the affected module owners.',
          'Plan focused regression and smoke tests covering the changed surface area.',
          'Document rollback and contingency steps in case issues surface post-deploy.'
        ],
        relatedChecks: highlightedModules
      });

      if (typeof diff.testCoverage === 'number' && diff.testCoverage < 70) {
        plan.push({
          title: 'Improve automated test coverage',
          priority: diff.testCoverage < 50 ? 'high' : 'medium',
          summary: `Estimated coverage is ${diff.testCoverage}%. Strengthen automated confidence before rollout.`,
          actions: [
            'Add unit and integration tests targeting the highest-risk paths.',
            'Capture before/after coverage reports to demonstrate improvement.',
            'Gate merge on the updated suites to ensure regressions are caught.'
          ],
          relatedChecks: ['tests']
        });
      }
    }

    const governanceActions = [
      ...analysis.recommendations,
      'Share this plan with reviewers and assign accountable owners for each item.',
      'Schedule a follow-up review to confirm remediation items are complete.'
    ];

    if (!analysis.shouldProceed) {
      governanceActions.unshift('Block merge until the high-risk findings are remediated and re-validated.');
    }

    plan.push({
      title: 'Governance & readiness checkpoints',
      priority: this.priorityFromRisk(analysis.riskScore),
      summary: `Overall risk score ${analysis.riskScore}/100 – ${analysis.shouldProceed ? 'automation deems the change proceedable with mitigation.' : 'manual approval is required before proceeding.'}`,
      actions: this.dedupeList(governanceActions),
      relatedChecks: ['governance']
    });

    return plan;
  }

  private priorityFromRisk(riskScore: number): PlanItem['priority'] {
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private dedupeList(items: string[]): string[] {
    return Array.from(new Set(items.filter(item => typeof item === 'string' && item.trim().length > 0)));
  }

  private logPlanDetails(planningResult?: AgentOrchestrationResult): void {
    if (!planningResult || !planningResult.results) {
      return;
    }

    const { results } = planningResult;

    console.log('\n🧭 PLAN OVERVIEW');

    if (typeof results.riskScore === 'number') {
      console.log(`Risk Score: ${results.riskScore}`);
    }

    if (typeof results.shouldProceed === 'boolean') {
      console.log(
        `Auto-Proceed Recommendation: ${results.shouldProceed ? 'Proceed after mitigation' : 'Hold for manual approval'}`
      );
    }

    if (results.diffSummary) {
      const diff = results.diffSummary;
      console.log(
        `Change Footprint: ${diff.filesChanged} files, ${diff.linesAdded} additions, ${diff.linesRemoved} deletions (complexity: ${diff.complexity})`
      );

      if (Array.isArray(diff.affectedModules) && diff.affectedModules.length) {
        const highlighted = diff.affectedModules.slice(0, 6);
        console.log(
          `Affected Modules: ${highlighted.join(', ')}${diff.affectedModules.length > highlighted.length ? ', ...' : ''}`
        );
      }

      if (typeof diff.testCoverage === 'number') {
        console.log(`Estimated Coverage: ${diff.testCoverage}%`);
      }
    }

    if (Array.isArray(results.staticChecks) && results.staticChecks.length) {
      console.log('\n🔎 Static Check Snapshot:');
      results.staticChecks.forEach((check: any) => {
        const status = check.passed ? '✅' : '⚠️';
        const errorCount = check.errors ?? 0;
        const warningCount = check.warnings ?? 0;
        const summary = check.passed
          ? 'clean'
          : `${errorCount} error${errorCount === 1 ? '' : 's'}, ${warningCount} warning${warningCount === 1 ? '' : 's'}`;
        console.log(`  ${status} ${check.tool}: ${summary}`);
      });
    }

    const planItems: PlanItem[] = Array.isArray(results.plan) ? results.plan : [];

    if (!planItems.length) {
      console.log('\n✨ No follow-up actions required – all systems go.');
      return;
    }

    console.log('\n🗺️  Action Plan:');
    planItems.forEach((item, index) => {
      const stepNumber = String(index + 1).padStart(2, '0');
      console.log(`  ${stepNumber}. [${item.priority.toUpperCase()}] ${item.title}`);
      console.log(`      ${item.summary}`);

      if (Array.isArray(item.actions) && item.actions.length) {
        item.actions.forEach(action => {
          console.log(`      - ${action}`);
        });
      }
    });
  }

  private logOrchestrationSummary(results: AgentOrchestrationResult[], mode: AgentMode): void {
    console.log('\n' + '='.repeat(70));
    console.log('🎭 AGENT ORCHESTRATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log(`Phases Completed: ${results.length}`);
    
    const successful = results.filter(r => r.success).length;
    console.log(`Success Rate: ${successful}/${results.length} (${(successful/results.length*100).toFixed(1)}%)`);

    console.log('\n📊 Phase Results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const nextPhase = result.nextPhase ? ` → ${result.nextPhase}` : '';
      console.log(`  ${status} ${result.phase}${nextPhase}`);
      
      // Show key metrics for each phase
      if (result.phase === 'planning' && result.results.riskScore !== undefined) {
        console.log(`    Risk Score: ${result.results.riskScore}`);
      }
      if (result.phase === 'implementation' && result.results.finalState) {
        console.log(`    Final State: ${result.results.finalState}`);
        console.log(`    Issues Resolved: ${result.results.issuesResolved || 0}`);
      }
      if (result.phase === 'review' && result.results.gate) {
        console.log(`    Gate Decision: ${result.results.gate}`);
      }
    });

    if (mode === 'plan') {
      const planningPhase = results.find(r => r.phase === 'planning');
      this.logPlanDetails(planningPhase);
    }

    // Final recommendation
    const lastResult = results[results.length - 1];
    if (lastResult.phase === 'review') {
      console.log('\n🚪 Final Gate Decision:');
      console.log(`  ${lastResult.results.gate?.toUpperCase() || 'UNKNOWN'}`);
      
      if (lastResult.results.finalRecommendations) {
        console.log('\n💡 Final Recommendations:');
        lastResult.results.finalRecommendations.forEach(rec => 
          console.log(`  ${rec}`)
        );
      }
    }

    console.log('='.repeat(70));
  }
}

// CLI Interface
export async function runAgentPipeline(mode: AgentMode = 'ci'): Promise<void> {
  const orchestrator = new AgentOrchestrator();
  const results = await orchestrator.orchestrate(mode);

  // Exit with appropriate code for CI
  if (mode === 'ci') {
    const lastResult = results[results.length - 1];
    const gate = lastResult.results?.gate;
    
    if (gate === 'blocked' || !lastResult.success) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

export { CriticAgent, FixerAgent, ReflectiveLoop };