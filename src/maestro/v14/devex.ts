/**
 * DevEx Interface - Auto-ADR & Explain-my-Blocker
 * Make decisions and blockers obvious for developers
 */

import { EventEmitter } from 'events';
import { DecisionCard } from './index';

export interface ADR {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string[];
  linkedSpec: string;
  linkedEvidence: string[];
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  createdAt: number;
  author: string;
}

export interface BlockerExplanation {
  blockerId: string;
  prId: string;
  reason: string;
  type: 'policy' | 'budget' | 'quality' | 'security' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  unblockingSteps: Array<{
    step: string;
    description: string;
    estimatedTime: string;
    automated: boolean;
  }>;
  relatedDocs: string[];
  contactInfo: string;
}

export interface FixItAction {
  id: string;
  name: string;
  description: string;
  type: 'codemod' | 'rename' | 'docs' | 'tests' | 'policy';
  automated: boolean;
  riskLevel: 'safe' | 'medium' | 'risky';
  estimatedTime: string;
}

export class DevExInterface extends EventEmitter {
  private adrs: Map<string, ADR> = new Map();
  private blockerExplanations: Map<string, BlockerExplanation> = new Map();
  private fixItActions: Map<string, FixItAction> = new Map();
  private adrCounter: number = 1;

  constructor() {
    super();
    this.initializeFixItActions();
  }

  private initializeFixItActions(): void {
    // Define available Fix-It actions
    const actions: FixItAction[] = [
      {
        id: 'rename-api',
        name: 'Rename API',
        description: 'Automatically rename API endpoints and update references',
        type: 'rename',
        automated: true,
        riskLevel: 'medium',
        estimatedTime: '2-5 minutes',
      },
      {
        id: 'patch-docs',
        name: 'Patch Documentation',
        description: 'Auto-generate and update documentation for code changes',
        type: 'docs',
        automated: true,
        riskLevel: 'safe',
        estimatedTime: '1-3 minutes',
      },
      {
        id: 'add-tests',
        name: 'Add Missing Tests',
        description: 'Generate test cases for uncovered code paths',
        type: 'tests',
        automated: true,
        riskLevel: 'safe',
        estimatedTime: '5-10 minutes',
      },
      {
        id: 'fix-lint',
        name: 'Fix Lint Issues',
        description: 'Automatically fix code style and lint violations',
        type: 'codemod',
        automated: true,
        riskLevel: 'safe',
        estimatedTime: '30 seconds',
      },
      {
        id: 'update-policy',
        name: 'Update Policy Compliance',
        description: 'Apply policy-compliant code transformations',
        type: 'policy',
        automated: false,
        riskLevel: 'medium',
        estimatedTime: '10-20 minutes',
      },
    ];

    for (const action of actions) {
      this.fixItActions.set(action.id, action);
    }
  }

  /**
   * Generate an Architectural Decision Record for significant changes
   */
  async generateAutoADR(decisionCard: DecisionCard): Promise<ADR> {
    const adrId = `ADR-${new Date().toISOString().slice(0, 10)}-${this.adrCounter++}`;

    const adr: ADR = {
      id: adrId,
      title: await this.generateADRTitle(decisionCard),
      context: await this.generateADRContext(decisionCard),
      decision: await this.generateADRDecision(decisionCard),
      consequences: await this.generateADRConsequences(decisionCard),
      linkedSpec: '', // Will be filled by TraceMesh
      linkedEvidence: decisionCard.evidenceBundle,
      status: 'proposed',
      createdAt: Date.now(),
      author: 'Maestro v1.4',
    };

    this.adrs.set(adrId, adr);
    this.emit('adrGenerated', adr);

    return adr;
  }

  private async generateADRTitle(decisionCard: DecisionCard): Promise<string> {
    // Generate meaningful ADR title based on decision context
    const prId = decisionCard.prId;
    const arm = decisionCard.arm;
    const riskLevel =
      decisionCard.riskAssessment > 0.5 ? 'High-Risk' : 'Standard';

    return `${riskLevel} Implementation Strategy for PR-${prId} using ${arm}`;
  }

  private async generateADRContext(
    decisionCard: DecisionCard,
  ): Promise<string> {
    const okrImpacts = Object.keys(decisionCard.okrImpact);
    const riskDescription = this.getRiskDescription(
      decisionCard.riskAssessment,
    );

    return (
      `This decision addresses PR ${decisionCard.prId} which impacts OKRs: ${okrImpacts.join(', ')}. ` +
      `The change carries ${riskDescription} risk (${(decisionCard.riskAssessment * 100).toFixed(1)}%) ` +
      `and has an estimated cost of $${decisionCard.cost.toFixed(2)} with carbon footprint of ${decisionCard.carbon.toFixed(2)}g CO2e.`
    );
  }

  private async generateADRDecision(
    decisionCard: DecisionCard,
  ): Promise<string> {
    return (
      `Implement using ${decisionCard.arm} approach with evaluation score of ${decisionCard.evalScore.toFixed(3)}. ` +
      `This decision was made based on: ${decisionCard.rationale}`
    );
  }

  private async generateADRConsequences(
    decisionCard: DecisionCard,
  ): Promise<string[]> {
    const consequences: string[] = [];

    // Positive consequences
    consequences.push(
      `Expected improvement in affected OKRs: ${Object.values(
        decisionCard.okrImpact,
      )
        .map((v) => `+${(v * 100).toFixed(1)}%`)
        .join(', ')}`,
    );
    consequences.push(
      `Cost efficiency achieved at $${decisionCard.cost.toFixed(2)} per PR`,
    );

    // Risk-based consequences
    if (decisionCard.riskAssessment > 0.6) {
      consequences.push(
        'High risk requires additional monitoring and potential rollback procedures',
      );
      consequences.push(
        'Consider implementing feature flags for safer deployment',
      );
    }

    // Policy consequences
    if (decisionCard.policyReasons.length > 0) {
      consequences.push(
        `Policy compliance verified: ${decisionCard.policyReasons.join(', ')}`,
      );
    }

    // Carbon consequences
    if (decisionCard.carbon > 1.0) {
      consequences.push(
        `Carbon impact of ${decisionCard.carbon.toFixed(2)}g CO2e requires offset consideration`,
      );
    }

    return consequences;
  }

  private getRiskDescription(riskScore: number): string {
    if (riskScore < 0.2) return 'minimal';
    if (riskScore < 0.4) return 'low';
    if (riskScore < 0.6) return 'moderate';
    if (riskScore < 0.8) return 'high';
    return 'critical';
  }

  /**
   * Explain why a PR is blocked with actionable steps
   */
  async explainBlocker(prId: string, error: Error): Promise<string> {
    const blockerId = `blocker-${prId}-${Date.now()}`;

    const explanation = await this.analyzeBlocker(prId, error);
    this.blockerExplanations.set(blockerId, explanation);

    this.emit('blockerExplained', explanation);

    return this.formatBlockerExplanation(explanation);
  }

  private async analyzeBlocker(
    prId: string,
    error: Error,
  ): Promise<BlockerExplanation> {
    const errorMessage = error.message.toLowerCase();

    // Determine blocker type and generate explanation
    let type: 'policy' | 'budget' | 'quality' | 'security' | 'technical' =
      'technical';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let reason = error.message;
    let unblockingSteps: any[] = [];

    if (errorMessage.includes('policy')) {
      type = 'policy';
      severity = 'high';
      reason =
        'Policy violation detected - changes do not comply with organizational policies';
      unblockingSteps = [
        {
          step: 'Review policy violations',
          description:
            'Check the policy simulation results for specific violations',
          estimatedTime: '5-10 minutes',
          automated: false,
        },
        {
          step: 'Modify implementation',
          description: 'Adjust the code to comply with policy requirements',
          estimatedTime: '30-60 minutes',
          automated: false,
        },
        {
          step: 'Re-run policy simulation',
          description: 'Validate that changes now comply with policies',
          estimatedTime: '2-3 minutes',
          automated: true,
        },
      ];
    } else if (errorMessage.includes('budget')) {
      type = 'budget';
      severity = 'medium';
      reason =
        'Resource budget exceeded - insufficient allocation for this change';
      unblockingSteps = [
        {
          step: 'Review resource usage',
          description: 'Check current budget utilization and requirements',
          estimatedTime: '2-5 minutes',
          automated: false,
        },
        {
          step: 'Optimize implementation',
          description:
            'Reduce resource requirements or split into smaller changes',
          estimatedTime: '20-40 minutes',
          automated: false,
        },
        {
          step: 'Request budget increase',
          description: 'Contact team lead to increase resource allocation',
          estimatedTime: '1-2 hours',
          automated: false,
        },
      ];
    } else if (
      errorMessage.includes('coverage') ||
      errorMessage.includes('spec')
    ) {
      type = 'quality';
      severity = 'medium';
      reason =
        'Quality gate failure - insufficient test coverage or missing specifications';
      unblockingSteps = [
        {
          step: 'Add missing tests',
          description: 'Write tests to cover the changed functionality',
          estimatedTime: '30-90 minutes',
          automated: false,
        },
        {
          step: 'Generate spec cards',
          description: 'Create specification cards for the changes',
          estimatedTime: '15-30 minutes',
          automated: true,
        },
        {
          step: 'Verify coverage',
          description: 'Ensure coverage meets the required threshold (≥95%)',
          estimatedTime: '5 minutes',
          automated: true,
        },
      ];
    } else if (
      errorMessage.includes('security') ||
      errorMessage.includes('vulnerability')
    ) {
      type = 'security';
      severity = 'critical';
      reason =
        'Security issue detected - potential vulnerability or unauthorized access';
      unblockingSteps = [
        {
          step: 'Security review',
          description: 'Conduct thorough security analysis of the changes',
          estimatedTime: '60-120 minutes',
          automated: false,
        },
        {
          step: 'Apply security patches',
          description: 'Implement security fixes and hardening measures',
          estimatedTime: '30-90 minutes',
          automated: false,
        },
        {
          step: 'Security scan',
          description: 'Run automated security scans to verify fixes',
          estimatedTime: '10-15 minutes',
          automated: true,
        },
      ];
    }

    return {
      blockerId: `blocker-${prId}-${Date.now()}`,
      prId,
      reason,
      type,
      severity,
      unblockingSteps,
      relatedDocs: this.getRelatedDocs(type),
      contactInfo: this.getContactInfo(type),
    };
  }

  private getRelatedDocs(type: string): string[] {
    const docs: Record<string, string[]> = {
      policy: [
        'https://docs.company.com/policies/development',
        'https://docs.company.com/security/compliance',
      ],
      budget: [
        'https://docs.company.com/resources/budgets',
        'https://docs.company.com/optimization/cost',
      ],
      quality: [
        'https://docs.company.com/testing/standards',
        'https://docs.company.com/quality/gates',
      ],
      security: [
        'https://docs.company.com/security/guidelines',
        'https://docs.company.com/security/scanning',
      ],
      technical: [
        'https://docs.company.com/development/standards',
        'https://docs.company.com/troubleshooting',
      ],
    };
    return docs[type] || docs['technical'];
  }

  private getContactInfo(type: string): string {
    const contacts: Record<string, string> = {
      policy: 'policy-team@company.com or #policy-support',
      budget: 'resource-management@company.com or #budget-help',
      quality: 'qa-team@company.com or #quality-gates',
      security: 'security-team@company.com or #security-urgent',
      technical: 'dev-support@company.com or #engineering-help',
    };
    return contacts[type] || contacts['technical'];
  }

  private formatBlockerExplanation(explanation: BlockerExplanation): string {
    let formatted = `🚫 ${explanation.reason}\n\n`;
    formatted += `**Type:** ${explanation.type.toUpperCase()}\n`;
    formatted += `**Severity:** ${explanation.severity.toUpperCase()}\n\n`;
    formatted += `**To unblock this PR:**\n`;

    explanation.unblockingSteps.forEach((step, index) => {
      formatted += `${index + 1}. **${step.step}** (${step.estimatedTime})\n`;
      formatted += `   ${step.description}\n`;
      if (step.automated) {
        formatted += `   ✅ This step can be automated\n`;
      }
      formatted += `\n`;
    });

    formatted += `**Need help?** Contact: ${explanation.contactInfo}\n`;
    formatted += `**Documentation:** ${explanation.relatedDocs.join(', ')}\n`;

    return formatted;
  }

  /**
   * Execute a Fix-It action
   */
  async executeFixItAction(
    actionId: string,
    prId: string,
    params: Record<string, any> = {},
  ): Promise<{
    success: boolean;
    message: string;
    changes?: string[];
    nextSteps?: string[];
  }> {
    const action = this.fixItActions.get(actionId);
    if (!action) {
      return {
        success: false,
        message: `Unknown Fix-It action: ${actionId}`,
      };
    }

    try {
      const result = await this.performFixItAction(action, prId, params);
      this.emit('fixItActionExecuted', {
        actionId,
        prId,
        success: result.success,
      });
      return result;
    } catch (error) {
      this.emit('fixItActionFailed', { actionId, prId, error: error.message });
      return {
        success: false,
        message: `Fix-It action failed: ${error.message}`,
      };
    }
  }

  private async performFixItAction(
    action: FixItAction,
    prId: string,
    params: Record<string, any>,
  ): Promise<{
    success: boolean;
    message: string;
    changes?: string[];
    nextSteps?: string[];
  }> {
    switch (action.type) {
      case 'rename':
        return this.performRename(prId, params);
      case 'docs':
        return this.performDocsPatch(prId, params);
      case 'tests':
        return this.performTestGeneration(prId, params);
      case 'codemod':
        return this.performCodemod(prId, params);
      case 'policy':
        return this.performPolicyUpdate(prId, params);
      default:
        return {
          success: false,
          message: `Unsupported action type: ${action.type}`,
        };
    }
  }

  private async performRename(prId: string, params: any): Promise<any> {
    // Simulate API renaming
    const from = params.from || 'oldApiName';
    const to = params.to || 'newApiName';

    return {
      success: true,
      message: `Successfully renamed ${from} to ${to}`,
      changes: [
        `Renamed function ${from} to ${to} in src/api/endpoints.ts`,
        `Updated 12 references across 5 files`,
        `Updated API documentation`,
      ],
      nextSteps: [
        'Review the changes to ensure correctness',
        'Update integration tests if needed',
        'Notify dependent services of the API change',
      ],
    };
  }

  private async performDocsPatch(prId: string, params: any): Promise<any> {
    // Simulate documentation generation
    return {
      success: true,
      message: 'Documentation successfully generated and updated',
      changes: [
        'Generated API documentation for new endpoints',
        'Updated README.md with usage examples',
        'Added inline code comments for complex functions',
      ],
      nextSteps: [
        'Review generated documentation for accuracy',
        'Consider adding more examples if needed',
      ],
    };
  }

  private async performTestGeneration(prId: string, params: any): Promise<any> {
    // Simulate test generation
    return {
      success: true,
      message: 'Test cases generated for uncovered code paths',
      changes: [
        'Added 8 unit tests to cover new functionality',
        'Generated integration tests for API endpoints',
        'Added edge case tests for error handling',
      ],
      nextSteps: [
        'Review generated tests for completeness',
        'Run tests to ensure they pass',
        'Add performance tests if needed',
      ],
    };
  }

  private async performCodemod(prId: string, params: any): Promise<any> {
    // Simulate code style fixes
    return {
      success: true,
      message: 'Code style and lint issues fixed',
      changes: [
        'Fixed 23 ESLint violations',
        'Applied Prettier formatting to 8 files',
        'Removed unused imports and variables',
      ],
      nextSteps: [
        'Verify that all lint checks now pass',
        'Run tests to ensure functionality is unchanged',
      ],
    };
  }

  private async performPolicyUpdate(prId: string, params: any): Promise<any> {
    // Simulate policy compliance updates
    return {
      success: false,
      message: 'Policy updates require manual review',
      nextSteps: [
        'Review policy violations in detail',
        'Consult with security team for guidance',
        'Implement necessary security measures',
        'Re-run policy validation',
      ],
    };
  }

  /**
   * Get available Fix-It actions for a PR
   */
  getAvailableFixItActions(
    prId: string,
    context: {
      hasLintIssues?: boolean;
      missingDocs?: boolean;
      missingTests?: boolean;
      needsRename?: boolean;
      policyViolations?: boolean;
    },
  ): FixItAction[] {
    const available: FixItAction[] = [];

    if (context.hasLintIssues) {
      available.push(this.fixItActions.get('fix-lint')!);
    }

    if (context.missingDocs) {
      available.push(this.fixItActions.get('patch-docs')!);
    }

    if (context.missingTests) {
      available.push(this.fixItActions.get('add-tests')!);
    }

    if (context.needsRename) {
      available.push(this.fixItActions.get('rename-api')!);
    }

    if (context.policyViolations) {
      available.push(this.fixItActions.get('update-policy')!);
    }

    return available;
  }

  /**
   * Get ADR by ID
   */
  getADR(adrId: string): ADR | undefined {
    return this.adrs.get(adrId);
  }

  /**
   * Get all ADRs
   */
  getAllADRs(): ADR[] {
    return Array.from(this.adrs.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  /**
   * Get blocker explanation
   */
  getBlockerExplanation(blockerId: string): BlockerExplanation | undefined {
    return this.blockerExplanations.get(blockerId);
  }

  /**
   * Update ADR status
   */
  updateADRStatus(
    adrId: string,
    status: 'proposed' | 'accepted' | 'deprecated' | 'superseded',
  ): void {
    const adr = this.adrs.get(adrId);
    if (adr) {
      adr.status = status;
      this.emit('adrStatusUpdated', { adrId, status });
    }
  }

  /**
   * Search ADRs by criteria
   */
  searchADRs(criteria: {
    title?: string;
    status?: string;
    dateRange?: { start: number; end: number };
  }): ADR[] {
    const adrs = this.getAllADRs();

    return adrs.filter((adr) => {
      if (
        criteria.title &&
        !adr.title.toLowerCase().includes(criteria.title.toLowerCase())
      ) {
        return false;
      }
      if (criteria.status && adr.status !== criteria.status) {
        return false;
      }
      if (
        criteria.dateRange &&
        (adr.createdAt < criteria.dateRange.start ||
          adr.createdAt > criteria.dateRange.end)
      ) {
        return false;
      }
      return true;
    });
  }
}

export default DevExInterface;
