/**
 * Business Rules Engine with DMN Support
 * Provides decision tables, expression language, rule versioning, and testing framework
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Safe Expression Parser
 * Replaces vulnerable expr-eval with a secure implementation
 * that only allows arithmetic operations and comparisons
 */
class SafeExpressionParser {
  private allowedOperators = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '!=', '&&', '||', '!'];
  private allowedFunctions = ['Math.abs', 'Math.ceil', 'Math.floor', 'Math.round', 'Math.max', 'Math.min'];

  parse(expression: string): { evaluate: (context: Record<string, any>) => any } {
    // Validate expression for safety
    this.validateExpression(expression);

    return {
      evaluate: (context: Record<string, any>) => {
        return this.safeEvaluate(expression, context);
      }
    };
  }

  private validateExpression(expr: string): void {
    // Block dangerous patterns
    const dangerousPatterns = [
      /constructor/i,
      /__proto__/i,
      /prototype/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /\bthis\b/i,
      /\bglobal\b/i,
      /\bprocess\b/i,
      /\brequire\b/i,
      /\bimport\b/i,
      /\bexport\b/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expr)) {
        throw new Error(`Expression contains forbidden pattern: ${pattern}`);
      }
    }
  }

  private safeEvaluate(expression: string, context: Record<string, any>): any {
    // Create a safe evaluation context with only allowed variables
    const safeContext: Record<string, any> = {};

    // Copy only primitive values and simple objects from context
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'number' ||
          typeof value === 'string' ||
          typeof value === 'boolean' ||
          value === null ||
          value === undefined) {
        safeContext[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Shallow copy of simple objects
        safeContext[key] = { ...value };
      } else if (Array.isArray(value)) {
        safeContext[key] = [...value];
      }
    }

    // Simple expression evaluator using manual parsing (no eval/Function)
    try {
      // Replace variable names with their values
      let evalExpr = expression;
      for (const [key, value] of Object.entries(safeContext)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (typeof value === 'string') {
          evalExpr = evalExpr.replace(regex, JSON.stringify(value));
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          evalExpr = evalExpr.replace(regex, String(value));
        }
      }

      // Parse and evaluate simple expressions manually
      return this.parseExpression(evalExpr.trim());
    } catch (error) {
      throw new Error(`Safe expression evaluation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Manual expression parser - supports basic arithmetic and comparisons
   * without using eval() or Function()
   */
  private parseExpression(expr: string): number | boolean | string {
    expr = expr.trim();

    // Handle parentheses first
    while (expr.includes('(')) {
      expr = expr.replace(/\(([^()]+)\)/g, (_, inner) => {
        return String(this.parseExpression(inner));
      });
    }

    // Handle logical operators (lowest precedence)
    if (expr.includes('||')) {
      const parts = expr.split('||');
      return parts.some(p => Boolean(this.parseExpression(p.trim())));
    }
    if (expr.includes('&&')) {
      const parts = expr.split('&&');
      return parts.every(p => Boolean(this.parseExpression(p.trim())));
    }

    // Handle comparison operators
    const compMatch = expr.match(/^(.+?)(===|!==|==|!=|>=|<=|>|<)(.+)$/);
    if (compMatch) {
      const left = this.parseExpression(compMatch[1]);
      const op = compMatch[2];
      const right = this.parseExpression(compMatch[3]);

      switch (op) {
        case '===': return left === right;
        case '!==': return left !== right;
        // eslint-disable-next-line eqeqeq -- intentional loose equality for expression language
        case '==': return left == right;
        // eslint-disable-next-line eqeqeq -- intentional loose inequality for expression language
        case '!=': return left != right;
        case '>=': return Number(left) >= Number(right);
        case '<=': return Number(left) <= Number(right);
        case '>': return Number(left) > Number(right);
        case '<': return Number(left) < Number(right);
      }
    }

    // Handle arithmetic operators (higher precedence)
    // Addition/Subtraction
    const addMatch = expr.match(/^(.+?)([+-])([^*/]+)$/);
    if (addMatch) {
      const left = Number(this.parseExpression(addMatch[1]));
      const op = addMatch[2];
      const right = Number(this.parseExpression(addMatch[3]));
      return op === '+' ? left + right : left - right;
    }

    // Multiplication/Division
    const mulMatch = expr.match(/^(.+?)([*/])(.+)$/);
    if (mulMatch) {
      const left = Number(this.parseExpression(mulMatch[1]));
      const op = mulMatch[2];
      const right = Number(this.parseExpression(mulMatch[3]));
      return op === '*' ? left * right : left / right;
    }

    // Handle negation
    if (expr.startsWith('!')) {
      return !this.parseExpression(expr.slice(1));
    }

    // Handle string literals
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Handle boolean literals
    if (expr === 'true') {return true;}
    if (expr === 'false') {return false;}

    // Handle numeric literals
    const num = Number(expr);
    if (!isNaN(num)) {return num;}

    throw new Error(`Cannot parse expression: ${expr}`);
  }
}

export interface DecisionTable {
  id: string;
  name: string;
  description?: string;
  version: string;
  inputs: DecisionInput[];
  outputs: DecisionOutput[];
  rules: DecisionRule[];
  hitPolicy: HitPolicy;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface DecisionInput {
  id: string;
  label: string;
  name: string; // Variable name
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  allowedValues?: any[];
  description?: string;
}

export interface DecisionOutput {
  id: string;
  label: string;
  name: string; // Variable name
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  allowedValues?: any[];
  description?: string;
}

export interface DecisionRule {
  id: string;
  priority?: number;
  conditions: RuleCondition[];
  outputs: Record<string, any>; // output name -> value
  description?: string;
  enabled: boolean;
}

export interface RuleCondition {
  inputId: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'matches'
    | 'between'
    | 'exists'
    | 'expression';
  value?: any;
  value2?: any; // For 'between' operator
  expression?: string; // For complex expressions
}

export type HitPolicy =
  | 'UNIQUE' // Only one rule can match
  | 'FIRST' // Return first matching rule
  | 'PRIORITY' // Return highest priority matching rule
  | 'ANY' // All matching rules must have same output
  | 'COLLECT' // Return all matching rules
  | 'RULE_ORDER'; // Return rules in order

export interface Expression {
  id: string;
  name: string;
  description?: string;
  expression: string;
  language: 'FEEL' | 'JavaScript' | 'JSONPath';
  returnType: 'string' | 'number' | 'boolean' | 'object';
  version: string;
  testCases?: ExpressionTestCase[];
}

export interface ExpressionTestCase {
  name: string;
  input: Record<string, any>;
  expectedOutput: any;
  description?: string;
}

export interface RuleSet {
  id: string;
  name: string;
  description?: string;
  version: string;
  rules: Rule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  condition: string; // Expression that evaluates to boolean
  actions: RuleAction[];
  enabled: boolean;
}

export interface RuleAction {
  type: 'set_value' | 'call_function' | 'emit_event' | 'custom';
  target?: string; // Variable name for set_value
  value?: any;
  function?: string; // Function name for call_function
  event?: string; // Event name for emit_event
  customAction?: (context: Record<string, any>) => void;
}

export interface EvaluationResult {
  matched: boolean;
  matchedRules: DecisionRule[];
  outputs: Record<string, any>;
  executionTime: number;
  metadata?: Record<string, any>;
}

export class BusinessRulesEngine extends EventEmitter {
  private decisionTables = new Map<string, DecisionTable>();
  private expressions = new Map<string, Expression>();
  private ruleSets = new Map<string, RuleSet>();
  private parser: SafeExpressionParser;
  private ruleVersions = new Map<string, DecisionTable[]>();

  constructor() {
    super();
    this.parser = new SafeExpressionParser();
  }

  /**
   * Create a new decision table
   */
  createDecisionTable(
    table: Omit<DecisionTable, 'id' | 'createdAt' | 'updatedAt'>,
  ): DecisionTable {
    const id = uuidv4();
    const now = new Date();

    const decisionTable: DecisionTable = {
      ...table,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Validate decision table
    this.validateDecisionTable(decisionTable);

    this.decisionTables.set(id, decisionTable);

    // Store version history
    const versionKey = `${decisionTable.name}:${decisionTable.version}`;
    const versions = this.ruleVersions.get(versionKey) ?? [];
    versions.push(decisionTable);
    this.ruleVersions.set(versionKey, versions);

    this.emit('decision_table.created', decisionTable);
    return decisionTable;
  }

  /**
   * Update an existing decision table
   */
  updateDecisionTable(
    id: string,
    updates: Partial<DecisionTable>,
  ): DecisionTable {
    const table = this.decisionTables.get(id);
    if (!table) {
      throw new Error('Decision table not found');
    }

    const updatedTable: DecisionTable = {
      ...table,
      ...updates,
      id: table.id,
      createdAt: table.createdAt,
      updatedAt: new Date(),
    };

    this.validateDecisionTable(updatedTable);
    this.decisionTables.set(id, updatedTable);

    this.emit('decision_table.updated', updatedTable);
    return updatedTable;
  }

  /**
   * Evaluate a decision table with given inputs
   */
  evaluateDecisionTable(
    tableId: string,
    inputs: Record<string, any>,
  ): EvaluationResult {
    const startTime = Date.now();
    const table = this.decisionTables.get(tableId);

    if (!table) {
      throw new Error('Decision table not found');
    }

    const matchedRules: DecisionRule[] = [];

    // Evaluate each rule
    for (const rule of table.rules) {
      if (!rule.enabled) {
        continue;
      }

      const matches = this.evaluateRule(rule, inputs, table.inputs);
      if (matches) {
        matchedRules.push(rule);

        // Apply hit policy
        if (table.hitPolicy === 'FIRST' || table.hitPolicy === 'UNIQUE') {
          break;
        }
      }
    }

    // Apply hit policy to determine final outputs
    let outputs: Record<string, any> = {};

    switch (table.hitPolicy) {
      case 'UNIQUE':
      case 'FIRST':
        if (matchedRules.length > 0) {
          outputs = matchedRules[0].outputs;
        }
        break;

      case 'PRIORITY':
        if (matchedRules.length > 0) {
          const sortedRules = matchedRules.sort(
            (a, b) => (b.priority || 0) - (a.priority || 0),
          );
          outputs = sortedRules[0].outputs;
        }
        break;

      case 'ANY':
        if (matchedRules.length > 0) {
          // Verify all matched rules have same output
          const firstOutput = JSON.stringify(matchedRules[0].outputs);
          const allSame = matchedRules.every(
            (r) => JSON.stringify(r.outputs) === firstOutput,
          );

          if (!allSame) {
            throw new Error(
              'ANY hit policy violation: matched rules have different outputs',
            );
          }

          outputs = matchedRules[0].outputs;
        }
        break;

      case 'COLLECT':
      case 'RULE_ORDER':
        // Collect all outputs from matched rules
        matchedRules.forEach((rule) => {
          Object.assign(outputs, rule.outputs);
        });
        break;
    }

    const executionTime = Date.now() - startTime;

    this.emit('decision_table.evaluated', {
      tableId,
      inputs,
      outputs,
      matchedRules: matchedRules.length,
    });

    return {
      matched: matchedRules.length > 0,
      matchedRules,
      outputs,
      executionTime,
    };
  }

  /**
   * Evaluate a single rule against inputs
   */
  private evaluateRule(
    rule: DecisionRule,
    inputs: Record<string, any>,
    inputDefinitions: DecisionInput[],
  ): boolean {
    return rule.conditions.every((condition) => {
      const inputDef = inputDefinitions.find((i) => i.id === condition.inputId);
      if (!inputDef) {
        return false;
      }

      const inputValue = inputs[inputDef.name];
      return this.evaluateCondition(condition, inputValue);
    });
  }

  /**
   * Evaluate a condition against a value
   */
  private evaluateCondition(condition: RuleCondition, value: any): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;

      case 'ne':
        return value !== condition.value;

      case 'gt':
        return value > condition.value;

      case 'gte':
        return value >= condition.value;

      case 'lt':
        return value < condition.value;

      case 'lte':
        return value <= condition.value;

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);

      case 'contains':
        return (
          typeof value === 'string' &&
          typeof condition.value === 'string' &&
          value.includes(condition.value)
        );

      case 'matches':
        return (
          typeof value === 'string' &&
          typeof condition.value === 'string' &&
          new RegExp(condition.value).test(value)
        );

      case 'between':
        return (
          value >= condition.value && value <= (condition.value2 ?? Infinity)
        );

      case 'exists':
        return value !== null && value !== undefined;

      case 'expression':
        if (condition.expression) {
          return this.evaluateExpression(condition.expression, { value });
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Create an expression
   */
  createExpression(
    expression: Omit<Expression, 'id'>,
  ): Expression {
    const id = uuidv4();
    const expr: Expression = {
      ...expression,
      id,
    };

    this.expressions.set(id, expr);
    this.emit('expression.created', expr);
    return expr;
  }

  /**
   * Evaluate an expression
   */
  evaluateExpression(
    expressionString: string,
    context: Record<string, any>,
  ): any {
    try {
      const expr = this.parser.parse(expressionString);
      return expr.evaluate(context);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  /**
   * Test an expression with test cases
   */
  testExpression(expressionId: string): {
    passed: number;
    failed: number;
    results: Array<{
      testCase: string;
      passed: boolean;
      expected: any;
      actual: any;
    }>;
  } {
    const expression = this.expressions.get(expressionId);
    if (!expression) {
      throw new Error('Expression not found');
    }

    const results: Array<{
      testCase: string;
      passed: boolean;
      expected: any;
      actual: any;
    }> = [];

    let passed = 0;
    let failed = 0;

    (expression.testCases || []).forEach((testCase) => {
      try {
        const actual = this.evaluateExpression(
          expression.expression,
          testCase.input,
        );

        const testPassed =
          JSON.stringify(actual) === JSON.stringify(testCase.expectedOutput);

        if (testPassed) {
          passed++;
        } else {
          failed++;
        }

        results.push({
          testCase: testCase.name,
          passed: testPassed,
          expected: testCase.expectedOutput,
          actual,
        });
      } catch (error) {
        failed++;
        results.push({
          testCase: testCase.name,
          passed: false,
          expected: testCase.expectedOutput,
          actual: error.message,
        });
      }
    });

    return { passed, failed, results };
  }

  /**
   * Create a rule set
   */
  createRuleSet(
    ruleSet: Omit<RuleSet, 'id' | 'createdAt' | 'updatedAt'>,
  ): RuleSet {
    const id = uuidv4();
    const now = new Date();

    const newRuleSet: RuleSet = {
      ...ruleSet,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.ruleSets.set(id, newRuleSet);
    this.emit('rule_set.created', newRuleSet);
    return newRuleSet;
  }

  /**
   * Execute a rule set
   */
  executeRuleSet(
    ruleSetId: string,
    context: Record<string, any>,
  ): {
    executedRules: string[];
    modifiedContext: Record<string, any>;
    events: string[];
  } {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet || !ruleSet.enabled) {
      throw new Error('Rule set not found or disabled');
    }

    const modifiedContext = { ...context };
    const executedRules: string[] = [];
    const events: string[] = [];

    // Sort rules by priority
    const sortedRules = [...ruleSet.rules]
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        const conditionResult = this.evaluateExpression(
          rule.condition,
          modifiedContext,
        );

        if (conditionResult) {
          executedRules.push(rule.id);

          // Execute actions
          for (const action of rule.actions) {
            switch (action.type) {
              case 'set_value':
                if (action.target) {
                  modifiedContext[action.target] = action.value;
                }
                break;

              case 'call_function':
                if (action.function) {
                  // Function execution would be implemented here
                  this.emit('rule.function_call', {
                    function: action.function,
                    context: modifiedContext,
                  });
                }
                break;

              case 'emit_event':
                if (action.event) {
                  events.push(action.event);
                  this.emit(action.event, modifiedContext);
                }
                break;

              case 'custom':
                if (action.customAction) {
                  action.customAction(modifiedContext);
                }
                break;
            }
          }

          this.emit('rule.executed', { rule: rule.id, context: modifiedContext });
        }
      } catch (error) {
        this.emit('rule.error', { rule: rule.id, error: error.message });
      }
    }

    return {
      executedRules,
      modifiedContext,
      events,
    };
  }

  /**
   * Validate a decision table
   */
  private validateDecisionTable(table: DecisionTable): void {
    // Check for duplicate input IDs
    const inputIds = table.inputs.map((i) => i.id);
    if (new Set(inputIds).size !== inputIds.length) {
      throw new Error('Duplicate input IDs found');
    }

    // Check for duplicate output IDs
    const outputIds = table.outputs.map((o) => o.id);
    if (new Set(outputIds).size !== outputIds.length) {
      throw new Error('Duplicate output IDs found');
    }

    // Validate rules
    for (const rule of table.rules) {
      // Check that all condition inputIds exist
      for (const condition of rule.conditions) {
        if (!inputIds.includes(condition.inputId)) {
          throw new Error(
            `Rule ${rule.id} references non-existent input ${condition.inputId}`,
          );
        }
      }

      // Check that all output names exist
      for (const outputName of Object.keys(rule.outputs)) {
        const outputExists = table.outputs.some((o) => o.name === outputName);
        if (!outputExists) {
          throw new Error(
            `Rule ${rule.id} references non-existent output ${outputName}`,
          );
        }
      }
    }

    // Validate UNIQUE hit policy
    if (table.hitPolicy === 'UNIQUE') {
      // TODO: Implement conflict detection for UNIQUE policy
      // This would require analyzing all rules to ensure no two can match simultaneously
    }
  }

  /**
   * Detect conflicts between rules
   */
  detectRuleConflicts(tableId: string): Array<{
    rule1: string;
    rule2: string;
    conflict: string;
  }> {
    const table = this.decisionTables.get(tableId);
    if (!table) {
      throw new Error('Decision table not found');
    }

    const conflicts: Array<{
      rule1: string;
      rule2: string;
      conflict: string;
    }> = [];

    // Simple conflict detection: check for identical conditions with different outputs
    for (let i = 0; i < table.rules.length; i++) {
      for (let j = i + 1; j < table.rules.length; j++) {
        const rule1 = table.rules[i];
        const rule2 = table.rules[j];

        if (!rule1.enabled || !rule2.enabled) {
          continue;
        }

        // Check if conditions are identical
        const conditions1 = JSON.stringify(rule1.conditions);
        const conditions2 = JSON.stringify(rule2.conditions);

        if (conditions1 === conditions2) {
          // Check if outputs are different
          const outputs1 = JSON.stringify(rule1.outputs);
          const outputs2 = JSON.stringify(rule2.outputs);

          if (outputs1 !== outputs2) {
            conflicts.push({
              rule1: rule1.id,
              rule2: rule2.id,
              conflict: 'Same conditions, different outputs',
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Get version history of a decision table
   */
  getVersionHistory(name: string): DecisionTable[] {
    const versions: DecisionTable[] = [];

    this.ruleVersions.forEach((tables, key) => {
      if (key.startsWith(`${name}:`)) {
        versions.push(...tables);
      }
    });

    return versions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Export decision table to DMN XML (simplified)
   */
  exportToDMN(tableId: string): string {
    const table = this.decisionTables.get(tableId);
    if (!table) {
      throw new Error('Decision table not found');
    }

    // Simplified DMN XML export
    // In production, use a proper DMN XML library
    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             id="${table.id}"
             name="${table.name}"
             namespace="http://intelgraph.io/dmn">
  <decision id="${table.id}" name="${table.name}">
    <decisionTable id="${table.id}_table" hitPolicy="${table.hitPolicy}">
      ${table.inputs.map((input) => `<input id="${input.id}" label="${input.label}"/>`).join('\n      ')}
      ${table.outputs.map((output) => `<output id="${output.id}" label="${output.label}"/>`).join('\n      ')}
      ${table.rules.map((rule) => `<rule id="${rule.id}"/>`).join('\n      ')}
    </decisionTable>
  </decision>
</definitions>`;
  }
}

export default BusinessRulesEngine;
