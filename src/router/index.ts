import { CapabilityRouter } from './capabilityRouter';

export { CapabilityRouter };

// Helper function for easy routing
export async function routeRequest(
  type:
    | 'code-generation'
    | 'analysis'
    | 'review'
    | 'debugging'
    | 'testing'
    | 'documentation',
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced' = 'moderate',
  options: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    maxCost?: number;
    timeLimit?: number;
    estimatedTokens?: number;
    needsReasoning?: boolean;
    requiresCreativity?: boolean;
    minAccuracy?: number;
    allowExperimental?: boolean;
  } = {},
) {
  const router = new CapabilityRouter();

  return await router.route({
    type,
    complexity,
    priority: options.priority || 'medium',
    budget: {
      maxCost: options.maxCost || 1.0,
      timeLimit: options.timeLimit || 10000,
    },
    qualityRequirements: {
      minAccuracy: options.minAccuracy || 0.8,
      allowExperimental: options.allowExperimental || false,
    },
    context: {
      estimatedTokens: options.estimatedTokens || 1000,
      needsReasoning: options.needsReasoning || false,
      requiresCreativity: options.requiresCreativity || false,
    },
  });
}

// Usage examples and integration helpers
export class RouterIntegration {
  private router: CapabilityRouter;

  constructor(projectRoot?: string) {
    this.router = new CapabilityRouter(projectRoot);
  }

  // High-level routing for common scenarios
  async routeCodeGeneration(
    options: {
      complexity?: 'simple' | 'moderate' | 'complex' | 'advanced';
      budget?: number;
      needsTests?: boolean;
      framework?: string;
    } = {},
  ): Promise<any> {
    return await this.router.route({
      type: 'code-generation',
      complexity: options.complexity || 'moderate',
      priority: 'medium',
      budget: {
        maxCost: options.budget || 0.5,
        timeLimit: 15000,
      },
      qualityRequirements: {
        minAccuracy: 0.85,
        allowExperimental: false,
      },
      context: {
        estimatedTokens: 2000,
        needsReasoning: true,
        requiresCreativity: true,
      },
    });
  }

  async routeCodeReview(
    options: {
      fileCount?: number;
      linesChanged?: number;
      critical?: boolean;
    } = {},
  ): Promise<any> {
    const complexity = this.determineReviewComplexity(
      options.fileCount || 1,
      options.linesChanged || 50,
    );

    return await this.router.route({
      type: 'review',
      complexity,
      priority: options.critical ? 'high' : 'medium',
      budget: {
        maxCost: options.critical ? 2.0 : 0.3,
        timeLimit: 8000,
      },
      qualityRequirements: {
        minAccuracy: options.critical ? 0.95 : 0.85,
        allowExperimental: false,
      },
      context: {
        estimatedTokens: Math.min(8000, (options.linesChanged || 50) * 20),
        needsReasoning: true,
        requiresCreativity: false,
      },
    });
  }

  async routeDebugging(
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      hasStackTrace?: boolean;
      codebaseSize?: 'small' | 'medium' | 'large';
    } = {},
  ): Promise<any> {
    const priority = options.severity || 'medium';
    const complexity =
      options.codebaseSize === 'large' ? 'complex' : 'moderate';

    return await this.router.route({
      type: 'debugging',
      complexity,
      priority,
      budget: {
        maxCost: priority === 'critical' ? 3.0 : 1.0,
        timeLimit: priority === 'critical' ? 5000 : 12000,
      },
      qualityRequirements: {
        minAccuracy: 0.9,
        allowExperimental: priority !== 'critical',
      },
      context: {
        estimatedTokens: options.hasStackTrace ? 3000 : 1500,
        needsReasoning: true,
        requiresCreativity: false,
      },
    });
  }

  async routeDocumentation(
    options: {
      type?: 'api' | 'user' | 'technical' | 'readme';
      length?: 'short' | 'medium' | 'long';
      audience?: 'internal' | 'external';
    } = {},
  ): Promise<any> {
    const tokenMap = {
      short: 500,
      medium: 1500,
      long: 4000,
    };

    return await this.router.route({
      type: 'documentation',
      complexity: options.type === 'technical' ? 'moderate' : 'simple',
      priority: options.audience === 'external' ? 'high' : 'medium',
      budget: {
        maxCost: 0.2,
        timeLimit: 20000,
      },
      qualityRequirements: {
        minAccuracy: 0.8,
        allowExperimental: true,
      },
      context: {
        estimatedTokens: tokenMap[options.length || 'medium'],
        needsReasoning: false,
        requiresCreativity: true,
      },
    });
  }

  // Smart routing based on context analysis
  async smartRoute(input: {
    prompt: string;
    context?: Record<string, any>;
    constraints?: {
      maxCost?: number;
      maxTime?: number;
      minQuality?: number;
    };
  }): Promise<any> {
    const analysis = this.analyzePrompt(input.prompt);

    return await this.router.route({
      type: analysis.type,
      complexity: analysis.complexity,
      priority: analysis.priority,
      budget: {
        maxCost: input.constraints?.maxCost || 1.0,
        timeLimit: input.constraints?.maxTime || 10000,
      },
      qualityRequirements: {
        minAccuracy: input.constraints?.minQuality || 0.8,
        allowExperimental: analysis.allowExperimental,
      },
      context: {
        estimatedTokens: this.estimateTokens(input.prompt, input.context),
        needsReasoning: analysis.needsReasoning,
        requiresCreativity: analysis.requiresCreativity,
      },
    });
  }

  private determineReviewComplexity(
    fileCount: number,
    linesChanged: number,
  ): 'simple' | 'moderate' | 'complex' | 'advanced' {
    if (fileCount <= 2 && linesChanged <= 50) return 'simple';
    if (fileCount <= 5 && linesChanged <= 200) return 'moderate';
    if (fileCount <= 15 && linesChanged <= 500) return 'complex';
    return 'advanced';
  }

  private analyzePrompt(prompt: string): {
    type:
      | 'code-generation'
      | 'analysis'
      | 'review'
      | 'debugging'
      | 'testing'
      | 'documentation';
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
    priority: 'low' | 'medium' | 'high' | 'critical';
    needsReasoning: boolean;
    requiresCreativity: boolean;
    allowExperimental: boolean;
  } {
    const promptLower = prompt.toLowerCase();

    // Determine type
    let type: any = 'analysis';
    if (
      promptLower.includes('generate') ||
      promptLower.includes('create') ||
      promptLower.includes('implement')
    ) {
      type = 'code-generation';
    } else if (
      promptLower.includes('review') ||
      promptLower.includes('check')
    ) {
      type = 'review';
    } else if (
      promptLower.includes('debug') ||
      promptLower.includes('error') ||
      promptLower.includes('fix')
    ) {
      type = 'debugging';
    } else if (promptLower.includes('test') || promptLower.includes('spec')) {
      type = 'testing';
    } else if (
      promptLower.includes('document') ||
      promptLower.includes('readme')
    ) {
      type = 'documentation';
    }

    // Determine complexity
    let complexity: any = 'moderate';
    if (
      promptLower.includes('simple') ||
      promptLower.includes('basic') ||
      prompt.length < 100
    ) {
      complexity = 'simple';
    } else if (
      promptLower.includes('complex') ||
      promptLower.includes('advanced') ||
      prompt.length > 1000
    ) {
      complexity = 'complex';
    }

    // Determine priority
    let priority: any = 'medium';
    if (
      promptLower.includes('urgent') ||
      promptLower.includes('critical') ||
      promptLower.includes('emergency')
    ) {
      priority = 'critical';
    } else if (
      promptLower.includes('important') ||
      promptLower.includes('priority')
    ) {
      priority = 'high';
    } else if (
      promptLower.includes('when you have time') ||
      promptLower.includes('low priority')
    ) {
      priority = 'low';
    }

    return {
      type,
      complexity,
      priority,
      needsReasoning:
        promptLower.includes('why') ||
        promptLower.includes('explain') ||
        promptLower.includes('analyze'),
      requiresCreativity:
        type === 'code-generation' || type === 'documentation',
      allowExperimental:
        priority !== 'critical' && !promptLower.includes('production'),
    };
  }

  private estimateTokens(
    prompt: string,
    context?: Record<string, any>,
  ): number {
    // Rough estimation: ~4 characters per token for English
    let tokens = Math.ceil(prompt.length / 4);

    // Add context tokens
    if (context) {
      const contextStr = JSON.stringify(context);
      tokens += Math.ceil(contextStr.length / 4);
    }

    // Add buffer for response
    tokens *= 2;

    return Math.min(tokens, 8000); // Cap at reasonable limit
  }

  // Budget management helpers
  async getBudgetStatus() {
    return await this.router.getBudgetStatus();
  }

  async updateBudget(daily: number, perRequest: number) {
    return await this.router.updateBudgetLimits(daily, perRequest);
  }

  async recordUsage(
    model: string,
    cost: number,
    latency: number,
    success: boolean,
  ) {
    return await this.router.recordModelUsage(model, cost, latency, success);
  }
}
