/**
 * Knowledge Federation & Privacy v2
 * Learn cross-tenant safely via federated distillation and DP budgets
 */

import { EventEmitter } from 'events';

export interface FederatedModel {
  id: string;
  type: 'policy' | 'code_quality' | 'security' | 'performance';
  version: string;
  parameters: number[];
  accuracy: number;
  participants: string[];
  dpEpsilon: number;
  createdAt: number;
}

export interface DistillationResult {
  studentModel: FederatedModel;
  teacherAccuracy: number;
  studentAccuracy: number;
  compressionRatio: number;
  dpBudgetUsed: number;
  savingsPercent: number;
}

export interface DPLedgerEntry {
  tenantId: string;
  epsilon: number;
  spent: number;
  operation: string;
  timestamp: number;
}

export interface TeacherOutput {
  tenantId: string;
  logits: number[];
  gradients: number[];
  noise: number;
  timestamp: number;
}

export class KnowledgeFederation extends EventEmitter {
  private dpBudget: number;
  private dpLedger: Map<string, DPLedgerEntry> = new Map();
  private federatedModels: Map<string, FederatedModel> = new Map();
  private teacherOutputs: Map<string, TeacherOutput[]> = new Map();
  private distillationHistory: DistillationResult[] = [];

  constructor(dpBudget: number = 1.5) {
    super();
    this.dpBudget = dpBudget;
    this.initializeTenantBudgets();
  }

  private initializeTenantBudgets(): void {
    // Initialize default tenant DP budgets
    const defaultTenants = ['default', 'enterprise', 'trial'];

    for (const tenant of defaultTenants) {
      this.dpLedger.set(tenant, {
        tenantId: tenant,
        epsilon: this.dpBudget,
        spent: 0,
        operation: 'init',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Charge differential privacy budget for a tenant
   */
  chargeDPBudget(tenantId: string, epsilon: number, operation: string): void {
    const ledgerEntry = this.dpLedger.get(tenantId);

    if (!ledgerEntry) {
      // Create new tenant entry
      this.dpLedger.set(tenantId, {
        tenantId,
        epsilon: this.dpBudget,
        spent: epsilon,
        operation,
        timestamp: Date.now(),
      });
      return;
    }

    if (ledgerEntry.spent + epsilon > ledgerEntry.epsilon) {
      const error = `DP budget exceeded for tenant ${tenantId}: ${ledgerEntry.spent + epsilon} > ${ledgerEntry.epsilon}`;
      this.emit('dpBudgetExceeded', {
        tenantId,
        requested: epsilon,
        available: ledgerEntry.epsilon - ledgerEntry.spent,
      });
      throw new Error(error);
    }

    ledgerEntry.spent += epsilon;
    ledgerEntry.operation = operation;
    ledgerEntry.timestamp = Date.now();

    this.emit('dpBudgetCharged', {
      tenantId,
      epsilon,
      remaining: ledgerEntry.epsilon - ledgerEntry.spent,
    });
  }

  /**
   * Perform federated distillation across tenants
   */
  async performFederatedDistillation(
    modelType: 'policy' | 'code_quality' | 'security' | 'performance',
    participantTenants: string[],
  ): Promise<DistillationResult> {
    try {
      // Step 1: Collect teacher outputs from each tenant
      const teacherOutputs: TeacherOutput[] = [];

      for (const tenant of participantTenants) {
        const output = await this.collectTeacherOutput(tenant, modelType);
        teacherOutputs.push(output);
      }

      // Step 2: Train student model using noisy teacher outputs
      const studentModel = await this.trainStudentModel(
        modelType,
        teacherOutputs,
      );

      // Step 3: Evaluate performance
      const teacherAccuracy =
        await this.evaluateTeacherEnsemble(teacherOutputs);
      const studentAccuracy = await this.evaluateStudentModel(studentModel);

      // Step 4: Calculate metrics
      const compressionRatio = this.calculateCompressionRatio(
        teacherOutputs,
        studentModel,
      );
      const dpBudgetUsed = teacherOutputs.reduce(
        (sum, output) => sum + output.noise,
        0,
      );
      const savingsPercent = Math.max(
        0,
        ((teacherAccuracy - studentAccuracy) / teacherAccuracy) * 100,
      );

      const result: DistillationResult = {
        studentModel,
        teacherAccuracy,
        studentAccuracy,
        compressionRatio,
        dpBudgetUsed,
        savingsPercent,
      };

      // Store the federated model
      this.federatedModels.set(studentModel.id, studentModel);
      this.distillationHistory.push(result);

      this.emit('distillationComplete', result);
      return result;
    } catch (error) {
      this.emit('distillationError', {
        modelType,
        participants: participantTenants,
        error: error.message,
      });
      throw error;
    }
  }

  private async collectTeacherOutput(
    tenantId: string,
    modelType: string,
  ): Promise<TeacherOutput> {
    // Simulate collecting teacher model outputs from tenant
    const baseAccuracy = this.getModelBaseAccuracy(modelType);
    const numClasses = this.getModelNumClasses(modelType);

    // Generate synthetic teacher logits
    const logits = Array.from(
      { length: numClasses },
      () => Math.random() * 2 - 1,
    );

    // Generate synthetic gradients
    const gradients = Array.from(
      { length: 100 },
      () => Math.random() * 0.1 - 0.05,
    );

    // Add differential privacy noise
    const dpEpsilon = 0.1; // Small epsilon for privacy
    this.chargeDPBudget(tenantId, dpEpsilon, `teacher_output_${modelType}`);

    const noise = this.addDifferentialPrivacyNoise(dpEpsilon);

    return {
      tenantId,
      logits: logits.map((l) => l + noise * 0.01),
      gradients: gradients.map((g) => g + noise * 0.001),
      noise: dpEpsilon,
      timestamp: Date.now(),
    };
  }

  private addDifferentialPrivacyNoise(epsilon: number): number {
    // Laplace mechanism for differential privacy
    const sensitivity = 1.0; // Assumed sensitivity
    const scale = sensitivity / epsilon;

    // Generate Laplace noise
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    return noise;
  }

  private async trainStudentModel(
    modelType: string,
    teacherOutputs: TeacherOutput[],
  ): Promise<FederatedModel> {
    // Simulate training a smaller student model from teacher outputs
    const numParameters = 50; // Smaller than teacher models
    const parameters = Array.from(
      { length: numParameters },
      () => Math.random() - 0.5,
    );

    // Average teacher logits with DP noise
    const avgLogits = this.averageTeacherLogits(teacherOutputs);

    // Train student to match averaged teacher outputs (simplified)
    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < parameters.length; i++) {
        const gradient = (Math.random() - 0.5) * 0.01;
        parameters[i] += gradient * 0.1; // Learning rate 0.1
      }
    }

    const studentModel: FederatedModel = {
      id: `federated-${modelType}-${Date.now()}`,
      type: modelType as any,
      version: '1.0',
      parameters,
      accuracy: this.calculateStudentAccuracy(teacherOutputs, parameters),
      participants: teacherOutputs.map((t) => t.tenantId),
      dpEpsilon: teacherOutputs.reduce((sum, t) => sum + t.noise, 0),
      createdAt: Date.now(),
    };

    return studentModel;
  }

  private averageTeacherLogits(teacherOutputs: TeacherOutput[]): number[] {
    if (teacherOutputs.length === 0) return [];

    const numClasses = teacherOutputs[0].logits.length;
    const avgLogits = Array(numClasses).fill(0);

    for (const output of teacherOutputs) {
      for (let i = 0; i < numClasses; i++) {
        avgLogits[i] += output.logits[i] / teacherOutputs.length;
      }
    }

    return avgLogits;
  }

  private calculateStudentAccuracy(
    teacherOutputs: TeacherOutput[],
    parameters: number[],
  ): number {
    // Simulate accuracy based on teacher quality and student size
    const avgTeacherQuality = teacherOutputs.length > 0 ? 0.85 : 0.0;
    const parameterPenalty = Math.max(
      0,
      ((100 - parameters.length) / 100) * 0.05,
    );
    const noisePenalty =
      teacherOutputs.reduce((sum, t) => sum + t.noise, 0) * 0.01;

    return Math.max(0.5, avgTeacherQuality - parameterPenalty - noisePenalty);
  }

  private async evaluateTeacherEnsemble(
    teacherOutputs: TeacherOutput[],
  ): Promise<number> {
    // Simulate teacher ensemble accuracy
    const baseAccuracy = 0.9;
    const ensembleBonus = Math.min(0.05, teacherOutputs.length * 0.01);
    return Math.min(0.95, baseAccuracy + ensembleBonus);
  }

  private async evaluateStudentModel(
    studentModel: FederatedModel,
  ): Promise<number> {
    return studentModel.accuracy;
  }

  private calculateCompressionRatio(
    teacherOutputs: TeacherOutput[],
    studentModel: FederatedModel,
  ): number {
    const teacherParams = teacherOutputs.length * 1000; // Assume 1000 params per teacher
    const studentParams = studentModel.parameters.length;
    return teacherParams / studentParams;
  }

  private getModelBaseAccuracy(modelType: string): number {
    const accuracies = {
      policy: 0.88,
      code_quality: 0.85,
      security: 0.92,
      performance: 0.8,
    };
    return accuracies[modelType] || 0.85;
  }

  private getModelNumClasses(modelType: string): number {
    const classes = {
      policy: 5,
      code_quality: 3,
      security: 4,
      performance: 6,
    };
    return classes[modelType] || 5;
  }

  /**
   * Get DP budget status for a tenant
   */
  getDPBudgetStatus(
    tenantId: string,
  ): { epsilon: number; spent: number; remaining: number } | null {
    const entry = this.dpLedger.get(tenantId);
    if (!entry) return null;

    return {
      epsilon: entry.epsilon,
      spent: entry.spent,
      remaining: entry.epsilon - entry.spent,
    };
  }

  /**
   * Get all DP ledger entries
   */
  getDPLedger(): Map<string, DPLedgerEntry> {
    return this.dpLedger;
  }

  /**
   * Get federated models
   */
  getFederatedModels(): Map<string, FederatedModel> {
    return this.federatedModels;
  }

  /**
   * Get distillation history
   */
  getDistillationHistory(): DistillationResult[] {
    return this.distillationHistory;
  }

  /**
   * Reset DP budget for a tenant (administrative operation)
   */
  resetDPBudget(tenantId: string, newEpsilon?: number): void {
    const epsilon = newEpsilon || this.dpBudget;

    this.dpLedger.set(tenantId, {
      tenantId,
      epsilon,
      spent: 0,
      operation: 'reset',
      timestamp: Date.now(),
    });

    this.emit('dpBudgetReset', { tenantId, epsilon });
  }

  /**
   * Check if federated learning can proceed with budget constraints
   */
  canPerformFederatedLearning(
    participantTenants: string[],
    requiredEpsilon: number,
  ): {
    allowed: boolean;
    reason?: string;
    budgetStatus: Record<string, any>;
  } {
    const budgetStatus: Record<string, any> = {};

    for (const tenant of participantTenants) {
      const status = this.getDPBudgetStatus(tenant);
      if (!status) {
        return {
          allowed: false,
          reason: `No DP budget found for tenant: ${tenant}`,
          budgetStatus,
        };
      }

      budgetStatus[tenant] = status;

      if (status.remaining < requiredEpsilon) {
        return {
          allowed: false,
          reason: `Insufficient DP budget for tenant ${tenant}: ${status.remaining} < ${requiredEpsilon}`,
          budgetStatus,
        };
      }
    }

    return { allowed: true, budgetStatus };
  }

  /**
   * Get system status for federated learning
   */
  async getStatus(): Promise<{ savings: number; epsilon: number }> {
    // Calculate average cost savings from federated models
    const avgSavings =
      this.distillationHistory.length > 0
        ? this.distillationHistory.reduce(
            (sum, result) => sum + result.savingsPercent,
            0,
          ) / this.distillationHistory.length
        : 0;

    // Calculate total epsilon usage across all tenants
    const totalEpsilonUsed = Array.from(this.dpLedger.values()).reduce(
      (sum, entry) => sum + entry.spent,
      0,
    );

    return {
      savings: avgSavings / 100, // Convert percentage to decimal
      epsilon: totalEpsilonUsed,
    };
  }

  /**
   * Predict federated learning benefits
   */
  predictFederatedBenefits(
    modelType: string,
    participantTenants: string[],
  ): {
    estimatedSavings: number;
    estimatedAccuracy: number;
    requiredEpsilon: number;
    feasible: boolean;
  } {
    const baseAccuracy = this.getModelBaseAccuracy(modelType);
    const ensembleBonus = Math.min(0.05, participantTenants.length * 0.01);
    const estimatedAccuracy = Math.min(0.95, baseAccuracy + ensembleBonus);

    const requiredEpsilon = participantTenants.length * 0.1; // 0.1 epsilon per participant
    const estimatedSavings = Math.min(0.12, participantTenants.length * 0.02); // 2% savings per participant, max 12%

    const feasibilityCheck = this.canPerformFederatedLearning(
      participantTenants,
      requiredEpsilon,
    );

    return {
      estimatedSavings,
      estimatedAccuracy,
      requiredEpsilon,
      feasible: feasibilityCheck.allowed,
    };
  }

  /**
   * Archive old distillation results
   */
  archiveOldResults(olderThanDays: number = 30): number {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const initialCount = this.distillationHistory.length;

    this.distillationHistory = this.distillationHistory.filter(
      (result) => result.studentModel.createdAt > cutoffTime,
    );

    const archivedCount = initialCount - this.distillationHistory.length;
    this.emit('resultsArchived', {
      archivedCount,
      remaining: this.distillationHistory.length,
    });

    return archivedCount;
  }
}

export default KnowledgeFederation;
