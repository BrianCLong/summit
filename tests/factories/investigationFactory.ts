/**
 * Investigation Factory
 *
 * Generates test investigation data
 */

import { randomUUID } from 'crypto';

export interface TestInvestigation {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigneeId: string | null;
  creatorId: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestigationFactoryOptions {
  id?: string;
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'closed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string | null;
  creatorId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a test investigation with optional overrides
 */
export function investigationFactory(options: InvestigationFactoryOptions = {}): TestInvestigation {
  const id = options.id || randomUUID();
  const now = new Date();

  return {
    id,
    title: options.title || `Test Investigation ${id.slice(0, 8)}`,
    description: options.description || 'This is a test investigation',
    status: options.status || 'open',
    priority: options.priority || 'medium',
    assigneeId: options.assigneeId !== undefined ? options.assigneeId : null,
    creatorId: options.creatorId || randomUUID(),
    tags: options.tags || ['test', 'investigation'],
    metadata: options.metadata || {},
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * Create multiple test investigations
 */
export function investigationFactoryBatch(
  count: number,
  options: InvestigationFactoryOptions = {}
): TestInvestigation[] {
  return Array.from({ length: count }, () => investigationFactory(options));
}

/**
 * Create a high-priority investigation
 */
export function criticalInvestigationFactory(
  options: InvestigationFactoryOptions = {}
): TestInvestigation {
  return investigationFactory({ ...options, priority: 'critical', status: 'in_progress' });
}
