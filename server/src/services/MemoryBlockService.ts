import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';

export type MemoryBlockScope = 'LOCAL' | 'SHARED';
export type MemoryBlockOwnerType = 'agent' | 'user' | 'system';

export interface MemoryBlock {
  blockId: string;
  tenantId: string;
  ownerType: MemoryBlockOwnerType;
  ownerId: string;
  label: string;
  value: string;
  sizeLimit: number;
  description?: string | null;
  isReadOnly: boolean;
  scope: MemoryBlockScope;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemoryBlockRevision {
  id?: number;
  blockId: string;
  value: string;
  updatedBy?: string | null;
  updatedByType?: string | null;
  requestId?: string | null;
  createdAt?: Date;
}

export interface MemoryBlockShare {
  blockId: string;
  agentId: string;
  permissions: 'read' | 'write' | 'read_write';
  createdAt?: Date;
}

export interface CreateMemoryBlockInput {
  tenantId: string;
  ownerType: MemoryBlockOwnerType;
  ownerId: string;
  label: string;
  value?: string;
  sizeLimit: number;
  description?: string | null;
  isReadOnly?: boolean;
  scope?: MemoryBlockScope;
}

export interface ReplaceMemoryBlockInput {
  blockId: string;
  newValue: string;
  actorId: string;
  actorType: MemoryBlockOwnerType;
  requestId?: string;
}

export interface PromptCompilationOptions {
  tenantId: string;
  agentId: string;
  includeLabels?: string[];
}

const formatBlockForPrompt = (block: MemoryBlock): string => {
  const headerParts = [
    block.label,
    block.scope === 'SHARED' ? 'shared' : 'local',
    block.isReadOnly ? 'read-only' : 'mutable',
    `limit=${block.sizeLimit}`,
  ];

  return `- [${headerParts.join(' | ')}]\n${block.value}`;
};

const mapBlockRow = (row: any): MemoryBlock => ({
  blockId: row.block_id,
  tenantId: row.tenant_id,
  ownerType: row.owner_type,
  ownerId: row.owner_id,
  label: row.label,
  value: row.value,
  sizeLimit: Number(row.size_limit),
  description: row.description,
  isReadOnly: Boolean(row.is_read_only),
  scope: row.scope,
  createdAt: row.created_at ? new Date(row.created_at) : undefined,
  updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
});

export class MemoryBlockService {
  constructor(private readonly pool = getPostgresPool()) {}

  private assertWithinLimit(value: string, sizeLimit: number) {
    if (value.length > sizeLimit) {
      throw new Error(
        `Value exceeds size limit (${value.length} > ${sizeLimit})`,
      );
    }
  }

  private async recordRevision(revision: MemoryBlockRevision): Promise<void> {
    await this.pool.query(
      `INSERT INTO memory_block_revisions (block_id, value, updated_by, updated_by_type, request_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        revision.blockId,
        revision.value,
        revision.updatedBy ?? null,
        revision.updatedByType ?? null,
        revision.requestId ?? null,
      ],
    );
  }

  private async assertWriteAccess(block: MemoryBlock, actorId: string) {
    if (block.ownerType === 'agent' && block.ownerId === actorId) return;
    if (block.scope === 'LOCAL') {
      throw new Error('Write not permitted for this block');
    }

    const shareResult = await this.pool.query(
      `SELECT permissions FROM memory_block_shares WHERE block_id = $1 AND agent_id = $2`,
      [block.blockId, actorId],
    );

    const permissions: string | undefined = shareResult.rows?.[0]?.permissions;
    if (!permissions || !['write', 'read_write'].includes(permissions)) {
      throw new Error('Write not permitted for this block');
    }
  }

  async createBlock(input: CreateMemoryBlockInput): Promise<MemoryBlock> {
    const value = input.value ?? '';
    this.assertWithinLimit(value, input.sizeLimit);

    const blockId = uuidv4();
    const result = await this.pool.query(
      `INSERT INTO memory_blocks (block_id, tenant_id, owner_type, owner_id, label, value, size_limit, description, is_read_only, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING block_id, tenant_id, owner_type, owner_id, label, value, size_limit, description, is_read_only, scope, created_at, updated_at`,
      [
        blockId,
        input.tenantId,
        input.ownerType,
        input.ownerId,
        input.label,
        value,
        input.sizeLimit,
        input.description ?? null,
        input.isReadOnly ?? false,
        input.scope ?? 'LOCAL',
      ],
    );

    const block = mapBlockRow(result.rows[0]);
    await this.recordRevision({
      blockId: block.blockId,
      value: block.value,
      updatedBy: input.ownerId,
      updatedByType: input.ownerType,
    });
    return block;
  }

  async getBlock(blockId: string): Promise<MemoryBlock | null> {
    const result = await this.pool.query(
      `SELECT block_id, tenant_id, owner_type, owner_id, label, value, size_limit, description, is_read_only, scope, created_at, updated_at
       FROM memory_blocks WHERE block_id = $1`,
      [blockId],
    );

    if (!result.rows?.length) return null;
    return mapBlockRow(result.rows[0]);
  }

  async getBlocksForAgent(options: {
    tenantId: string;
    agentId: string;
    labels?: string[];
  }): Promise<MemoryBlock[]> {
    const params: any[] = [options.tenantId, options.agentId];
    const labelFilter = options.labels?.length
      ? `AND b.label = ANY($3)`
      : '';

    if (labelFilter) {
      params.push(options.labels);
    }

    const result = await this.pool.query(
      `SELECT DISTINCT b.block_id, b.tenant_id, b.owner_type, b.owner_id, b.label, b.value, b.size_limit, b.description, b.is_read_only, b.scope, b.created_at, b.updated_at
       FROM memory_blocks b
       LEFT JOIN memory_block_shares s ON b.block_id = s.block_id
       WHERE b.tenant_id = $1 AND (
         (b.owner_type = 'agent' AND b.owner_id = $2)
         OR b.scope = 'SHARED'
         OR (s.agent_id = $2 AND s.permissions IN ('read', 'write', 'read_write'))
       )
       ${labelFilter}
       ORDER BY b.label ASC, b.block_id ASC`,
      params,
    );

    return result.rows.map(mapBlockRow);
  }

  async replaceBlockValue(input: ReplaceMemoryBlockInput): Promise<MemoryBlock> {
    const block = await this.getBlock(input.blockId);
    if (!block) {
      throw new Error('Memory block not found');
    }

    if (block.isReadOnly) {
      throw new Error('Memory block is read-only');
    }

    await this.assertWriteAccess(block, input.actorId);
    this.assertWithinLimit(input.newValue, block.sizeLimit);

    const result = await this.pool.query(
      `UPDATE memory_blocks
       SET value = $1, updated_at = now()
       WHERE block_id = $2
       RETURNING block_id, tenant_id, owner_type, owner_id, label, value, size_limit, description, is_read_only, scope, created_at, updated_at`,
      [input.newValue, input.blockId],
    );

    const updated = mapBlockRow(result.rows[0]);
    await this.recordRevision({
      blockId: updated.blockId,
      value: updated.value,
      updatedBy: input.actorId,
      updatedByType: input.actorType,
      requestId: input.requestId,
    });
    return updated;
  }

  async upsertShare(share: MemoryBlockShare): Promise<void> {
    await this.pool.query(
      `INSERT INTO memory_block_shares (block_id, agent_id, permissions)
       VALUES ($1, $2, $3)
       ON CONFLICT (block_id, agent_id) DO UPDATE SET permissions = EXCLUDED.permissions`,
      [share.blockId, share.agentId, share.permissions],
    );
  }

  async compilePromptSection(
    options: PromptCompilationOptions,
  ): Promise<string> {
    const blocks = await this.getBlocksForAgent({
      tenantId: options.tenantId,
      agentId: options.agentId,
      labels: options.includeLabels,
    });

    const normalized = blocks.map((block) => ({
      ...block,
      value:
        block.value.length > block.sizeLimit
          ? `${block.value.slice(0, block.sizeLimit)}…`
          : block.value,
    }));

    return normalized
      .sort((a, b) => `${a.label}-${a.blockId}`.localeCompare(`${b.label}-${b.blockId}`))
      .map(formatBlockForPrompt)
      .join('\n\n');
  }

  async reflectAndUpdateBlocks(options: {
    tenantId: string;
    agentId: string;
    labels: string[];
    delta: string;
    actorId: string;
    actorType: MemoryBlockOwnerType;
  }): Promise<MemoryBlock[]> {
    const blocks = await this.getBlocksForAgent({
      tenantId: options.tenantId,
      agentId: options.agentId,
      labels: options.labels,
    });

    const updates: MemoryBlock[] = [];
    for (const block of blocks) {
      const proposedValue = this.buildReflection(block.value, options.delta, block.sizeLimit);
      const updated = await this.replaceBlockValue({
        blockId: block.blockId,
        newValue: proposedValue,
        actorId: options.actorId,
        actorType: options.actorType,
      });
      updates.push(updated);
    }

    if (!blocks.length) {
      logger.warn(
        {
          tenantId: options.tenantId,
          agentId: options.agentId,
          labels: options.labels,
        },
        'No memory blocks available for reflection update',
      );
    }

    return updates;
  }

  private buildReflection(existing: string, delta: string, limit: number): string {
    const normalizedDelta = delta.trim();
    const combined = `${existing}\n\nReflection:${normalizedDelta ? ' ' + normalizedDelta : ' none'}`;
    if (combined.length <= limit) return combined;

    return combined.slice(combined.length - limit);
  }
}
