/**
 * @fileoverview Product Increment Service for Summit/IntelGraph Platform
 *
 * Provides comprehensive product increment (sprint/iteration) management:
 * - Increment lifecycle management (planning → active → review → completed → released)
 * - Goal and deliverable tracking with progress metrics
 * - Team assignments and capacity planning
 * - Burndown/burnup metrics and velocity tracking
 * - Investigation integration for linking work items
 *
 * @module services/ProductIncrementService
 */

import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import {
  ProductIncrementRepo,
  ProductIncrement,
  ProductIncrementInput,
  ProductIncrementUpdateInput,
  IncrementGoal,
  IncrementGoalInput,
  IncrementGoalUpdateInput,
  Deliverable,
  DeliverableInput,
  DeliverableUpdateInput,
  TeamAssignment,
  TeamAssignmentInput,
  MetricsSnapshot,
  IncrementSummary,
  IncrementFilter,
  IncrementStatus,
  GoalStatus,
  DeliverableStatus,
} from '../repos/ProductIncrementRepo.js';

const serviceLogger = logger.child({ name: 'ProductIncrementService' });

/**
 * Result type for operations that can fail
 */
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Increment statistics with computed metrics
 */
export interface IncrementStatistics {
  id: string;
  name: string;
  version: string;
  status: IncrementStatus;
  progressPercent: number;
  daysRemaining: number | null;
  daysElapsed: number | null;
  velocity: number | null;
  projectedCompletion: Date | null;
  isOnTrack: boolean;
  summary: IncrementSummary;
}

/**
 * Burndown chart data point
 */
export interface BurndownDataPoint {
  date: Date;
  idealRemaining: number;
  actualRemaining: number;
  completedPoints: number;
}

/**
 * Product Increment Service
 *
 * Handles all business logic for product increment management including
 * lifecycle transitions, metric calculations, and team coordination.
 */
export class ProductIncrementService {
  private repo: ProductIncrementRepo;

  constructor() {
    const pool = getPostgresPool();
    this.repo = new ProductIncrementRepo(pool);
  }

  // ===========================================================================
  // INCREMENT MANAGEMENT
  // ===========================================================================

  /**
   * Create a new product increment
   */
  async createIncrement(
    input: ProductIncrementInput,
    userId: string,
  ): Promise<ServiceResult<ProductIncrement>> {
    try {
      // Validate version uniqueness within tenant
      const existing = await this.repo.listIncrements({
        tenantId: input.tenantId,
        limit: 1000,
      });

      if (existing.some((inc) => inc.version === input.version)) {
        return {
          success: false,
          error: `Increment version "${input.version}" already exists`,
        };
      }

      // Validate date range
      if (input.plannedStartDate && input.plannedEndDate) {
        if (input.plannedStartDate > input.plannedEndDate) {
          return {
            success: false,
            error: 'Planned start date must be before end date',
          };
        }
      }

      const increment = await this.repo.createIncrement(input, userId);

      serviceLogger.info(
        { incrementId: increment.id, version: increment.version },
        'Product increment created',
      );

      return { success: true, data: increment };
    } catch (error) {
      serviceLogger.error({ error, input }, 'Failed to create increment');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing product increment
   */
  async updateIncrement(
    id: string,
    input: ProductIncrementUpdateInput,
    userId: string,
  ): Promise<ServiceResult<ProductIncrement>> {
    try {
      const existing = await this.repo.findIncrementById(id);
      if (!existing) {
        return { success: false, error: 'Increment not found' };
      }

      // Validate status transitions
      if (input.status && !this.isValidStatusTransition(existing.status, input.status)) {
        return {
          success: false,
          error: `Invalid status transition from "${existing.status}" to "${input.status}"`,
        };
      }

      const updated = await this.repo.updateIncrement(id, input, userId);
      if (!updated) {
        return { success: false, error: 'Failed to update increment' };
      }

      serviceLogger.info({ incrementId: id }, 'Product increment updated');

      return { success: true, data: updated };
    } catch (error) {
      serviceLogger.error({ error, id, input }, 'Failed to update increment');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a product increment
   */
  async deleteIncrement(
    id: string,
    userId: string,
  ): Promise<ServiceResult<boolean>> {
    try {
      const existing = await this.repo.findIncrementById(id);
      if (!existing) {
        return { success: false, error: 'Increment not found' };
      }

      // Prevent deletion of active or completed increments
      if (['active', 'completed', 'released'].includes(existing.status)) {
        return {
          success: false,
          error: `Cannot delete increment in "${existing.status}" status`,
        };
      }

      const deleted = await this.repo.deleteIncrement(id, userId);
      if (!deleted) {
        return { success: false, error: 'Failed to delete increment' };
      }

      serviceLogger.info({ incrementId: id }, 'Product increment deleted');

      return { success: true, data: true };
    } catch (error) {
      serviceLogger.error({ error, id }, 'Failed to delete increment');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get increment by ID
   */
  async getIncrement(id: string, tenantId?: string): Promise<ProductIncrement | null> {
    return this.repo.findIncrementById(id, tenantId);
  }

  /**
   * Get increment with full summary
   */
  async getIncrementSummary(
    id: string,
    tenantId?: string,
  ): Promise<IncrementSummary | null> {
    return this.repo.getIncrementSummary(id, tenantId);
  }

  /**
   * List increments with optional filters
   */
  async listIncrements(
    tenantId: string,
    filter?: IncrementFilter,
    limit?: number,
    offset?: number,
  ): Promise<ProductIncrement[]> {
    return this.repo.listIncrements({ tenantId, filter, limit, offset });
  }

  /**
   * Get the current active increment for a tenant
   */
  async getCurrentIncrement(tenantId: string): Promise<ProductIncrement | null> {
    return this.repo.getCurrentIncrement(tenantId);
  }

  /**
   * Start an increment (transition to active status)
   */
  async startIncrement(
    id: string,
    userId: string,
  ): Promise<ServiceResult<ProductIncrement>> {
    const existing = await this.repo.findIncrementById(id);
    if (!existing) {
      return { success: false, error: 'Increment not found' };
    }

    if (existing.status !== 'planning') {
      return {
        success: false,
        error: 'Only planning increments can be started',
      };
    }

    return this.updateIncrement(
      id,
      {
        status: 'active',
        actualStartDate: new Date(),
      },
      userId,
    );
  }

  /**
   * Complete an increment
   */
  async completeIncrement(
    id: string,
    userId: string,
  ): Promise<ServiceResult<ProductIncrement>> {
    const existing = await this.repo.findIncrementById(id);
    if (!existing) {
      return { success: false, error: 'Increment not found' };
    }

    if (existing.status !== 'active' && existing.status !== 'review') {
      return {
        success: false,
        error: 'Only active or review increments can be completed',
      };
    }

    // Record final metrics before completing
    await this.repo.recordMetricsSnapshot(id);

    return this.updateIncrement(
      id,
      {
        status: 'completed',
        actualEndDate: new Date(),
      },
      userId,
    );
  }

  /**
   * Release an increment
   */
  async releaseIncrement(
    id: string,
    releaseNotes: string,
    releaseTag: string,
    userId: string,
    releaseUrl?: string,
  ): Promise<ServiceResult<ProductIncrement>> {
    const existing = await this.repo.findIncrementById(id);
    if (!existing) {
      return { success: false, error: 'Increment not found' };
    }

    if (existing.status !== 'completed') {
      return {
        success: false,
        error: 'Only completed increments can be released',
      };
    }

    return this.updateIncrement(
      id,
      {
        status: 'released',
        releaseNotes,
        releaseTag,
        releaseUrl,
      },
      userId,
    );
  }

  // ===========================================================================
  // GOAL MANAGEMENT
  // ===========================================================================

  /**
   * Create a goal for an increment
   */
  async createGoal(
    input: IncrementGoalInput,
    userId: string,
  ): Promise<ServiceResult<IncrementGoal>> {
    try {
      // Validate increment exists
      const increment = await this.repo.findIncrementById(input.incrementId);
      if (!increment) {
        return { success: false, error: 'Increment not found' };
      }

      const goal = await this.repo.createGoal(input, userId);

      serviceLogger.info(
        { goalId: goal.id, incrementId: goal.incrementId },
        'Increment goal created',
      );

      return { success: true, data: goal };
    } catch (error) {
      serviceLogger.error({ error, input }, 'Failed to create goal');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a goal
   */
  async updateGoal(
    id: string,
    input: IncrementGoalUpdateInput,
  ): Promise<ServiceResult<IncrementGoal>> {
    try {
      // Auto-set completedAt when status changes to completed
      if (input.status === 'completed' && !input.completedAt) {
        input.completedAt = new Date();
      }

      const updated = await this.repo.updateGoal(id, input);
      if (!updated) {
        return { success: false, error: 'Goal not found' };
      }

      return { success: true, data: updated };
    } catch (error) {
      serviceLogger.error({ error, id, input }, 'Failed to update goal');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<ServiceResult<boolean>> {
    try {
      const deleted = await this.repo.deleteGoal(id);
      return { success: deleted, data: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get goal by ID
   */
  async getGoal(id: string): Promise<IncrementGoal | null> {
    return this.repo.findGoalById(id);
  }

  /**
   * List goals for an increment
   */
  async listGoals(incrementId: string): Promise<IncrementGoal[]> {
    return this.repo.listGoals(incrementId);
  }

  // ===========================================================================
  // DELIVERABLE MANAGEMENT
  // ===========================================================================

  /**
   * Create a deliverable
   */
  async createDeliverable(
    input: DeliverableInput,
    userId: string,
  ): Promise<ServiceResult<Deliverable>> {
    try {
      // Validate increment exists
      const increment = await this.repo.findIncrementById(input.incrementId);
      if (!increment) {
        return { success: false, error: 'Increment not found' };
      }

      // Validate goal exists if specified
      if (input.goalId) {
        const goal = await this.repo.findGoalById(input.goalId);
        if (!goal) {
          return { success: false, error: 'Goal not found' };
        }
      }

      const deliverable = await this.repo.createDeliverable(input, userId);

      serviceLogger.info(
        { deliverableId: deliverable.id, incrementId: deliverable.incrementId },
        'Deliverable created',
      );

      return { success: true, data: deliverable };
    } catch (error) {
      serviceLogger.error({ error, input }, 'Failed to create deliverable');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a deliverable
   */
  async updateDeliverable(
    id: string,
    input: DeliverableUpdateInput,
  ): Promise<ServiceResult<Deliverable>> {
    try {
      const existing = await this.repo.findDeliverableById(id);
      if (!existing) {
        return { success: false, error: 'Deliverable not found' };
      }

      // Auto-set timestamps based on status changes
      if (input.status === 'in_progress' && existing.status === 'ready' && !input.startedAt) {
        input.startedAt = new Date();
      }

      if (input.status === 'done' && existing.status !== 'done') {
        if (!input.completedAt) {
          input.completedAt = new Date();
        }
        input.progressPercent = 100;
      }

      const updated = await this.repo.updateDeliverable(id, input);
      if (!updated) {
        return { success: false, error: 'Failed to update deliverable' };
      }

      return { success: true, data: updated };
    } catch (error) {
      serviceLogger.error({ error, id, input }, 'Failed to update deliverable');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a deliverable
   */
  async deleteDeliverable(id: string): Promise<ServiceResult<boolean>> {
    try {
      const deleted = await this.repo.deleteDeliverable(id);
      return { success: deleted, data: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get deliverable by ID
   */
  async getDeliverable(id: string): Promise<Deliverable | null> {
    return this.repo.findDeliverableById(id);
  }

  /**
   * List deliverables for an increment
   */
  async listDeliverables(
    incrementId: string,
    options?: {
      status?: DeliverableStatus | DeliverableStatus[];
      assigneeId?: string;
      goalId?: string;
    },
  ): Promise<Deliverable[]> {
    return this.repo.listDeliverables(incrementId, options);
  }

  /**
   * Assign a deliverable to a user
   */
  async assignDeliverable(
    id: string,
    assigneeId: string,
    assigneeName?: string,
  ): Promise<ServiceResult<Deliverable>> {
    return this.updateDeliverable(id, { assigneeId, assigneeName });
  }

  /**
   * Update deliverable status
   */
  async updateDeliverableStatus(
    id: string,
    status: DeliverableStatus,
  ): Promise<ServiceResult<Deliverable>> {
    return this.updateDeliverable(id, { status });
  }

  // ===========================================================================
  // TEAM MANAGEMENT
  // ===========================================================================

  /**
   * Assign a team member to an increment
   */
  async assignTeamMember(
    input: TeamAssignmentInput,
  ): Promise<ServiceResult<TeamAssignment>> {
    try {
      // Validate increment exists
      const increment = await this.repo.findIncrementById(input.incrementId);
      if (!increment) {
        return { success: false, error: 'Increment not found' };
      }

      const assignment = await this.repo.assignTeamMember(input);

      serviceLogger.info(
        { incrementId: input.incrementId, userId: input.userId },
        'Team member assigned',
      );

      return { success: true, data: assignment };
    } catch (error) {
      serviceLogger.error({ error, input }, 'Failed to assign team member');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove a team member from an increment
   */
  async removeTeamMember(
    incrementId: string,
    userId: string,
  ): Promise<ServiceResult<boolean>> {
    try {
      const removed = await this.repo.removeTeamMember(incrementId, userId);

      if (removed) {
        serviceLogger.info({ incrementId, userId }, 'Team member removed');
      }

      return { success: removed, data: removed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get team members for an increment
   */
  async listTeamMembers(incrementId: string): Promise<TeamAssignment[]> {
    return this.repo.listTeamMembers(incrementId);
  }

  // ===========================================================================
  // METRICS AND ANALYTICS
  // ===========================================================================

  /**
   * Get computed statistics for an increment
   */
  async getIncrementStatistics(id: string): Promise<IncrementStatistics | null> {
    const summary = await this.repo.getIncrementSummary(id);
    if (!summary) return null;

    const now = new Date();
    let daysRemaining: number | null = null;
    let daysElapsed: number | null = null;
    let projectedCompletion: Date | null = null;
    let isOnTrack = true;

    // Calculate days metrics
    if (summary.plannedEndDate) {
      daysRemaining = Math.ceil(
        (summary.plannedEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    const startDate = summary.actualStartDate || summary.plannedStartDate;
    if (startDate) {
      daysElapsed = Math.ceil(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Calculate progress
    const progressPercent =
      summary.committedPoints > 0
        ? Math.round((summary.completedPoints / summary.committedPoints) * 100)
        : 0;

    // Calculate projected completion based on velocity
    if (summary.velocity && summary.velocity > 0 && summary.committedPoints > 0) {
      const remainingPoints = summary.committedPoints - summary.completedPoints;
      const weeksRemaining = remainingPoints / summary.velocity;
      projectedCompletion = new Date(
        now.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000,
      );

      // Check if on track
      if (summary.plannedEndDate && projectedCompletion > summary.plannedEndDate) {
        isOnTrack = false;
      }
    }

    // Check if blocked items indicate off-track
    if (summary.blockedDeliverables > 0) {
      isOnTrack = false;
    }

    return {
      id: summary.id,
      name: summary.name,
      version: summary.version,
      status: summary.status,
      progressPercent,
      daysRemaining,
      daysElapsed,
      velocity: summary.velocity || null,
      projectedCompletion,
      isOnTrack,
      summary,
    };
  }

  /**
   * Record a metrics snapshot for an increment
   */
  async recordMetricsSnapshot(incrementId: string): Promise<MetricsSnapshot | null> {
    try {
      return await this.repo.recordMetricsSnapshot(incrementId);
    } catch (error) {
      serviceLogger.error({ error, incrementId }, 'Failed to record metrics snapshot');
      return null;
    }
  }

  /**
   * Get burndown chart data for an increment
   */
  async getBurndownData(incrementId: string): Promise<BurndownDataPoint[]> {
    const increment = await this.repo.findIncrementById(incrementId);
    if (!increment) return [];

    const snapshots = await this.repo.getMetricsHistory(incrementId);
    if (snapshots.length === 0) return [];

    const startDate = increment.actualStartDate || increment.plannedStartDate;
    const endDate = increment.plannedEndDate;

    if (!startDate || !endDate) return [];

    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPoints = increment.committedPoints;

    return snapshots.map((snapshot) => {
      const dayNumber = Math.ceil(
        (snapshot.snapshotDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const idealRemaining =
        totalPoints - (totalPoints * dayNumber) / Math.max(totalDays, 1);

      return {
        date: snapshot.snapshotDate,
        idealRemaining: Math.max(0, idealRemaining),
        actualRemaining: snapshot.remainingPoints,
        completedPoints: snapshot.completedPoints,
      };
    });
  }

  /**
   * Get velocity history across increments
   */
  async getVelocityHistory(
    tenantId: string,
    limit: number = 10,
  ): Promise<Array<{ increment: ProductIncrement; velocity: number }>> {
    const completedIncrements = await this.repo.listIncrements({
      tenantId,
      filter: { status: ['completed', 'released'] },
      limit,
    });

    return completedIncrements
      .filter((inc) => inc.velocity !== undefined && inc.velocity !== null)
      .map((inc) => ({
        increment: inc,
        velocity: inc.velocity!,
      }));
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Validate status transition
   */
  private isValidStatusTransition(
    currentStatus: IncrementStatus,
    newStatus: IncrementStatus,
  ): boolean {
    const validTransitions: Record<IncrementStatus, IncrementStatus[]> = {
      planning: ['active', 'cancelled'],
      active: ['review', 'completed', 'cancelled'],
      review: ['active', 'completed', 'cancelled'],
      completed: ['released'],
      released: [], // Terminal state
      cancelled: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}

// Export singleton instance
export const productIncrementService = new ProductIncrementService();

export default ProductIncrementService;
