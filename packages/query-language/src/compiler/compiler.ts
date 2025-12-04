/**
 * Summit Query Language Compiler
 *
 * Compiles parsed queries into executable format with optimization
 */

import type {
  Query,
  ASTNode,
  QueryNode,
  ExecutionPlan,
  ExecutionStep,
  FilterExpression,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';

export interface CompilerOptions {
  optimize?: boolean;
  validate?: boolean;
  target?: 'postgres' | 'neo4j' | 'elasticsearch' | 'generic';
  maxComplexity?: number;
  allowedResources?: string[];
}

export class QueryCompiler {
  private options: Required<CompilerOptions>;

  constructor(options: CompilerOptions = {}) {
    this.options = {
      optimize: options.optimize ?? true,
      validate: options.validate ?? true,
      target: options.target ?? 'generic',
      maxComplexity: options.maxComplexity ?? 1000,
      allowedResources: options.allowedResources ?? [],
    };
  }

  /**
   * Compile a query AST into an execution plan
   */
  compile(ast: ASTNode): ExecutionPlan {
    // Validate if enabled
    if (this.options.validate) {
      const validation = this.validate(ast);
      if (!validation.valid) {
        throw new Error(
          `Validation failed:\n${validation.errors.map((e) => e.message).join('\n')}`
        );
      }
    }

    // Generate logical plan
    const logicalPlan = this.generateLogicalPlan(ast);

    // Optimize if enabled
    const optimizedPlan = this.options.optimize
      ? this.optimize(logicalPlan)
      : logicalPlan;

    // Generate physical plan
    const physicalPlan = this.generatePhysicalPlan(optimizedPlan);

    return physicalPlan;
  }

  /**
   * Validate the query AST
   */
  validate(ast: ASTNode): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Type checking
    this.validateTypes(ast, errors);

    // Resource permissions
    this.validateResources(ast, errors);

    // Complexity check
    this.validateComplexity(ast, errors, warnings);

    // Field existence
    this.validateFields(ast, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate a logical execution plan
   */
  private generateLogicalPlan(ast: ASTNode): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    let stepId = 0;

    // Traverse AST and create logical steps
    this.visitNode(ast, (node) => {
      const step = this.createLogicalStep(node, stepId++);
      if (step) {
        steps.push(step);
      }
    });

    return {
      type: 'logical',
      steps,
      estimatedCost: this.estimateCost(steps),
      estimatedRows: this.estimateRows(steps),
    };
  }

  /**
   * Optimize the execution plan
   */
  private optimize(plan: ExecutionPlan): ExecutionPlan {
    let optimizedSteps = [...plan.steps];

    // Apply optimization passes
    optimizedSteps = this.predicatePushdown(optimizedSteps);
    optimizedSteps = this.joinReordering(optimizedSteps);
    optimizedSteps = this.constantFolding(optimizedSteps);
    optimizedSteps = this.indexSelection(optimizedSteps);
    optimizedSteps = this.projectionPruning(optimizedSteps);

    return {
      ...plan,
      steps: optimizedSteps,
      estimatedCost: this.estimateCost(optimizedSteps),
      estimatedRows: this.estimateRows(optimizedSteps),
    };
  }

  /**
   * Generate a physical execution plan
   */
  private generatePhysicalPlan(logicalPlan: ExecutionPlan): ExecutionPlan {
    const physicalSteps = logicalPlan.steps.map((step) =>
      this.createPhysicalStep(step)
    );

    return {
      type: 'physical',
      steps: physicalSteps,
      estimatedCost: this.estimateCost(physicalSteps),
      estimatedRows: this.estimateRows(physicalSteps),
    };
  }

  // ===== Optimization Techniques =====

  /**
   * Push predicates down to reduce data early
   */
  private predicatePushdown(steps: ExecutionStep[]): ExecutionStep[] {
    const optimized: ExecutionStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // If this is a filter, try to push it down
      if (step.operator === 'Filter') {
        let pushed = false;

        // Look for scan operations before this filter
        for (let j = i - 1; j >= 0; j--) {
          const prevStep = steps[j];
          if (prevStep.operator === 'Scan' || prevStep.operator === 'IndexScan') {
            // Push filter to scan
            prevStep.metadata = {
              ...prevStep.metadata,
              pushdownFilters: [
                ...(prevStep.metadata?.pushdownFilters || []),
                step.metadata?.filter,
              ],
            };
            pushed = true;
            break;
          }
        }

        if (!pushed) {
          optimized.push(step);
        }
      } else {
        optimized.push(step);
      }
    }

    return optimized;
  }

  /**
   * Reorder joins for optimal execution
   */
  private joinReordering(steps: ExecutionStep[]): ExecutionStep[] {
    // Use greedy algorithm to order joins by estimated cardinality
    const joins = steps.filter((s) => s.operator.includes('Join'));
    const nonJoins = steps.filter((s) => !s.operator.includes('Join'));

    // Sort joins by estimated rows (smallest first)
    joins.sort((a, b) => a.rows - b.rows);

    return [...nonJoins, ...joins];
  }

  /**
   * Fold constant expressions
   */
  private constantFolding(steps: ExecutionStep[]): ExecutionStep[] {
    return steps.map((step) => {
      if (step.metadata?.expression) {
        const folded = this.foldConstants(step.metadata.expression);
        return {
          ...step,
          metadata: {
            ...step.metadata,
            expression: folded,
          },
        };
      }
      return step;
    });
  }

  /**
   * Select appropriate indexes
   */
  private indexSelection(steps: ExecutionStep[]): ExecutionStep[] {
    return steps.map((step) => {
      if (step.operator === 'Scan') {
        const filters = step.metadata?.pushdownFilters || [];
        const index = this.selectBestIndex(step.metadata?.resource, filters);

        if (index) {
          return {
            ...step,
            operator: 'IndexScan',
            metadata: {
              ...step.metadata,
              index,
            },
            cost: step.cost * 0.1, // Index scan is much cheaper
          };
        }
      }
      return step;
    });
  }

  /**
   * Remove unnecessary projections
   */
  private projectionPruning(steps: ExecutionStep[]): ExecutionStep[] {
    // Track which fields are actually used
    const usedFields = new Set<string>();

    // Backward pass to collect used fields
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (step.metadata?.fields) {
        step.metadata.fields.forEach((f: string) => usedFields.add(f));
      }
    }

    // Forward pass to prune unused projections
    return steps.map((step) => {
      if (step.operator === 'Project') {
        const prunedFields = step.metadata?.fields?.filter((f: string) =>
          usedFields.has(f)
        );
        return {
          ...step,
          metadata: {
            ...step.metadata,
            fields: prunedFields,
          },
        };
      }
      return step;
    });
  }

  // ===== Validation Helpers =====

  private validateTypes(ast: ASTNode, errors: ValidationError[]): void {
    // Type validation logic
    this.visitNode(ast, (node) => {
      // Check type compatibility for operations
      if (node.type === 'Filter') {
        // Validate filter expression types
      }
    });
  }

  private validateResources(ast: ASTNode, errors: ValidationError[]): void {
    if (this.options.allowedResources.length > 0) {
      this.visitNode(ast, (node) => {
        if (node.type === 'Query') {
          const queryNode = node as QueryNode;
          if (!this.options.allowedResources.includes(queryNode.resource)) {
            errors.push({
              message: `Resource '${queryNode.resource}' is not allowed`,
              code: 'RESOURCE_NOT_ALLOWED',
              severity: 'error',
            });
          }
        }
      });
    }
  }

  private validateComplexity(
    ast: ASTNode,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const complexity = this.calculateComplexity(ast);

    if (complexity > this.options.maxComplexity) {
      errors.push({
        message: `Query complexity ${complexity} exceeds maximum ${this.options.maxComplexity}`,
        code: 'COMPLEXITY_TOO_HIGH',
        severity: 'error',
      });
    } else if (complexity > this.options.maxComplexity * 0.8) {
      warnings.push({
        message: `Query complexity ${complexity} is approaching the maximum`,
        code: 'COMPLEXITY_WARNING',
        severity: 'warning',
      });
    }
  }

  private validateFields(ast: ASTNode, errors: ValidationError[]): void {
    // Field validation would require schema information
    // This is a placeholder for schema-aware validation
  }

  // ===== Helper Methods =====

  private visitNode(node: ASTNode, visitor: (node: ASTNode) => void): void {
    visitor(node);

    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach((child) => this.visitNode(child, visitor));
    }
  }

  private createLogicalStep(node: ASTNode, id: number): ExecutionStep | null {
    switch (node.type) {
      case 'Query':
        return {
          id: `step_${id}`,
          operator: 'Scan',
          description: `Scan ${(node as QueryNode).resource}`,
          cost: 100,
          rows: 10000,
          metadata: { resource: (node as QueryNode).resource },
        };

      case 'Filter':
        return {
          id: `step_${id}`,
          operator: 'Filter',
          description: 'Apply filters',
          cost: 10,
          rows: 1000,
          metadata: { filter: node },
        };

      case 'Sort':
        return {
          id: `step_${id}`,
          operator: 'Sort',
          description: 'Sort results',
          cost: 50,
          rows: 1000,
        };

      case 'Join':
        return {
          id: `step_${id}`,
          operator: 'HashJoin',
          description: 'Join tables',
          cost: 200,
          rows: 5000,
        };

      default:
        return null;
    }
  }

  private createPhysicalStep(logicalStep: ExecutionStep): ExecutionStep {
    // Convert logical operators to physical operators based on target
    const operator = this.selectPhysicalOperator(logicalStep.operator);

    return {
      ...logicalStep,
      operator,
    };
  }

  private selectPhysicalOperator(logicalOperator: string): string {
    const operatorMap: Record<string, Record<string, string>> = {
      postgres: {
        Scan: 'SeqScan',
        IndexScan: 'IndexScan',
        Join: 'HashJoin',
        Sort: 'Sort',
      },
      neo4j: {
        Scan: 'NodeByLabelScan',
        IndexScan: 'NodeIndexSeek',
        Join: 'Expand',
        Sort: 'Sort',
      },
      elasticsearch: {
        Scan: 'QueryStringQuery',
        IndexScan: 'TermQuery',
        Join: 'NestedQuery',
        Sort: 'Sort',
      },
      generic: {},
    };

    return operatorMap[this.options.target]?.[logicalOperator] || logicalOperator;
  }

  private estimateCost(steps: ExecutionStep[]): number {
    return steps.reduce((total, step) => total + step.cost, 0);
  }

  private estimateRows(steps: ExecutionStep[]): number {
    return steps.length > 0 ? steps[steps.length - 1].rows : 0;
  }

  private calculateComplexity(ast: ASTNode): number {
    let complexity = 0;

    this.visitNode(ast, (node) => {
      switch (node.type) {
        case 'Query':
          complexity += 1;
          break;
        case 'Join':
          complexity += 10;
          break;
        case 'Filter':
          complexity += 2;
          break;
        case 'Sort':
          complexity += 5;
          break;
        case 'Aggregation':
          complexity += 5;
          break;
        default:
          complexity += 1;
      }
    });

    return complexity;
  }

  private foldConstants(expression: any): any {
    // Simple constant folding
    // In a real implementation, this would evaluate constant expressions
    return expression;
  }

  private selectBestIndex(resource: string | undefined, filters: any[]): string | null {
    // Index selection would require schema and statistics
    // This is a placeholder
    if (filters.length > 0) {
      return 'idx_' + resource + '_default';
    }
    return null;
  }

  /**
   * Generate an explain plan for the query
   */
  explainQuery(ast: ASTNode): string {
    const plan = this.compile(ast);

    return this.formatExplainPlan(plan);
  }

  private formatExplainPlan(plan: ExecutionPlan, indent = 0): string {
    const lines: string[] = [];
    const prefix = '  '.repeat(indent);

    lines.push(`${prefix}Execution Plan (${plan.type}):`);
    lines.push(`${prefix}Estimated Cost: ${plan.estimatedCost}`);
    lines.push(`${prefix}Estimated Rows: ${plan.estimatedRows}`);
    lines.push('');

    plan.steps.forEach((step, i) => {
      lines.push(`${prefix}${i + 1}. ${step.operator}: ${step.description}`);
      lines.push(`${prefix}   Cost: ${step.cost}, Rows: ${step.rows}`);

      if (step.metadata) {
        lines.push(`${prefix}   Metadata: ${JSON.stringify(step.metadata, null, 2)}`);
      }

      if (step.children && step.children.length > 0) {
        step.children.forEach((child) => {
          lines.push(
            this.formatExplainPlan(
              { type: 'physical', steps: [child], estimatedCost: 0, estimatedRows: 0 },
              indent + 2
            )
          );
        });
      }
    });

    return lines.join('\n');
  }
}

// ===== Export Default Compiler =====

export const compiler = new QueryCompiler();
