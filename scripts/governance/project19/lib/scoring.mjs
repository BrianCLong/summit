/**
 * Scoring Operations Library
 * Calculates derived fields based on policy and field values
 */

import fs from 'fs';

class ScoringOperations {
  constructor(scorePolicyPath) {
    this.scorePolicy = this.loadScorePolicy(scorePolicyPath);
  }

  /**
   * Load scoring policy from file
   */
  loadScorePolicy(path) {
    if (!path || !fs.existsSync(path)) {
      // Return default policy if file doesn't exist
      return {
        version: '2026-01-15',
        wsjf: {
          cost_of_delay: {
            fields: ['Impact Score', 'Reputation Risk', 'Revenue Sensitivity', 'Release Blocker'],
            weights: {
              'Impact Score': 2.0,
              'Reputation Risk': 2.0,  // High impact if reputation at risk
              'Revenue Sensitivity': 1.0,
              'Release Blocker': 3.0   // Highest weight for release-blocking items
            }
          },
          job_size: {
            field: 'Effort Score',
            min_value: 1  // No job can have size 0
          }
        },
        true_priority: {
          inputs: ['WSJF Score', 'Risk Score', 'Determinism Risk', 'CI Status Snapshot', 'Release Blocker'],
          weights: {
            'WSJF Score': 1.0,
            'Risk Score': 1.5,          // Weight risk higher
            'Release Blocker': 2.0      // Release blockers get priority boost
          },
          penalties: {
            'CI Status Snapshot': {
              'Failing': -5,  // Penalty for failing CI
              'Flaky': -2     // Penalty for flaky CI
            },
            'Determinism Risk': {
              'Confirmed': -5,  // Large penalty for confirmed determinism issues
              'Potential': -2   // Smaller penalty for potential issues
            }
          }
        },
        ga_readiness: {
          inputs: ['Governance Gate', 'Gate Status', 'Evidence Required', 'Evidence Complete', 'CI Status Snapshot'],
          scoring: {
            base: 50,
            gate: {
              'GA': 20,
              'Release': 10,
              'Compliance': 10,
              'Security': 5,
              'Design': 2,
              'None': 0
            },
            gate_status: {
              'Approved': 20,
              'In Review': 10,
              'Not Started': 0,
              'Blocked': -10
            },
            evidence: {
              'required_and_complete': 20,
              'required_and_incomplete': -20,
              'not_required': 0
            },
            ci: {
              'Green': 10,
              'Flaky': 0,
              'Failing': -10,
              'Unknown': -5
            }
          }
        },
        automation_safety: {
          inputs: ['Automation Eligibility', 'Human Approval Required', 'Max Fix Scope', 'Determinism Risk'],
          scoring: {
            eligibility: {
              'Manual Only': 10,       // High safety score for manual only
              'Agent Assist': 5,
              'Agent Execute': 3,
              'Fully Autonomous': 1    // Lowest safety score for full automation
            },
            approval: {
              'Yes': 5,   // Human approval adds safety
              'No': 0
            },
            fix_scope: {
              multiplier: 0.1    // Each additional scope adds a small penalty
            },
            risk: {
              'Confirmed': -20,  // Large penalty for confirmed risk
              'Potential': -10,  // Penalty for potential risk
              'None': 0
            }
          }
        },
        agent_confidence: {
          inputs: ['Primary Agent', 'Agent Output Determinism', 'Execution Confidence'],
          scoring: {
            agent: {
              'Jules': 8,
              'Codex': 7,
              'Claude': 9,
              'Qwen': 7,
              'Atlas': 8,
              'Antigravity': 6,
              'Human': 10    // Humans have highest base confidence
            },
            determinism: {
              'Deterministic': 10,  // Highest confidence in deterministic output
              'Bounded': 5,        // Medium confidence in bounded output
              'Freeform': 2        // Low confidence in freeform output
            },
            execution_confidence_weight: 1.0   // Weight for execution confidence
          }
        },
        expected_cycle_time: {
          inputs: ['Effort Score', 'WIP Risk', 'Work Type', 'CI Status Snapshot'],
          calculation: {
            base_multiplier: 2.0,    // Base 2 days per effort point
            wip_risk: {
              'Low': 0.8,       // Low risk reduces cycle time
              'Medium': 1.0,    // Medium risk is baseline
              'High': 1.5       // High risk increases cycle time
            },
            work_type: {
              'Human': 1.0,      // Human execution is baseline
              'Agent': 0.7,      // Agent execution is faster
              'Hybrid': 0.9      // Hybrid is slightly faster
            },
            ci_status: {
              'Green': 1.0,      // Healthy CI is baseline
              'Flaky': 1.2,      // Flaky CI increases time
              'Failing': 1.5     // Failing CI greatly increases time
            }
          }
        }
      };
    }

    try {
      const content = fs.readFileSync(path, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading score policy from ${path}:`, error.message);
      return this.getDefaultScorePolicy();
    }
  }

  /**
   * Get default scoring policy
   */
  getDefaultScorePolicy() {
    return this.loadScorePolicy(null);
  }

  /**
   * Calculate WSJF (Weighted Shortest Job First) score
   */
  calculateWSJF(fields) {
    const policy = this.scorePolicy.wsjf || {};
    const { cost_of_delay = {}, job_size = {} } = policy;

    // Calculate cost of delay (numerator)
    let costOfDelay = 0;

    for (const [field, weight] of Object.entries(cost_of_delay.weights || {})) {
      let fieldValue = fields[field];

      // Handle different value types and convert to numerical values
      if (typeof fieldValue === 'string') {
        // Map common string representations to numbers
        if (fieldValue === 'Yes' || fieldValue === 'yes' || fieldValue === 'true') {
          fieldValue = 1;
        } else if (fieldValue === 'No' || fieldValue === 'no' || fieldValue === 'false') {
          fieldValue = 0;
        } else if (fieldValue === 'P0') {
          fieldValue = 10;
        } else if (fieldValue === 'P1') {
          fieldValue = 7;
        } else if (fieldValue === 'P2') {
          fieldValue = 5;
        } else if (fieldValue === 'P3') {
          fieldValue = 3;
        } else if (fieldValue === 'P4') {
          fieldValue = 1;
        } else if (fieldValue === 'High') {
          fieldValue = 3;
        } else if (fieldValue === 'Medium') {
          fieldValue = 2;
        } else if (fieldValue === 'Low') {
          fieldValue = 1;
        } else if (fieldValue === 'Existential') {
          fieldValue = 4;  // Even higher than High
        } else {
          // Try parsing as a number if it's a numeric string
          const numericVal = parseFloat(fieldValue);
          fieldValue = isNaN(numericVal) ? 0 : numericVal;
        }
      } else if (typeof fieldValue === 'boolean') {
        fieldValue = fieldValue ? 1 : 0;
      }

      costOfDelay += (typeof fieldValue === 'number' ? fieldValue : 0) * (weight || 0);
    }

    // Calculate job size (denominator)
    const jobSizeField = job_size.field || 'Effort Score';
    let jobSize = fields[jobSizeField];

    if (typeof jobSize === 'string') {
      jobSize = parseFloat(jobSize);
    }
    if (typeof jobSize !== 'number') {
      jobSize = 1;  // Default if not available
    }

    // Apply minimum value constraint
    const baseJobSize = Math.max(jobSize, job_size.min_value || 1);

    // Calculate WSJF score (weighted shortest job first)
    const wsjfScore = costOfDelay / baseJobSize;

    // Return rounded to 1 decimal place
    return Math.round(wsjfScore * 10) / 10;
  }

  /**
   * Calculate True Priority (weighted composite of multiple factors)
   */
  calculateTruePriority(fields) {
    const policy = this.scorePolicy.true_priority || {};

    let baseScore = 0;

    // Calculate weighted inputs
    for (const [inputField, weight] of Object.entries(policy.weights || {})) {
      let fieldValue = fields[inputField];

      if (typeof fieldValue === 'string') {
        if (fieldValue === 'Yes' || fieldValue === 'yes' || fieldValue === 'true') {
          fieldValue = 1;
        } else if (fieldValue === 'No' || fieldValue === 'no' || fieldValue === 'false') {
          fieldValue = 0;
        } else if (fieldValue === 'P0') {
          fieldValue = 10;
        } else if (fieldValue === 'P1') {
          fieldValue = 7;
        } else if (fieldValue === 'P2') {
          fieldValue = 5;
        } else if (fieldValue === 'P3') {
          fieldValue = 3;
        } else if (fieldValue === 'P4') {
          fieldValue = 1;
        } else if (fieldValue === 'High') {
          fieldValue = 3;
        } else if (fieldValue === 'Medium') {
          fieldValue = 2;
        } else if (fieldValue === 'Low') {
          fieldValue = 1;
        } else if (fieldValue === 'Existential') {
          fieldValue = 4;  // Even higher than High
        } else {
          // Try parsing as number
          const numericVal = parseFloat(fieldValue);
          fieldValue = isNaN(numericVal) ? 0 : numericVal;
        }
      } else if (typeof fieldValue === 'boolean') {
        fieldValue = fieldValue ? 1 : 0;
      }

      baseScore += (typeof fieldValue === 'number' ? fieldValue : 0) * (weight || 0);
    }

    // Apply penalties
    for (const [field, fieldPenalties] of Object.entries(policy.penalties || {})) {
      const fieldValue = fields[field];
      if (fieldValue && typeof fieldPenalties === 'object') {
        const penaltyValue = fieldPenalties[fieldValue];
        if (penaltyValue !== undefined) {
          baseScore += typeof penaltyValue === 'number' ? penaltyValue : 0;
        }
      }
    }

    // Ensure non-negative result
    return Math.max(0, Math.round(baseScore * 10) / 10);
  }

  /**
   * Calculate GA Readiness Score (based on gate status, evidence, CI health)
   */
  calculateGAReadiness(fields) {
    const policy = this.scorePolicy.ga_readiness || {};
    const { scoring = {} } = policy;

    let score = scoring.base || 50;  // Start with base score

    // Apply gate contribution
    const gate = fields['Governance Gate'];
    if (gate && scoring.gate?.[gate] !== undefined) {
      score += scoring.gate[gate] || 0;
    }

    // Apply gate status contribution
    const gateStatus = fields['Gate Status'];
    if (gateStatus && scoring.gate_status?.[gateStatus] !== undefined) {
      score += scoring.gate_status[gateStatus] || 0;
    }

    // Apply evidence contribution
    const evidenceRequired = fields['Evidence Required'];
    const evidenceComplete = fields['Evidence Complete'];

    if (evidenceRequired === 'Yes') {
      score += evidenceComplete === 'Yes' ?
        (scoring.evidence?.['required_and_complete'] || 0) :
        (scoring.evidence?.['required_and_incomplete'] || 0);
    } else {
      score += scoring.evidence?.['not_required'] || 0;
    }

    // Apply CI status contribution
    const ciStatus = fields['CI Status Snapshot'];
    if (ciStatus && scoring.ci?.[ciStatus] !== undefined) {
      score += scoring.ci[ciStatus] || 0;
    }

    // Clamp score between 0 and 100
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate Automation Safety Score (based on automation boundaries and constraints)
   */
  calculateAutomationSafety(fields) {
    const policy = this.scorePolicy.automation_safety || {};
    const { scoring = {} } = policy;

    let score = 50;  // Start with neutral score

    // Apply eligibility contribution
    const eligibility = fields['Automation Eligibility'];
    if (eligibility && scoring.eligibility?.[eligibility] !== undefined) {
      score += scoring.eligibility[eligibility] || 0;
    }

    // Apply approval contribution
    const approvalRequired = fields['Human Approval Required'];
    if (approvalRequired && scoring.approval?.[approvalRequired] !== undefined) {
      score += scoring.approval[approvalRequired] || 0;
    }

    // Apply fix scope contribution
    const maxFixScope = fields['Max Fix Scope'];
    if (typeof maxFixScope === 'number' && scoring.fix_scope) {
      score += maxFixScope * (scoring.fix_scope.multiplier || 0.1);
    }

    // Apply determinism risk contribution
    const determinismRisk = fields['Determinism Risk'];
    if (determinismRisk && scoring.risk?.[determinismRisk] !== undefined) {
      score += scoring.risk[determinismRisk] || 0;
    }

    // Clamp score between 0 and 100
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate Agent Confidence Score (based on agent type and output determinism)
   */
  calculateAgentConfidence(fields) {
    const policy = this.scorePolicy.agent_confidence || {};
    const { scoring = {} } = policy;

    let score = 0;

    // Apply primary agent contribution
    const agent = fields['Primary Agent'];
    if (agent && scoring.agent?.[agent] !== undefined) {
      score += scoring.agent[agent] || 0;
    }

    // Apply determinism contribution
    const outputDeterminism = fields['Agent Output Determinism'];
    if (outputDeterminism && scoring.determinism?.[outputDeterminism] !== undefined) {
      score += scoring.determinism[outputDeterminism] || 0;
    }

    // Apply execution confidence contribution
    const executionConfidence = fields['Execution Confidence'];
    if (typeof executionConfidence === 'number') {
      score += executionConfidence * (scoring.execution_confidence_weight || 1.0);
    }

    // Clamp score between 0 and 100
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate Expected Cycle Time (in days based on effort, risk, work type)
   */
  calculateExpectedCycleTime(fields) {
    const policy = this.scorePolicy.expected_cycle_time || {};
    const { calculation = {} } = policy;

    const effortScore = fields['Effort Score'] || 5;
    const wipRisk = fields['WIP Risk'] || 'Medium';
    const workType = fields['Work Type'] || 'Human';
    const ciStatus = fields['CI Status Snapshot'] || 'Unknown';

    let baseTime = effortScore * (calculation.base_multiplier || 2.0);

    // Apply WIP risk modifier
    if (calculation.wip_risk?.[wipRisk] !== undefined) {
      baseTime *= calculation.wip_risk[wipRisk] || 1.0;
    }

    // Apply work type modifier
    if (calculation.work_type?.[workType] !== undefined) {
      baseTime *= calculation.work_type[workType] || 1.0;
    }

    // Apply CI status modifier
    if (calculation.ci_status?.[ciStatus] !== undefined) {
      baseTime *= calculation.ci_status[ciStatus] || 1.0;
    }

    return Math.round(baseTime);
  }

  /**
   * Calculate a composite governance drift risk score
   */
  calculateGovernanceDriftRisk(fields) {
    let risk = 25;  // Base risk
    
    // Increase with gate complexity
    const gate = fields['Governance Gate'];
    if (gate === 'GA' || gate === 'Security' || gate === 'Compliance') {
      risk += 20;
    } else if (gate === 'Design' || gate === 'Release') {
      risk += 10;
    }
    
    // Increase with determinism risk
    const determinismRisk = fields['Determinism Risk'];
    if (determinismRisk === 'Confirmed') {
      risk += 15;
    } else if (determinismRisk === 'Potential') {
      risk += 5;
    }
    
    // Increase with evidence requirements
    const evidenceRequired = fields['Evidence Required'];
    if (evidenceRequired === 'Yes') {
      risk += 10;
    }
    
    // Increase with number of dependencies
    const upstreamDeps = fields['Upstream Dependency Count'];
    if (typeof upstreamDeps === 'number') {
      risk += upstreamDeps * 2;
    }
    
    // Decrease if evidence is complete
    const evidenceComplete = fields['Evidence Complete'];
    if (evidenceComplete === 'Yes') {
      risk -= 15;
    }
    
    // Clamp between 0 and 100
    return Math.min(100, Math.max(0, Math.round(risk)));
  }

  /**
   * Calculate a WSJF-like score for post-GA reliability
   */
  calculateReliabilityWSJF(fields) {
    // For post-GA, weight different factors
    const impact = fields['Reputation Risk'] === 'High' ? 3 : 
                  fields['Reputation Risk'] === 'Medium' ? 2 : 1;
    
    const reliabilityImpact = fields['Reliability Impact'] === 'High' ? 3 : 
                             fields['Reliability Impact'] === 'Medium' ? 2 : 1;
    
    const customerImpact = fields['Customer Impact'] === 'GA' ? 3 : 
                          fields['Customer Impact'] === 'Pilot' ? 2 : 1;
    
    const costOfDelay = impact + reliabilityImpact + customerImpact;
    
    const effort = fields['Effort Score'] || 5;
    const baseEffort = Math.max(effort, 1);
    
    return Math.round((costOfDelay / baseEffort) * 10) / 10;
  }

  /**
   * Compute all derived scores for an item
   */
  computeAllScores(fields) {
    return {
      'WSJF Score': this.calculateWSJF(fields),
      'True Priority': this.calculateTruePriority(fields),
      'GA Readiness Score': this.calculateGAReadiness(fields),
      'Automation Safety Score': this.calculateAutomationSafety(fields),
      'Agent Confidence Score': this.calculateAgentConfidence(fields),
      'Expected Cycle Time (Days)': this.calculateExpectedCycleTime(fields),
      'Governance Drift Risk': this.calculateGovernanceDriftRisk(fields),
      'Reliability WSJF Score': this.calculateReliabilityWSJF(fields)
    };
  }

  /**
   * Validate that computed fields are not manually overridden
   */
  validateComputedFieldIntegrity(itemFields) {
    const errors = [];
    const computedFieldNames = [
      'WSJF Score',
      'True Priority', 
      'GA Readiness Score',
      'Automation Safety Score',
      'Agent Confidence Score',
      'Expected Cycle Time (Days)',
      'Governance Drift Risk'
    ];

    // Check if any computed fields have values that seem manually set
    for (const computedField of computedFieldNames) {
      const value = itemFields[computedField];
      if (value !== undefined) {
        // In a real implementation, you'd validate the value makes sense
        // For now, we'll just check that it's a reasonable type
        if (computedField.includes('(Days)')) {
          if (typeof value !== 'number' || value < 0) {
            errors.push(`Field ${computedField} should be a positive number`);
          }
        } else if (computedField.includes('Score')) {
          if (typeof value !== 'number' || value < 0) {
            errors.push(`Field ${computedField} should be a positive number`);
          }
        }
      }
    }

    return { 
      valid: errors.length === 0, 
      errors 
    };
  }

  /**
   * Apply governance constraints to scores
   */
  applyGovernanceConstraints(scores, fields) {
    const constrained = { ...scores };

    // If item is a release blocker, always prioritize appropriately
    if (fields['Release Blocker'] === 'Yes') {
      constrained['True Priority'] = Math.max(constrained['True Priority'] || 0, 80);
    }

    // If item is in GA gate path, ensure readiness score is properly weighted
    const gate = fields['Governance Gate'];
    if (gate === 'GA') {
      const evidenceFactor = fields['Evidence Complete'] === 'Yes' ? 1.0 : 0.5;
      constrained['GA Readiness Score'] = Math.max(
        constrained['GA Readiness Score'] || 0,
        (constrained['GA Readiness Score'] || 0) * evidenceFactor
      );
    }

    // If determinism risk is high, reduce automation confidence
    const detRisk = fields['Determinism Risk'];
    if (detRisk === 'Confirmed') {
      constrained['Automation Safety Score'] = Math.min(
        30,  // Cap at 30 for confirmed determinism risk
        constrained['Automation Safety Score'] || 50
      );
    } else if (detRisk === 'Potential') {
      constrained['Automation Safety Score'] = Math.min(
        50,  // Cap at 50 for potential determinism risk
        constrained['Automation Safety Score'] || 50
      );
    }

    return constrained;
  }

  /**
   * Calculate portfolio-level metrics
   */
  calculatePortfolioMetrics(items) {
    const metrics = {
      totalItems: items.length,
      byGate: {},
      byStatus: {},
      byPriority: {},
      byRelease: {},
      avgWsJf: 0,
      avgTruePriority: 0,
      avgGAReadiness: 0,
      totalGAPoints: 0,
      completedGAPoints: 0,
      evidenceCompleteness: 0,
      criticalBlockers: 0,
      ciHealth: 0
    };

    if (items.length === 0) return metrics;

    let totalWsJf = 0;
    let totalPriority = 0;
    let totalGAReadiness = 0;
    let completedEvidenceCount = 0;
    let totalEvidenceCount = 0;
    let healthyCICount = 0;

    for (const item of items) {
      const fields = item.fields || {};
      
      // Count by categories
      const gate = fields['Governance Gate'] || 'None';
      const status = fields['Status'] || 'Todo';
      const priority = fields['Priority'];
      const release = fields['Release'];
      
      metrics.byGate[gate] = (metrics.byGate[gate] || 0) + 1;
      metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
      if (priority) metrics.byPriority[priority] = (metrics.byPriority[priority] || 0) + 1;
      if (release) metrics.byRelease[release] = (metrics.byRelease[release] || 0) + 1;
      
      // Sum scores for averages
      const wsjf = fields['WSJF Score'];
      const truePriority = fields['True Priority'];
      const gaReadiness = fields['GA Readiness Score'];
      
      if (typeof wsjf === 'number') totalWsJf += wsjf;
      if (typeof truePriority === 'number') totalPriority += truePriority;
      if (typeof gaReadiness === 'number') totalGAReadiness += gaReadiness;
      
      // Count evidence completeness (for GA-bound items)
      if (['Alpha', 'Beta', 'GA'].includes(release)) {
        totalEvidenceCount++;
        if (fields['Evidence Complete'] === 'Yes') {
          completedEvidenceCount++;
        }
      }
      
      // Count CI health
      const ciStatus = fields['CI Status Snapshot'];
      if (ciStatus === 'Green') healthyCICount++;
      
      // Count critical blockers
      if (fields['Release Blocker'] === 'Yes' || priority === 'P0') {
        metrics.criticalBlockers++;
      }
    }

    metrics.avgWsJf = totalItems > 0 ? Math.round((totalWsJf / totalItems) * 10) / 10 : 0;
    metrics.avgTruePriority = totalItems > 0 ? Math.round((totalPriority / totalItems) * 10) / 10 : 0;
    metrics.avgGAReadiness = totalItems > 0 ? Math.round((totalGAReadiness / totalItems) * 10) / 10 : 0;
    metrics.evidenceCompleteness = totalEvidenceCount > 0 ? Math.round((completedEvidenceCount / totalEvidenceCount) * 100) : 0;
    metrics.ciHealth = totalItems > 0 ? Math.round((healthyCICount / totalItems) * 100) : 0;

    return metrics;
  }
}

export default ScoringOperations;