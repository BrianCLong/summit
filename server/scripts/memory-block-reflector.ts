import { MemoryBlockOwnerType, MemoryBlockService } from '../src/services/MemoryBlockService.js';
import logger from '../src/utils/logger.js';

interface ReflectionConfig {
  tenantId: string;
  agentId: string;
  labels: string[];
  actorId: string;
  actorType: MemoryBlockOwnerType;
  delta: string;
}

const parseLabels = (raw?: string): string[] =>
  (raw || 'research_state')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);

async function main() {
  const config: ReflectionConfig = {
    tenantId: process.env.TENANT_ID || 'default-tenant',
    agentId: process.env.AGENT_ID || 'background-agent',
    labels: parseLabels(process.env.MEMORY_BLOCK_LABELS),
    actorId: process.env.ACTOR_ID || process.env.AGENT_ID || 'background-agent',
    actorType:
      (process.env.ACTOR_TYPE as MemoryBlockOwnerType) || 'agent',
    delta: process.env.MEMORY_DELTA || 'No recent interaction delta provided.',
  };

  const service = new MemoryBlockService();
  logger.info(
    {
      tenantId: config.tenantId,
      agentId: config.agentId,
      labels: config.labels,
    },
    'Running memory reflection worker',
  );

  const updates = await service.reflectAndUpdateBlocks(config);
  logger.info({ updatedBlocks: updates.length }, 'Memory reflection completed');
}

main().catch((err) => {
  logger.error({ err }, 'Memory reflection worker failed');
  process.exitCode = 1;
});
