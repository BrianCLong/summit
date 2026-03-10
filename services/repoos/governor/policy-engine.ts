/**
 * RepoOS Autonomous Governor - Policy Decision Engine
 *
 * Central policy evaluation system that determines whether proposed
 * repository actions should be allowed, denied, delayed, or escalated.
 *
 * Design Principles:
 * - Constitutional enforcement (immutable rules)
 * - Explainable decisions (every deny includes reasons)
 * - Deterministic evaluation (same input = same output)
 * - Precedence-based aggregation (deny > human review > delay > allow)
 *
 * This is the core governance layer that makes RepoOS trustworthy for
 * autonomous operation.
 */

import {
  CandidateAction,
  PolicyDecision,
  PolicyRule,
  PolicyContext,
  RepoState,
  ExecutionMode,
  KillSwitches,
  DecisionOutcome,
  DecisionSeverity,
  ConstitutionalViolation,
} from './decision-types.js';

// ============================================================================
// DECISION PRECEDENCE
// ============================================================================

/**
 * Decision outcome precedence (strongest to weakest)
 */
const DECISION_PRECEDENCE: Record<DecisionOutcome, number> = {
  'deny': 4,
  'require_human_review': 3,
  'delay': 2,
  'allow': 1,
};

/**
 * Severity precedence (highest to lowest)
 */
const SEVERITY_PRECEDENCE: Record<DecisionSeverity, number> = {
  'critical': 4,
  'high': 3,
  'medium': 2,
  'low': 1,
};

// ============================================================================
// POLICY ENGINE
// ============================================================================

export class PolicyEngine {
  private rules: PolicyRule[] = [];
  private constitutionalRules: PolicyRule[] = [];

  constructor() {
    this.initializeConstitutionalRules();
    this.initializeOperationalRules();
  }

  /**
   * Initialize immutable constitutional rules
   * These cannot be disabled and enforce fundamental laws
   */
  private initializeConstitutionalRules() {
    this.constitutionalRules = [
      this.createFrontierSovereigntyRule(),
      this.createDeterministicIntegrationRule(),
      this.createEvidencePreservationRule(),
      this.createSystemHomeostasisRule(),
      this.createEvolutionaryContinuityRule(),
      this.createRunDeterminismRule(), // New: Law #6 from antigravity integration
    ];
  }

  /**
   * Initialize operational policy rules
   * These can be configured but must respect constitutional rules
   */
  private initializeOperationalRules() {
    this.rules = [
      this.createProtectedPathRule(),
      this.createCIGatingRule(),
      this.createIncidentModeRule(),
      this.createReleaseFreezeRule(),
      this.createAgentScopeRule(),
      this.createOwnershipRule(),
      this.createBatchSizeRule(),
      this.createMergeableRule(),
    ];
  }

  // ==========================================================================
  // CONSTITUTIONAL RULES (IMMUTABLE)
  // ==========================================================================

  /**
   * Law #1: Frontier Sovereignty
   * No direct modification of frontier-owned domains
   */
  private createFrontierSovereigntyRule(): PolicyRule {
    return {
      id: 'constitutional.frontier_sovereignty',
      name: 'Frontier Sovereignty',
      description: 'Prevent direct modification of frontier-managed state',
      priority: 1000,
      enabled: true,
      evaluate: (action, state) => {
        // Check if action bypasses frontier protocol
        if (action.type === 'merge_pr' && action.metadata?.bypassFrontier) {
          return {
            allowed: false,
            decision: 'deny',
            severity: 'critical',
            reasons: [
              'Constitutional violation: Frontier Sovereignty',
              'Cannot bypass frontier convergence protocol',
              'All merges must flow through frontier engine',
            ],
            evidence: {
              law: 'frontier_sovereignty',
              actionType: action.type,
              bypassAttempt: true,
            },
            policyRuleIds: [this.id],
            timestamp: new Date().toISOString(),
          };
        }
        return null;
      },
    };
  }

  /**
   * Law #2: Deterministic Integration
   * Repository evolution must be reproducible
   */
  private createDeterministicIntegrationRule(): PolicyRule {
    return {
      id: 'constitutional.deterministic_integration',
      name: 'Deterministic Integration',
      description: 'Ensure reproducible repository evolution',
      priority: 1000,
      enabled: true,
      evaluate: (action, state) => {
        // Check for required determinism markers
        if (action.type === 'merge_pr' || action.type === 'batch_prs') {
          const hasManifest = action.metadata?.manifestUri;
          const hasPolicyHash = action.metadata?.policyHash;

          if (!hasManifest || !hasPolicyHash) {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'critical',
              reasons: [
                'Constitutional violation: Deterministic Integration',
                'Missing required determinism markers',
                'All merges must include manifest URI and policy hash',
              ],
              evidence: {
                law: 'deterministic_integration',
                hasManifest: !!hasManifest,
                hasPolicyHash: !!hasPolicyHash,
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }
        return null;
      },
    };
  }

  /**
   * Law #3: Evidence Preservation
   * All evolution must produce artifacts
   */
  private createEvidencePreservationRule(): PolicyRule {
    return {
      id: 'constitutional.evidence_preservation',
      name: 'Evidence Preservation',
      description: 'All operations must produce audit artifacts',
      priority: 1000,
      enabled: true,
      evaluate: (action, state) => {
        // Check for evidence artifact commitment
        const hasEvidenceCommitment = action.metadata?.evidenceArtifactPath;

        if (!hasEvidenceCommitment && action.type !== 'defer') {
          return {
            allowed: false,
            decision: 'deny',
            severity: 'high',
            reasons: [
              'Constitutional violation: Evidence Preservation',
              'No evidence artifact path specified',
              'All operations must commit to producing evidence',
            ],
            evidence: {
              law: 'evidence_preservation',
              actionType: action.type,
            },
            policyRuleIds: [this.id],
            timestamp: new Date().toISOString(),
          };
        }
        return null;
      },
    };
  }

  /**
   * Law #4: System Homeostasis
   * Must maintain operational health
   */
  private createSystemHomeostasisRule(): PolicyRule {
    return {
      id: 'constitutional.system_homeostasis',
      name: 'System Homeostasis',
      description: 'Prevent actions that destabilize the repository',
      priority: 1000,
      enabled: true,
      evaluate: (action, state) => {
        // Check entropy velocity
        if (state.entropyScore && state.entropyScore > 0.01) {
          return {
            allowed: false,
            decision: 'delay',
            severity: 'critical',
            reasons: [
              'Constitutional protection: System Homeostasis',
              `Entropy velocity critical: ${state.entropyScore} > 0.01`,
              'Repository must stabilize before new changes',
            ],
            evidence: {
              law: 'system_homeostasis',
              entropyScore: state.entropyScore,
              threshold: 0.01,
            },
            policyRuleIds: [this.id],
            timestamp: new Date().toISOString(),
          };
        }

        // Check active frontiers
        if (state.activeFrontiers && state.activeFrontiers > 300) {
          return {
            allowed: false,
            decision: 'delay',
            severity: 'high',
            reasons: [
              'Constitutional protection: System Homeostasis',
              `Active frontiers exceed limit: ${state.activeFrontiers} > 300`,
              'Frontier explosion detected - convergence required',
            ],
            evidence: {
              law: 'system_homeostasis',
              activeFrontiers: state.activeFrontiers,
              threshold: 300,
            },
            policyRuleIds: [this.id],
            timestamp: new Date().toISOString(),
          };
        }

        return null;
      },
    };
  }

  /**
   * Law #5: Evolutionary Continuity
   * Core RepoOS components protected
   */
  private createEvolutionaryContinuityRule(): PolicyRule {
    const PROTECTED_COMPONENTS = [
      'services/repoos/concern-router.mjs',
      'services/repoos/frontier-engine.mjs',
      'services/repoos/frontier-lock.mjs',
      'services/repoos/frontier-entropy.mjs',
      'services/repoos/patch-window-manager.mjs',
      'services/repoos/patch-market.mjs',
      'services/repoos/governor/',
      '.repoos/constitution.yml',
    ];

    return {
      id: 'constitutional.evolutionary_continuity',
      name: 'Evolutionary Continuity',
      description: 'Protect core RepoOS components from removal',
      priority: 1000,
      enabled: true,
      evaluate: (action, state) => {
        // Find relevant PR state
        const prStates = action.targetIds
          .map(id => state.prs.find(pr => pr.id === id || pr.number.toString() === id))
          .filter(Boolean);

        for (const prState of prStates) {
          const touchesProtected = prState?.changedFiles.some(file =>
            PROTECTED_COMPONENTS.some(comp => file.startsWith(comp))
          );

          if (touchesProtected) {
            // Check if it's removal
            const isRemoval = prState?.metadata?.hasRemovals;

            if (isRemoval) {
              return {
                allowed: false,
                decision: 'deny',
                severity: 'critical',
                reasons: [
                  'Constitutional violation: Evolutionary Continuity',
                  'Cannot remove core RepoOS components',
                  'Protected components ensure self-evolution capability',
                ],
                evidence: {
                  law: 'evolutionary_continuity',
                  prNumber: prState?.number,
                  protectedFiles: prState?.changedFiles.filter(f =>
                    PROTECTED_COMPONENTS.some(comp => f.startsWith(comp))
                  ),
                },
                policyRuleIds: [this.id],
                timestamp: new Date().toISOString(),
              };
            }

            // Modifications require review
            return {
              allowed: false,
              decision: 'require_human_review',
              severity: 'high',
              reasons: [
                'Constitutional protection: Evolutionary Continuity',
                'Modifications to core components require human review',
                'Changes affect RepoOS self-evolution capability',
              ],
              evidence: {
                law: 'evolutionary_continuity',
                prNumber: prState?.number,
                protectedFiles: prState?.changedFiles.filter(f =>
                  PROTECTED_COMPONENTS.some(comp => f.startsWith(comp))
                ),
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Law #6: Run Determinism (from Antigravity Integration)
   * All writes must carry run provenance
   */
  private createRunDeterminismRule(): PolicyRule {
    return {
      id: 'constitutional.run_determinism',
      name: 'Run Determinism',
      description: 'Ensure run-level provenance for all operations',
      priority: 1000,
      enabled: true,
      evaluate: (action, state) => {
        if (action.type === 'merge_pr' || action.type === 'batch_prs') {
          const hasRunId = action.metadata?.runId;
          const hasCostBudget = action.metadata?.costBudget !== undefined;

          if (!hasRunId) {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'critical',
              reasons: [
                'Constitutional violation: Run Determinism',
                'Missing run_id for merge operation',
                'All operations must be traceable to originating run',
              ],
              evidence: {
                law: 'run_determinism',
                hasRunId: false,
                hasCostBudget,
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }
        return null;
      },
    };
  }

  // ==========================================================================
  // OPERATIONAL RULES
  // ==========================================================================

  /**
   * Protected Path Rule
   * Sensitive paths require human review
   */
  private createProtectedPathRule(): PolicyRule {
    return {
      id: 'operational.protected_paths',
      name: 'Protected Paths',
      description: 'Require review for sensitive file changes',
      priority: 100,
      enabled: true,
      evaluate: (action, state) => {
        const prStates = action.targetIds
          .map(id => state.prs.find(pr => pr.id === id || pr.number.toString() === id))
          .filter(Boolean);

        for (const prState of prStates) {
          const touchesProtected = prState?.changedFiles.some(file =>
            state.protectedPaths.some(pattern => this.matchPattern(file, pattern))
          );

          if (touchesProtected) {
            // Additional severity for agent actors
            const severity = prState?.actorType === 'agent' ? 'critical' : 'high';

            return {
              allowed: false,
              decision: 'require_human_review',
              severity,
              reasons: [
                `Protected paths touched: ${prState?.changedFiles.filter(f =>
                  state.protectedPaths.some(p => this.matchPattern(f, p))
                ).join(', ')}`,
                prState?.actorType === 'agent'
                  ? 'Agent modifications to protected paths require strict review'
                  : 'Protected paths require human approval',
              ],
              evidence: {
                prNumber: prState?.number,
                actorType: prState?.actorType,
                protectedFiles: prState?.changedFiles.filter(f =>
                  state.protectedPaths.some(p => this.matchPattern(f, p))
                ),
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * CI Gating Rule
   * Block merges with failing CI
   */
  private createCIGatingRule(): PolicyRule {
    return {
      id: 'operational.ci_gating',
      name: 'CI Status Gating',
      description: 'Require green CI for merges',
      priority: 90,
      enabled: true,
      evaluate: (action, state) => {
        if (action.type !== 'merge_pr' && action.type !== 'batch_prs') {
          return null;
        }

        const prStates = action.targetIds
          .map(id => state.prs.find(pr => pr.id === id || pr.number.toString() === id))
          .filter(Boolean);

        for (const prState of prStates) {
          if (prState?.ciStatus === 'red') {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'high',
              reasons: [
                `PR #${prState.number} has failing CI`,
                'Cannot merge with red CI status',
                'Fix CI failures before merging',
              ],
              evidence: {
                prNumber: prState.number,
                ciStatus: 'red',
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }

          if (prState?.ciStatus === 'pending') {
            return {
              allowed: false,
              decision: 'delay',
              severity: 'medium',
              reasons: [
                `PR #${prState.number} has pending CI`,
                'Wait for CI to complete before merging',
              ],
              evidence: {
                prNumber: prState.number,
                ciStatus: 'pending',
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Incident Mode Rule
   * Block automation during incidents
   */
  private createIncidentModeRule(): PolicyRule {
    return {
      id: 'operational.incident_mode',
      name: 'Incident Mode Protection',
      description: 'Disable automation during incidents',
      priority: 150,
      enabled: true,
      evaluate: (action, state) => {
        if (state.incidentMode) {
          // Only observation actions allowed
          if (action.type !== 'defer' && action.type !== 'label_pr') {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'critical',
              reasons: [
                'Repository is in incident mode',
                'Automation disabled until incident resolved',
                'Only observation and labeling permitted',
              ],
              evidence: {
                incidentMode: true,
                actionType: action.type,
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
              recommendation: 'Wait for incident resolution',
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Release Freeze Rule
   * Block merges during release freeze
   */
  private createReleaseFreezeRule(): PolicyRule {
    return {
      id: 'operational.release_freeze',
      name: 'Release Freeze Protection',
      description: 'Prevent merges during release freeze',
      priority: 140,
      enabled: true,
      evaluate: (action, state) => {
        if (state.releaseFreeze) {
          if (action.type === 'merge_pr' || action.type === 'batch_prs') {
            return {
              allowed: false,
              decision: 'delay',
              severity: 'high',
              reasons: [
                'Repository is in release freeze',
                'Merges suspended until freeze lifted',
              ],
              evidence: {
                releaseFreeze: true,
                actionType: action.type,
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
              recommendation: 'Wait for release freeze to end',
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Agent Scope Rule
   * Restrict agent authority on sensitive operations
   */
  private createAgentScopeRule(): PolicyRule {
    const AGENT_FORBIDDEN_PATHS = [
      '.github/workflows/',
      'governance/',
      'policy/',
      'services/repoos/governor/',
    ];

    return {
      id: 'operational.agent_scope',
      name: 'Agent Scope Restriction',
      description: 'Limit agent authority on sensitive paths',
      priority: 110,
      enabled: true,
      evaluate: (action, state) => {
        if (action.actor !== 'agent') {
          return null;
        }

        const prStates = action.targetIds
          .map(id => state.prs.find(pr => pr.id === id || pr.number.toString() === id))
          .filter(Boolean);

        for (const prState of prStates) {
          if (prState?.actorType === 'agent') {
            const touchesForbidden = prState.changedFiles.some(file =>
              AGENT_FORBIDDEN_PATHS.some(pattern => file.startsWith(pattern))
            );

            if (touchesForbidden) {
              return {
                allowed: false,
                decision: 'require_human_review',
                severity: 'critical',
                reasons: [
                  'Agent attempting to modify governance/policy/workflow files',
                  'Agents cannot self-modify governance infrastructure',
                  'Human review required for safety',
                ],
                evidence: {
                  prNumber: prState.number,
                  agentType: action.agentType,
                  forbiddenFiles: prState.changedFiles.filter(f =>
                    AGENT_FORBIDDEN_PATHS.some(p => f.startsWith(p))
                  ),
                },
                policyRuleIds: [this.id],
                timestamp: new Date().toISOString(),
              };
            }
          }
        }

        return null;
      },
    };
  }

  /**
   * Ownership Rule
   * Require appropriate reviews
   */
  private createOwnershipRule(): PolicyRule {
    return {
      id: 'operational.ownership',
      name: 'Ownership and Review',
      description: 'Ensure proper review coverage',
      priority: 80,
      enabled: true,
      evaluate: (action, state) => {
        if (action.type !== 'merge_pr' && action.type !== 'batch_prs') {
          return null;
        }

        const prStates = action.targetIds
          .map(id => state.prs.find(pr => pr.id === id || pr.number.toString() === id))
          .filter(Boolean);

        for (const prState of prStates) {
          if (prState?.reviewStatus === 'changes_requested') {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'medium',
              reasons: [
                `PR #${prState.number} has requested changes`,
                'Address review feedback before merging',
              ],
              evidence: {
                prNumber: prState.number,
                reviewStatus: 'changes_requested',
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }

          if (prState?.reviewStatus === 'pending') {
            return {
              allowed: false,
              decision: 'require_human_review',
              severity: 'medium',
              reasons: [
                `PR #${prState.number} lacks approval`,
                'Review required before merge',
              ],
              evidence: {
                prNumber: prState.number,
                reviewStatus: 'pending',
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Batch Size Rule
   * Limit batch complexity
   */
  private createBatchSizeRule(): PolicyRule {
    return {
      id: 'operational.batch_size',
      name: 'Batch Size Limit',
      description: 'Prevent overly large batches',
      priority: 70,
      enabled: true,
      evaluate: (action, state) => {
        if (action.type === 'batch_prs') {
          if (action.targetIds.length > 10) {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'medium',
              reasons: [
                `Batch too large: ${action.targetIds.length} PRs`,
                'Maximum batch size is 10 PRs',
                'Split into smaller batches for safety',
              ],
              evidence: {
                batchSize: action.targetIds.length,
                maxBatchSize: 10,
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Mergeable Rule
   * Ensure PRs can be merged
   */
  private createMergeableRule(): PolicyRule {
    return {
      id: 'operational.mergeable',
      name: 'Merge Conflict Prevention',
      description: 'Block PRs with conflicts',
      priority: 85,
      enabled: true,
      evaluate: (action, state) => {
        if (action.type !== 'merge_pr' && action.type !== 'batch_prs') {
          return null;
        }

        const prStates = action.targetIds
          .map(id => state.prs.find(pr => pr.id === id || pr.number.toString() === id))
          .filter(Boolean);

        for (const prState of prStates) {
          if (prState?.mergeable === false) {
            return {
              allowed: false,
              decision: 'deny',
              severity: 'high',
              reasons: [
                `PR #${prState.number} has merge conflicts`,
                'Resolve conflicts before merging',
              ],
              evidence: {
                prNumber: prState.number,
                mergeable: false,
              },
              policyRuleIds: [this.id],
              timestamp: new Date().toISOString(),
              recommendation: 'Rebase or merge main into PR',
            };
          }
        }

        return null;
      },
    };
  }

  // ==========================================================================
  // CORE EVALUATION LOGIC
  // ==========================================================================

  /**
   * Evaluate candidate action through all policy rules
   */
  public async evaluateCandidateAction(
    action: CandidateAction,
    repoState: RepoState,
    executionMode: ExecutionMode = 'observe_only',
    killSwitches?: Partial<KillSwitches>
  ): Promise<PolicyDecision> {
    const context: PolicyContext = {
      action,
      repoState,
      executionMode,
      killSwitches: {
        globalAutonomyOff: false,
        executorOff: false,
        agentProposalIntakeOff: false,
        forecastOnly: false,
        manualApprovalOnly: false,
        ...killSwitches,
      },
    };

    // Check kill switches first
    const killSwitchDecision = this.checkKillSwitches(context);
    if (killSwitchDecision) {
      return killSwitchDecision;
    }

    // Evaluate constitutional rules (cannot be bypassed)
    const decisions: PolicyDecision[] = [];

    for (const rule of this.constitutionalRules) {
      if (!rule.enabled) continue;
      const decision = rule.evaluate(action, repoState);
      if (decision) {
        decisions.push(decision);
      }
    }

    // Evaluate operational rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      const decision = rule.evaluate(action, repoState);
      if (decision) {
        decisions.push(decision);
      }
    }

    // If no rules triggered, allow by default
    if (decisions.length === 0) {
      return {
        allowed: true,
        decision: 'allow',
        severity: 'low',
        reasons: ['No policy rules restrict this action'],
        evidence: {
          rulesEvaluated: this.constitutionalRules.length + this.rules.length,
        },
        policyRuleIds: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Aggregate decisions using precedence
    return this.aggregateDecisions(decisions);
  }

  /**
   * Check kill switches
   */
  private checkKillSwitches(context: PolicyContext): PolicyDecision | null {
    const { killSwitches, action, executionMode } = context;

    if (killSwitches.globalAutonomyOff) {
      return {
        allowed: false,
        decision: 'deny',
        severity: 'critical',
        reasons: ['Global autonomy kill switch is active'],
        evidence: { killSwitch: 'globalAutonomyOff' },
        policyRuleIds: ['kill_switch.global'],
        timestamp: new Date().toISOString(),
      };
    }

    if (killSwitches.manualApprovalOnly && action.actor === 'agent') {
      return {
        allowed: false,
        decision: 'require_human_review',
        severity: 'high',
        reasons: ['Manual approval mode enabled'],
        evidence: { killSwitch: 'manualApprovalOnly' },
        policyRuleIds: ['kill_switch.manual_approval'],
        timestamp: new Date().toISOString(),
      };
    }

    if (killSwitches.agentProposalIntakeOff && action.actor === 'agent') {
      return {
        allowed: false,
        decision: 'deny',
        severity: 'high',
        reasons: ['Agent proposal intake disabled'],
        evidence: { killSwitch: 'agentProposalIntakeOff' },
        policyRuleIds: ['kill_switch.agent_intake'],
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Aggregate multiple decisions using precedence rules
   */
  private aggregateDecisions(decisions: PolicyDecision[]): PolicyDecision {
    // Sort by precedence (strongest first)
    decisions.sort((a, b) => {
      const outcomeDiff = DECISION_PRECEDENCE[b.decision] - DECISION_PRECEDENCE[a.decision];
      if (outcomeDiff !== 0) return outcomeDiff;

      return SEVERITY_PRECEDENCE[b.severity] - SEVERITY_PRECEDENCE[a.severity];
    });

    const strongest = decisions[0];

    // Merge all reasons and evidence
    const allReasons = [...new Set(decisions.flatMap(d => d.reasons))];
    const allRuleIds = [...new Set(decisions.flatMap(d => d.policyRuleIds))];
    const allEvidence = Object.assign({}, ...decisions.map(d => d.evidence));

    return {
      ...strongest,
      reasons: allReasons,
      policyRuleIds: allRuleIds,
      evidence: {
        ...allEvidence,
        decisionsEvaluated: decisions.length,
      },
    };
  }

  /**
   * Simple pattern matching for file paths
   */
  private matchPattern(path: string, pattern: string): boolean {
    // Convert glob-like pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}`).test(path);
  }

  /**
   * Add custom operational rule
   */
  public addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all active rules
   */
  public getRules(): PolicyRule[] {
    return [...this.constitutionalRules, ...this.rules];
  }

  /**
   * Get active rule count
   */
  public getRuleCount(): { constitutional: number; operational: number; total: number } {
    return {
      constitutional: this.constitutionalRules.length,
      operational: this.rules.length,
      total: this.constitutionalRules.length + this.rules.length,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const policyEngine = new PolicyEngine();
