"use strict";
/**
 * Custom Step Executor
 *
 * Handles custom step execution through user-provided functions.
 *
 * @module runbooks/runtime/executors/custom-executor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichIntelStepExecutor = exports.TransformStepExecutor = exports.ValidateStepExecutor = exports.NotifyStepExecutor = exports.CustomStepExecutor = void 0;
const base_js_1 = require("./base.js");
/**
 * Custom step executor for user-defined logic
 */
class CustomStepExecutor extends base_js_1.BaseStepExecutor {
    actionType = 'CUSTOM';
    customFunctions = new Map();
    /**
     * Register a custom execution function
     */
    registerFunction(name, fn) {
        this.customFunctions.set(name, fn);
    }
    /**
     * Unregister a custom execution function
     */
    unregisterFunction(name) {
        this.customFunctions.delete(name);
    }
    async execute(ctx) {
        try {
            // Get the function name from config
            const functionName = this.getConfig(ctx, 'functionName', '');
            if (!functionName) {
                return this.failure('No functionName specified in step config');
            }
            const customFn = this.customFunctions.get(functionName);
            if (!customFn) {
                return this.failure(`Custom function '${functionName}' not registered`);
            }
            // Execute the custom function
            return await customFn(ctx);
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Custom execution failed');
        }
    }
}
exports.CustomStepExecutor = CustomStepExecutor;
/**
 * Notify step executor for sending notifications
 */
class NotifyStepExecutor extends base_js_1.BaseStepExecutor {
    actionType = 'NOTIFY';
    async execute(ctx) {
        try {
            const channel = this.getConfig(ctx, 'channel', 'default');
            const message = this.getConfig(ctx, 'message', '');
            const recipients = this.getConfig(ctx, 'recipients', []);
            const priority = this.getConfig(ctx, 'priority', 'normal');
            // Simulate notification sending
            const notificationId = `notif-${Date.now()}`;
            console.log(`[NOTIFY] Channel: ${channel}, Recipients: ${recipients.join(', ')}, Priority: ${priority}`);
            console.log(`[NOTIFY] Message: ${message}`);
            return this.success({
                notificationId,
                channel,
                recipients,
                priority,
                sentAt: new Date().toISOString(),
            }, {
                kpis: {
                    notificationsSent: 1,
                    recipientCount: recipients.length,
                },
            });
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Notification failed');
        }
    }
}
exports.NotifyStepExecutor = NotifyStepExecutor;
/**
 * Validate step executor for data validation
 */
class ValidateStepExecutor extends base_js_1.BaseStepExecutor {
    actionType = 'VALIDATE';
    async execute(ctx) {
        try {
            const validationRules = this.getConfig(ctx, 'rules', {});
            const dataPath = this.getConfig(ctx, 'dataPath', '');
            // Get data to validate from previous steps
            const data = dataPath
                ? this.findPreviousOutput(ctx, dataPath)
                : ctx.input;
            const validationResults = [];
            // Simple validation rules
            for (const [rule, value] of Object.entries(validationRules)) {
                const result = this.validateRule(rule, value, data);
                validationResults.push(result);
            }
            const allPassed = validationResults.every((r) => r.passed);
            if (!allPassed) {
                const failures = validationResults.filter((r) => !r.passed);
                return this.failure(`Validation failed: ${failures.map((f) => f.message).join('; ')}`);
            }
            return this.success({
                validationResults,
                allPassed,
                validatedAt: new Date().toISOString(),
            }, {
                kpis: {
                    rulesChecked: validationResults.length,
                    rulesPassed: validationResults.filter((r) => r.passed).length,
                },
            });
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Validation failed');
        }
    }
    validateRule(rule, value, data) {
        switch (rule) {
            case 'required':
                return {
                    rule,
                    passed: data !== null && data !== undefined,
                    message: data === null || data === undefined ? 'Data is required' : undefined,
                };
            case 'minLength':
                if (Array.isArray(data)) {
                    return {
                        rule,
                        passed: data.length >= value,
                        message: data.length < value
                            ? `Array length ${data.length} is less than minimum ${value}`
                            : undefined,
                    };
                }
                return { rule, passed: true };
            case 'hasProperty':
                if (typeof data === 'object' && data !== null) {
                    return {
                        rule,
                        passed: value in data,
                        message: !(value in data)
                            ? `Property '${value}' not found`
                            : undefined,
                    };
                }
                return { rule, passed: false, message: 'Data is not an object' };
            default:
                return { rule, passed: true };
        }
    }
}
exports.ValidateStepExecutor = ValidateStepExecutor;
/**
 * Transform step executor for data transformation
 */
class TransformStepExecutor extends base_js_1.BaseStepExecutor {
    actionType = 'TRANSFORM';
    async execute(ctx) {
        try {
            const transformType = this.getConfig(ctx, 'transformType', 'passthrough');
            const inputPath = this.getConfig(ctx, 'inputPath', '');
            const outputKey = this.getConfig(ctx, 'outputKey', 'transformedData');
            // Get input data
            const inputData = inputPath
                ? this.findPreviousOutput(ctx, inputPath)
                : ctx.input;
            let transformedData;
            switch (transformType) {
                case 'flatten':
                    transformedData = this.flatten(inputData);
                    break;
                case 'extract':
                    const extractPaths = this.getConfig(ctx, 'extractPaths', []);
                    transformedData = this.extract(inputData, extractPaths);
                    break;
                case 'aggregate':
                    const aggregateField = this.getConfig(ctx, 'aggregateField', '');
                    transformedData = this.aggregate(inputData, aggregateField);
                    break;
                case 'passthrough':
                default:
                    transformedData = inputData;
                    break;
            }
            return this.success({
                [outputKey]: transformedData,
                transformType,
                transformedAt: new Date().toISOString(),
            }, {
                kpis: {
                    inputSize: JSON.stringify(inputData).length,
                    outputSize: JSON.stringify(transformedData).length,
                },
            });
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Transform failed');
        }
    }
    flatten(data) {
        if (!Array.isArray(data))
            return data;
        return data.flat(Infinity);
    }
    extract(data, paths) {
        const result = {};
        if (typeof data !== 'object' || data === null) {
            return result;
        }
        for (const path of paths) {
            const value = this.getNestedValue(data, path);
            if (value !== undefined) {
                result[path] = value;
            }
        }
        return result;
    }
    aggregate(data, field) {
        if (!Array.isArray(data))
            return data;
        const counts = {};
        for (const item of data) {
            if (typeof item === 'object' && item !== null && field in item) {
                const value = String(item[field]);
                counts[value] = (counts[value] || 0) + 1;
            }
        }
        return counts;
    }
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined)
                return undefined;
            if (typeof current !== 'object')
                return undefined;
            current = current[part];
        }
        return current;
    }
}
exports.TransformStepExecutor = TransformStepExecutor;
/**
 * Enrich Intel step executor for intelligence enrichment
 */
class EnrichIntelStepExecutor extends base_js_1.BaseStepExecutor {
    actionType = 'ENRICH_INTEL';
    async execute(ctx) {
        try {
            // Get data to enrich from previous steps
            const indicators = this.findPreviousOutput(ctx, 'enrichedIndicators') || [];
            const enrichmentSources = this.getConfig(ctx, 'sources', [
                'whois',
                'geoip',
                'reputation',
            ]);
            // Simulate enrichment
            const enrichedData = indicators.map((ind) => ({
                ...ind,
                enrichment: {
                    whois: enrichmentSources.includes('whois')
                        ? { registrar: 'Example Registrar', registeredDate: '2023-01-01' }
                        : undefined,
                    geoip: enrichmentSources.includes('geoip')
                        ? { country: 'US', city: 'New York', asn: 'AS12345' }
                        : undefined,
                    reputation: enrichmentSources.includes('reputation')
                        ? { score: Math.floor(Math.random() * 100), category: 'malicious' }
                        : undefined,
                },
                enrichedAt: new Date().toISOString(),
            }));
            const citations = enrichmentSources.map((source) => this.createCitation(`${source.toUpperCase()} Service`, `https://${source}.example.com`, 'Enrichment Provider', { queryTime: new Date().toISOString() }));
            const evidence = this.createEvidence('enriched_intelligence', { enrichedData }, citations, {
                indicatorCount: indicators.length,
                sourcesUsed: enrichmentSources.length,
                qualityScore: 0.85,
            });
            return this.success({
                enrichedIndicators: enrichedData,
                enrichmentSources,
                enrichedCount: enrichedData.length,
            }, {
                evidence: [evidence],
                citations,
                kpis: {
                    enrichedCount: enrichedData.length,
                    sourcesUsed: enrichmentSources.length,
                },
            });
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Enrichment failed');
        }
    }
}
exports.EnrichIntelStepExecutor = EnrichIntelStepExecutor;
