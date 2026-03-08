"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionBindingModel = exports.PredictionBindingSchema = exports.TriggerRuleSchema = exports.RuleConditionSchema = exports.PredictionSchema = exports.ConditionOperator = exports.BindingStatus = exports.PredictionType = void 0;
const zod_1 = require("zod");
// Enums
var PredictionType;
(function (PredictionType) {
    PredictionType["FORECAST"] = "FORECAST";
    PredictionType["RISK_SCORE"] = "RISK_SCORE";
    PredictionType["ANOMALY"] = "ANOMALY";
    PredictionType["CLASSIFICATION"] = "CLASSIFICATION";
})(PredictionType || (exports.PredictionType = PredictionType = {}));
var BindingStatus;
(function (BindingStatus) {
    BindingStatus["ACTIVE"] = "ACTIVE";
    BindingStatus["TRIGGERED"] = "TRIGGERED";
    BindingStatus["EXPIRED"] = "EXPIRED";
})(BindingStatus || (exports.BindingStatus = BindingStatus = {}));
var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["GT"] = "GT";
    ConditionOperator["LT"] = "LT";
    ConditionOperator["EQ"] = "EQ";
    ConditionOperator["IN"] = "IN";
    ConditionOperator["BETWEEN"] = "BETWEEN";
})(ConditionOperator || (exports.ConditionOperator = ConditionOperator = {}));
// Zod Schemas
exports.PredictionSchema = zod_1.z.object({
    value: zod_1.z.any(),
    confidence: zod_1.z.number().min(0).max(1),
    timestamp: zod_1.z.date(),
    expiresAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.RuleConditionSchema = zod_1.z.object({
    field: zod_1.z.string(),
    operator: zod_1.z.nativeEnum(ConditionOperator),
    threshold: zod_1.z.any(),
});
exports.TriggerRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    condition: exports.RuleConditionSchema,
    workflowTemplate: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.any()),
    policyCheck: zod_1.z.string(),
    priority: zod_1.z.number().int(),
});
exports.PredictionBindingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nodeId: zod_1.z.string(),
    edgeId: zod_1.z.string().optional(),
    predictionType: zod_1.z.nativeEnum(PredictionType),
    modelId: zod_1.z.string(),
    modelVersion: zod_1.z.string(),
    prediction: exports.PredictionSchema,
    triggerRules: zod_1.z.array(exports.TriggerRuleSchema),
    status: zod_1.z.nativeEnum(BindingStatus),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Model Class
class PredictionBindingModel {
    bindings = new Map();
    /**
     * Create a new prediction binding
     */
    create(input) {
        const id = `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const binding = {
            id,
            nodeId: input.nodeId,
            edgeId: input.edgeId,
            predictionType: input.predictionType,
            modelId: input.modelId,
            modelVersion: input.modelVersion,
            prediction: {
                ...input.prediction,
                timestamp: now,
            },
            triggerRules: input.triggerRules.map((rule, index) => ({
                id: `rule_${id}_${index}`,
                condition: rule.condition,
                workflowTemplate: rule.workflowTemplate,
                parameters: rule.parameters,
                policyCheck: rule.policyCheck,
                priority: rule.priority,
            })),
            status: BindingStatus.ACTIVE,
            createdAt: now,
            updatedAt: now,
        };
        // Validate with Zod
        exports.PredictionBindingSchema.parse(binding);
        this.bindings.set(id, binding);
        return binding;
    }
    /**
     * Get binding by ID
     */
    getById(id) {
        return this.bindings.get(id);
    }
    /**
     * Get all bindings for a node
     */
    getByNodeId(nodeId) {
        return Array.from(this.bindings.values()).filter((b) => b.nodeId === nodeId);
    }
    /**
     * Get active bindings with filters
     */
    getActiveBindings(filters) {
        let results = Array.from(this.bindings.values()).filter((b) => b.status === BindingStatus.ACTIVE);
        if (filters?.predictionType) {
            results = results.filter((b) => b.predictionType === filters.predictionType);
        }
        if (filters?.minConfidence !== undefined) {
            results = results.filter((b) => b.prediction.confidence >= filters.minConfidence);
        }
        // Sort by confidence descending
        results.sort((a, b) => b.prediction.confidence - a.prediction.confidence);
        const offset = filters?.offset ?? 0;
        const limit = filters?.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    /**
     * Update binding status
     */
    updateStatus(id, status) {
        const binding = this.bindings.get(id);
        if (binding) {
            binding.status = status;
            binding.updatedAt = new Date();
            return binding;
        }
        return undefined;
    }
    /**
     * Expire a binding
     */
    expire(id) {
        const binding = this.bindings.get(id);
        if (binding) {
            binding.status = BindingStatus.EXPIRED;
            binding.updatedAt = new Date();
            return true;
        }
        return false;
    }
    /**
     * Check if binding should be expired based on expiresAt
     */
    checkExpiration(id) {
        const binding = this.bindings.get(id);
        if (!binding || !binding.prediction.expiresAt) {
            return false;
        }
        if (new Date() > binding.prediction.expiresAt) {
            this.expire(id);
            return true;
        }
        return false;
    }
    /**
     * Get all bindings (for internal use)
     */
    getAll() {
        return Array.from(this.bindings.values());
    }
    /**
     * Delete binding (for testing)
     */
    delete(id) {
        return this.bindings.delete(id);
    }
    /**
     * Clear all bindings (for testing)
     */
    clear() {
        this.bindings.clear();
    }
}
exports.PredictionBindingModel = PredictionBindingModel;
