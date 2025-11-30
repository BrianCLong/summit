import { z } from 'zod';

// Enums
export enum PredictionType {
  FORECAST = 'FORECAST',
  RISK_SCORE = 'RISK_SCORE',
  ANOMALY = 'ANOMALY',
  CLASSIFICATION = 'CLASSIFICATION',
}

export enum BindingStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  EXPIRED = 'EXPIRED',
}

export enum ConditionOperator {
  GT = 'GT',
  LT = 'LT',
  EQ = 'EQ',
  IN = 'IN',
  BETWEEN = 'BETWEEN',
}

// Zod Schemas
export const PredictionSchema = z.object({
  value: z.any(),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export const RuleConditionSchema = z.object({
  field: z.string(),
  operator: z.nativeEnum(ConditionOperator),
  threshold: z.any(),
});

export const TriggerRuleSchema = z.object({
  id: z.string(),
  condition: RuleConditionSchema,
  workflowTemplate: z.string(),
  parameters: z.record(z.any()),
  policyCheck: z.string(),
  priority: z.number().int(),
});

export const PredictionBindingSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  edgeId: z.string().optional(),
  predictionType: z.nativeEnum(PredictionType),
  modelId: z.string(),
  modelVersion: z.string(),
  prediction: PredictionSchema,
  triggerRules: z.array(TriggerRuleSchema),
  status: z.nativeEnum(BindingStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// TypeScript Types
export type Prediction = z.infer<typeof PredictionSchema>;
export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type TriggerRule = z.infer<typeof TriggerRuleSchema>;
export type PredictionBinding = z.infer<typeof PredictionBindingSchema>;

// Input Types
export interface BindPredictionInput {
  nodeId: string;
  edgeId?: string;
  predictionType: PredictionType;
  modelId: string;
  modelVersion: string;
  prediction: {
    value: any;
    confidence: number;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  };
  triggerRules: {
    condition: {
      field: string;
      operator: ConditionOperator;
      threshold: any;
    };
    workflowTemplate: string;
    parameters: Record<string, any>;
    policyCheck: string;
    priority: number;
  }[];
}

// Model Class
export class PredictionBindingModel {
  private bindings: Map<string, PredictionBinding> = new Map();

  /**
   * Create a new prediction binding
   */
  create(input: BindPredictionInput): PredictionBinding {
    const id = `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const binding: PredictionBinding = {
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
    PredictionBindingSchema.parse(binding);

    this.bindings.set(id, binding);
    return binding;
  }

  /**
   * Get binding by ID
   */
  getById(id: string): PredictionBinding | undefined {
    return this.bindings.get(id);
  }

  /**
   * Get all bindings for a node
   */
  getByNodeId(nodeId: string): PredictionBinding[] {
    return Array.from(this.bindings.values()).filter(
      (b) => b.nodeId === nodeId,
    );
  }

  /**
   * Get active bindings with filters
   */
  getActiveBindings(filters?: {
    predictionType?: PredictionType;
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): PredictionBinding[] {
    let results = Array.from(this.bindings.values()).filter(
      (b) => b.status === BindingStatus.ACTIVE,
    );

    if (filters?.predictionType) {
      results = results.filter((b) => b.predictionType === filters.predictionType);
    }

    if (filters?.minConfidence !== undefined) {
      results = results.filter(
        (b) => b.prediction.confidence >= filters.minConfidence!,
      );
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
  updateStatus(id: string, status: BindingStatus): PredictionBinding | undefined {
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
  expire(id: string): boolean {
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
  checkExpiration(id: string): boolean {
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
  getAll(): PredictionBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Delete binding (for testing)
   */
  delete(id: string): boolean {
    return this.bindings.delete(id);
  }

  /**
   * Clear all bindings (for testing)
   */
  clear(): void {
    this.bindings.clear();
  }
}
