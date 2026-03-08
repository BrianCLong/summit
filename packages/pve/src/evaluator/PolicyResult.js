"use strict";
/**
 * Policy Result Builder
 *
 * Fluent API for constructing policy evaluation results.
 *
 * @module pve/evaluator/PolicyResult
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyResultBuilder = void 0;
exports.pass = pass;
exports.fail = fail;
exports.warn = warn;
exports.info = info;
exports.aggregateResults = aggregateResults;
exports.formatResults = formatResults;
/**
 * Builder class for constructing PolicyResult objects
 */
class PolicyResultBuilder {
    result;
    constructor(policy) {
        this.result = {
            policy,
            allowed: true,
        };
    }
    /**
     * Create a new PolicyResultBuilder
     */
    static for(policy) {
        return new PolicyResultBuilder(policy);
    }
    /**
     * Mark the result as allowed/passed
     */
    allow() {
        this.result.allowed = true;
        return this;
    }
    /**
     * Mark the result as denied/failed
     */
    deny() {
        this.result.allowed = false;
        return this;
    }
    /**
     * Set the allowed status
     */
    allowed(value) {
        this.result.allowed = value;
        return this;
    }
    /**
     * Set the severity level
     */
    severity(severity) {
        this.result.severity = severity;
        return this;
    }
    /**
     * Set as error severity
     */
    asError() {
        return this.severity('error');
    }
    /**
     * Set as warning severity
     */
    asWarning() {
        return this.severity('warning');
    }
    /**
     * Set as info severity
     */
    asInfo() {
        return this.severity('info');
    }
    /**
     * Set the message
     */
    message(message) {
        this.result.message = message;
        return this;
    }
    /**
     * Set the details
     */
    details(details) {
        this.result.details = details;
        return this;
    }
    /**
     * Set the rule in details
     */
    rule(rule) {
        this.result.details = {
            ...this.result.details,
            rule,
        };
        return this;
    }
    /**
     * Set expected and actual values in details
     */
    expected(expected, actual) {
        this.result.details = {
            ...this.result.details,
            expected,
            ...(actual !== undefined ? { actual } : {}),
        };
        return this;
    }
    /**
     * Add context to details
     */
    context(context) {
        this.result.details = {
            ...this.result.details,
            context: {
                ...this.result.details?.context,
                ...context,
            },
        };
        return this;
    }
    /**
     * Set the suggested fix
     */
    fix(fix) {
        this.result.fix = fix;
        return this;
    }
    /**
     * Set the location
     */
    location(location) {
        this.result.location = location;
        return this;
    }
    /**
     * Set file in location
     */
    file(file) {
        this.result.location = {
            ...this.result.location,
            file,
        };
        return this;
    }
    /**
     * Set line in location
     */
    line(line) {
        this.result.location = {
            ...this.result.location,
            line,
        };
        return this;
    }
    /**
     * Set field in location
     */
    field(field) {
        this.result.location = {
            ...this.result.location,
            field,
        };
        return this;
    }
    /**
     * Build the final PolicyResult
     */
    build() {
        return { ...this.result };
    }
}
exports.PolicyResultBuilder = PolicyResultBuilder;
/**
 * Create a passing policy result
 */
function pass(policy, message) {
    const builder = PolicyResultBuilder.for(policy).allow();
    if (message) {
        builder.message(message);
    }
    return builder.build();
}
/**
 * Create a failing policy result with error severity
 */
function fail(policy, message, options) {
    const builder = PolicyResultBuilder.for(policy)
        .deny()
        .message(message)
        .severity(options?.severity || 'error');
    if (options?.fix) {
        builder.fix(options.fix);
    }
    if (options?.location) {
        builder.location(options.location);
    }
    if (options?.details) {
        builder.details(options.details);
    }
    return builder.build();
}
/**
 * Create a warning policy result
 */
function warn(policy, message, options) {
    return fail(policy, message, { ...options, severity: 'warning' });
}
/**
 * Create an info policy result
 */
function info(policy, message, options) {
    return fail(policy, message, { ...options, severity: 'info' });
}
/**
 * Aggregate multiple policy results
 */
function aggregateResults(results) {
    const errors = results.filter((r) => !r.allowed && r.severity === 'error');
    const warnings = results.filter((r) => !r.allowed && r.severity === 'warning');
    const infos = results.filter((r) => !r.allowed && r.severity === 'info');
    return {
        passed: errors.length === 0,
        total: results.length,
        passed_count: results.filter((r) => r.allowed).length,
        failed_count: results.filter((r) => !r.allowed).length,
        errors,
        warnings,
        infos,
    };
}
/**
 * Format policy results for display
 */
function formatResults(results, options) {
    const { verbose = false, colors = true } = options || {};
    const lines = [];
    const colorize = (text, color) => {
        if (!colors)
            return text;
        const codes = {
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            green: '\x1b[32m',
            cyan: '\x1b[36m',
            reset: '\x1b[0m',
        };
        return `${codes[color] || ''}${text}${codes.reset}`;
    };
    for (const result of results) {
        const icon = result.allowed ? colorize('✓', 'green') : colorize('✗', 'red');
        const severity = result.severity || (result.allowed ? 'info' : 'error');
        const severityColor = severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'cyan';
        let line = `${icon} [${colorize(severity.toUpperCase(), severityColor)}] ${result.policy}`;
        if (result.message) {
            line += `: ${result.message}`;
        }
        if (result.location?.file) {
            line += ` (${result.location.file}`;
            if (result.location.line) {
                line += `:${result.location.line}`;
            }
            line += ')';
        }
        lines.push(line);
        if (verbose && result.fix) {
            lines.push(`  Fix: ${result.fix}`);
        }
        if (verbose && result.details) {
            lines.push(`  Details: ${JSON.stringify(result.details)}`);
        }
    }
    const aggregate = aggregateResults(results);
    lines.push('');
    lines.push(`${colorize('Summary:', 'cyan')} ${aggregate.passed_count}/${aggregate.total} passed`);
    if (aggregate.errors.length > 0) {
        lines.push(colorize(`  ${aggregate.errors.length} error(s)`, 'red'));
    }
    if (aggregate.warnings.length > 0) {
        lines.push(colorize(`  ${aggregate.warnings.length} warning(s)`, 'yellow'));
    }
    return lines.join('\n');
}
