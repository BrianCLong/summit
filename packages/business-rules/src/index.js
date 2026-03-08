"use strict";
/**
 * Business Rules Engine with DMN Support
 * Provides decision tables, expression language, rule versioning, and testing framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRulesEngine = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
/**
 * Safe Expression Parser
 * Replaces vulnerable expr-eval with a secure implementation
 * that only allows arithmetic operations and comparisons
 */
class SafeExpressionParser {
    allowedOperators = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '!=', '&&', '||', '!'];
    allowedFunctions = ['Math.abs', 'Math.ceil', 'Math.floor', 'Math.round', 'Math.max', 'Math.min'];
    static MAX_EXPRESSION_LENGTH = 2048;
    parse(expression) {
        // Validate expression for safety
        this.validateExpression(expression);
        return {
            evaluate: (context) => {
                return this.safeEvaluate(expression, context);
            }
        };
    }
    validateExpression(expr) {
        if (expr.length > SafeExpressionParser.MAX_EXPRESSION_LENGTH) {
            throw new Error(`Expression exceeds maximum length of ${SafeExpressionParser.MAX_EXPRESSION_LENGTH} characters`);
        }
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
    safeEvaluate(expression, context) {
        // Create a safe evaluation context with only allowed variables
        const safeContext = {};
        // Copy only primitive values and simple objects from context
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'number' ||
                typeof value === 'string' ||
                typeof value === 'boolean' ||
                value === null ||
                value === undefined) {
                safeContext[key] = value;
            }
            else if (typeof value === 'object' && !Array.isArray(value)) {
                // Shallow copy of simple objects
                safeContext[key] = { ...value };
            }
            else if (Array.isArray(value)) {
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
                }
                else if (typeof value === 'number' || typeof value === 'boolean') {
                    evalExpr = evalExpr.replace(regex, String(value));
                }
            }
            // Parse and evaluate simple expressions manually
            return this.parseExpression(evalExpr.trim());
        }
        catch (error) {
            throw new Error(`Safe expression evaluation failed: ${error.message}`);
        }
    }
    /**
     * Manual expression parser - supports basic arithmetic and comparisons
     * without using eval() or Function()
     */
    parseExpression(expr) {
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
        // Use a more deterministic split to avoid ReDoS from (.+?)
        const compOperators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
        for (const op of compOperators) {
            const idx = expr.lastIndexOf(op);
            if (idx > 0) {
                const left = expr.substring(0, idx).trim();
                const right = expr.substring(idx + op.length).trim();
                if (left && right) {
                    const leftVal = this.parseExpression(left);
                    const rightVal = this.parseExpression(right);
                    switch (op) {
                        case '===': return leftVal === rightVal;
                        case '!==': return leftVal !== rightVal;
                        // eslint-disable-next-line eqeqeq -- intentional loose equality for expression language
                        case '==': return leftVal == rightVal;
                        // eslint-disable-next-line eqeqeq -- intentional loose inequality for expression language
                        case '!=': return leftVal != rightVal;
                        case '>=': return Number(leftVal) >= Number(rightVal);
                        case '<=': return Number(leftVal) <= Number(rightVal);
                        case '>': return Number(leftVal) > Number(rightVal);
                        case '<': return Number(leftVal) < Number(rightVal);
                    }
                }
            }
        }
        // Handle arithmetic operators (higher precedence)
        // Addition/Subtraction
        // Use lastIndexOf for deterministic splitting (left-associative via recursion)
        const addOps = ['+', '-'];
        for (const op of addOps) {
            const idx = expr.lastIndexOf(op);
            // Ensure it's not a unary minus and has content on both sides
            if (idx > 0 && !['+', '-', '*', '/', '>', '<', '=', '&', '|', '!'].includes(expr[idx - 1])) {
                const leftStr = expr.substring(0, idx).trim();
                const rightStr = expr.substring(idx + 1).trim();
                if (leftStr && rightStr) {
                    const left = Number(this.parseExpression(leftStr));
                    const right = Number(this.parseExpression(rightStr));
                    return op === '+' ? left + right : left - right;
                }
            }
        }
        // Multiplication/Division
        const mulOps = ['*', '/'];
        for (const op of mulOps) {
            const idx = expr.lastIndexOf(op);
            if (idx > 0) {
                const leftStr = expr.substring(0, idx).trim();
                const rightStr = expr.substring(idx + 1).trim();
                if (leftStr && rightStr) {
                    const left = Number(this.parseExpression(leftStr));
                    const right = Number(this.parseExpression(rightStr));
                    return op === '*' ? left * right : left / right;
                }
            }
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
        if (expr === 'true') {
            return true;
        }
        if (expr === 'false') {
            return false;
        }
        // Handle numeric literals
        const num = Number(expr);
        if (!isNaN(num)) {
            return num;
        }
        throw new Error(`Cannot parse expression: ${expr}`);
    }
}
class BusinessRulesEngine extends events_1.EventEmitter {
    decisionTables = new Map();
    expressions = new Map();
    ruleSets = new Map();
    parser;
    ruleVersions = new Map();
    constructor() {
        super();
        this.parser = new SafeExpressionParser();
    }
    /**
     * Create a new decision table
     */
    createDecisionTable(table) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const decisionTable = {
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
    updateDecisionTable(id, updates) {
        const table = this.decisionTables.get(id);
        if (!table) {
            throw new Error('Decision table not found');
        }
        const updatedTable = {
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
    evaluateDecisionTable(tableId, inputs) {
        const startTime = Date.now();
        const table = this.decisionTables.get(tableId);
        if (!table) {
            throw new Error('Decision table not found');
        }
        const matchedRules = [];
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
        let outputs = {};
        switch (table.hitPolicy) {
            case 'UNIQUE':
            case 'FIRST':
                if (matchedRules.length > 0) {
                    outputs = matchedRules[0].outputs;
                }
                break;
            case 'PRIORITY':
                if (matchedRules.length > 0) {
                    const sortedRules = matchedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
                    outputs = sortedRules[0].outputs;
                }
                break;
            case 'ANY':
                if (matchedRules.length > 0) {
                    // Verify all matched rules have same output
                    const firstOutput = JSON.stringify(matchedRules[0].outputs);
                    const allSame = matchedRules.every((r) => JSON.stringify(r.outputs) === firstOutput);
                    if (!allSame) {
                        throw new Error('ANY hit policy violation: matched rules have different outputs');
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
    evaluateRule(rule, inputs, inputDefinitions) {
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
    evaluateCondition(condition, value) {
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
                return (typeof value === 'string' &&
                    typeof condition.value === 'string' &&
                    value.includes(condition.value));
            case 'matches':
                if (typeof value === 'string' && typeof condition.value === 'string') {
                    if (condition.value.length > 256) {
                        throw new Error('Regex pattern too long');
                    }
                    try {
                        return new RegExp(condition.value).test(value);
                    }
                    catch (e) {
                        return false;
                    }
                }
                return false;
            case 'between':
                return (value >= condition.value && value <= (condition.value2 ?? Infinity));
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
    createExpression(expression) {
        const id = (0, uuid_1.v4)();
        const expr = {
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
    evaluateExpression(expressionString, context) {
        try {
            const expr = this.parser.parse(expressionString);
            return expr.evaluate(context);
        }
        catch (error) {
            throw new Error(`Expression evaluation failed: ${error.message}`);
        }
    }
    /**
     * Test an expression with test cases
     */
    testExpression(expressionId) {
        const expression = this.expressions.get(expressionId);
        if (!expression) {
            throw new Error('Expression not found');
        }
        const results = [];
        let passed = 0;
        let failed = 0;
        (expression.testCases || []).forEach((testCase) => {
            try {
                const actual = this.evaluateExpression(expression.expression, testCase.input);
                const testPassed = JSON.stringify(actual) === JSON.stringify(testCase.expectedOutput);
                if (testPassed) {
                    passed++;
                }
                else {
                    failed++;
                }
                results.push({
                    testCase: testCase.name,
                    passed: testPassed,
                    expected: testCase.expectedOutput,
                    actual,
                });
            }
            catch (error) {
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
    createRuleSet(ruleSet) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const newRuleSet = {
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
    executeRuleSet(ruleSetId, context) {
        const ruleSet = this.ruleSets.get(ruleSetId);
        if (!ruleSet || !ruleSet.enabled) {
            throw new Error('Rule set not found or disabled');
        }
        const modifiedContext = { ...context };
        const executedRules = [];
        const events = [];
        // Sort rules by priority
        const sortedRules = [...ruleSet.rules]
            .filter((r) => r.enabled)
            .sort((a, b) => b.priority - a.priority);
        for (const rule of sortedRules) {
            try {
                const conditionResult = this.evaluateExpression(rule.condition, modifiedContext);
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
            }
            catch (error) {
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
    validateDecisionTable(table) {
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
                    throw new Error(`Rule ${rule.id} references non-existent input ${condition.inputId}`);
                }
            }
            // Check that all output names exist
            for (const outputName of Object.keys(rule.outputs)) {
                const outputExists = table.outputs.some((o) => o.name === outputName);
                if (!outputExists) {
                    throw new Error(`Rule ${rule.id} references non-existent output ${outputName}`);
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
    detectRuleConflicts(tableId) {
        const table = this.decisionTables.get(tableId);
        if (!table) {
            throw new Error('Decision table not found');
        }
        const conflicts = [];
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
    getVersionHistory(name) {
        const versions = [];
        this.ruleVersions.forEach((tables, key) => {
            if (key.startsWith(`${name}:`)) {
                versions.push(...tables);
            }
        });
        return versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Export decision table to DMN XML (simplified)
     */
    exportToDMN(tableId) {
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
exports.BusinessRulesEngine = BusinessRulesEngine;
exports.default = BusinessRulesEngine;
