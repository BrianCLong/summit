import {
  segmentRepository,
  auditRepository,
  type AuditContext,
} from '../db/index.js';
import { logger } from '../utils/logger.js';
import type { Segment, CreateSegmentInput, SegmentRule } from '../types/index.js';

const log = logger.child({ module: 'SegmentService' });

export class SegmentService {
  /**
   * Create a new segment.
   */
  async createSegment(
    input: CreateSegmentInput,
    auditContext: AuditContext,
  ): Promise<Segment> {
    // Validate rules structure
    this.validateRules(input.rules);

    const segment = await segmentRepository.create(input, auditContext.userId);

    await auditRepository.log(
      'segment',
      segment.id,
      'create',
      auditContext,
      undefined,
      { name: segment.name, rulesCount: segment.rules.length },
    );

    log.info({ name: segment.name, id: segment.id }, 'Segment created');
    return segment;
  }

  /**
   * Update a segment.
   */
  async updateSegment(
    id: string,
    input: Partial<CreateSegmentInput>,
    auditContext: AuditContext,
  ): Promise<Segment | null> {
    if (input.rules) {
      this.validateRules(input.rules);
    }

    const existing = await segmentRepository.findById(id);
    if (!existing) return null;

    const updated = await segmentRepository.update(id, input, auditContext.userId);
    if (!updated) return null;

    await auditRepository.log(
      'segment',
      id,
      'update',
      auditContext,
      { rulesCount: existing.rules.length },
      { rulesCount: updated.rules.length },
    );

    log.info({ name: updated.name, id }, 'Segment updated');
    return updated;
  }

  /**
   * Delete a segment.
   */
  async deleteSegment(id: string, auditContext: AuditContext): Promise<boolean> {
    const existing = await segmentRepository.findById(id);
    if (!existing) return false;

    const deleted = await segmentRepository.delete(id);
    if (deleted) {
      await auditRepository.log(
        'segment',
        id,
        'delete',
        auditContext,
        { name: existing.name },
        undefined,
      );
      log.info({ name: existing.name, id }, 'Segment deleted');
    }

    return deleted;
  }

  /**
   * Get a segment by ID.
   */
  async getSegment(id: string): Promise<Segment | null> {
    return segmentRepository.findById(id);
  }

  /**
   * Get a segment by name.
   */
  async getSegmentByName(
    name: string,
    tenantId: string | null,
  ): Promise<Segment | null> {
    return segmentRepository.findByName(name, tenantId);
  }

  /**
   * List segments for a tenant.
   */
  async listSegments(
    tenantId: string | null,
    options?: { limit?: number; offset?: number },
  ) {
    return segmentRepository.listByTenant(tenantId, options);
  }

  /**
   * Find segments accessible to a tenant.
   */
  async findAccessibleSegments(tenantId: string | null): Promise<Segment[]> {
    return segmentRepository.findAccessible(tenantId);
  }

  /**
   * Validate segment rules structure.
   */
  private validateRules(rules: SegmentRule[]): void {
    for (const rule of rules) {
      if (!rule.conditions || rule.conditions.length === 0) {
        throw new Error('Each rule must have at least one condition');
      }

      for (const condition of rule.conditions) {
        if (!condition.attribute || condition.attribute.trim() === '') {
          throw new Error('Condition attribute is required');
        }
        if (!condition.operator) {
          throw new Error('Condition operator is required');
        }
      }
    }
  }
}

export const segmentService = new SegmentService();
