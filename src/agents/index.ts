import { CriticAgent } from './critic';
import { FixerAgent } from './fixer';
import { ReflectiveLoop } from './reflectiveLoop';
import { StrategicCounterAntifragileOrchestrationNetwork } from './strategicCounterAntifragileNetwork';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

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
  private strategicNetwork: StrategicCounterAntifragileOrchestrationNetwork;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.critic = new CriticAgent(projectRoot);
    this.fixer = new FixerAgent(projectRoot);
    this.reflectiveLoop = new ReflectiveLoop(projectRoot);
    this.strategicNetwork = new StrategicCounterAntifragileOrchestrationNetwork();
  }

  async orchestrate(mode: 'ci' | 'pr' | 'dev' = 'ci'): Promise<AgentOrchestrationResult[]> {
    console.log(`🎭 Starting agent orchestration in ${mode} mode...`);
    
    const results: AgentOrchestrationResult[] = [];

    try {
      // Phase 1: Planning (analyze current state)
      console.log('\n📋 Phase 1: Planning & Analysis');
      const planningResult = await this.runPhase('planning', async () => {
        const criticResult = await this.critic.analyze();
        const strategicCycle = this.strategicNetwork.evaluateCycle({
          criticSnapshot: criticResult,
          mode
        });
        return {
          riskScore: criticResult.riskScore,
          shouldProceed: criticResult.shouldProceed,
          recommendations: criticResult.recommendations,
          staticChecks: criticResult.staticCheckResults.map(r => ({
            tool: r.tool,
            passed: r.passed,
            issueCount: r.issues.length
          })),
          strategicCycle,
          autoPush: strategicCycle.autoPush
        };
      });
      
      results.push(planningResult);

      if (!planningResult.shouldProceed && mode === 'ci') {
        console.log('🛑 High risk detected in CI mode - stopping pipeline');
        return results;
      }

      // Phase 2: Implementation (fixes)
      if (planningResult.results.riskScore > 10) {
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
      
      return {
        phase,
        success,
        results,
        shouldProceed: success,
        nextPhase: this.getNextPhase(phase, success)
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

  private async runTestSuite(mode: string): Promise<any> {
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

  private determineGate(analysis: any, mode: string): string {
    const riskScore = analysis.riskScore;
    
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

  private logOrchestrationSummary(results: AgentOrchestrationResult[], mode: string): void {
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
        if (result.results.strategicCycle) {
          console.log(
            `    Strategic Network: ${result.results.strategicCycle.validation.tcoReductionMultiplier}x TCO ↓, ` +
            `${result.results.strategicCycle.validation.valueExpansionMultiplier}x value ↑`
          );
        }
      }
      if (result.phase === 'implementation' && result.results.finalState) {
        console.log(`    Final State: ${result.results.finalState}`);
        console.log(`    Issues Resolved: ${result.results.issuesResolved || 0}`);
      }
      if (result.phase === 'review' && result.results.gate) {
        console.log(`    Gate Decision: ${result.results.gate}`);
      }
    });

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

    const planningPhase = results.find(result => result.phase === 'planning');
    const autoPush = planningPhase?.results?.autoPush;
    if (autoPush) {
      console.log('\n🚀 Strategic Auto-Push Payload:');
      console.log(`  Recommendations: ${autoPush.recommendations.join(' | ')}`);
      console.log(`  Optimization Plan: ${autoPush.optimizationPlan.headline}`);
    }

    console.log('='.repeat(70));
  }
}

// CLI Interface
export async function runAgentPipeline(mode: 'ci' | 'pr' | 'dev' = 'ci'): Promise<void> {
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

export {
  CriticAgent,
  FixerAgent,
  ReflectiveLoop,
  StrategicCounterAntifragileOrchestrationNetwork
};
