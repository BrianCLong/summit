import { TagDefinition, TagValidationResult } from './types.js';
import logger from '../../utils/logger.js';

export const TAG_REGISTRY: TagDefinition[] = [
  {
    key: 'tenantId',
    type: 'string',
    scope: 'run',
    description: 'Tenant identifier for scoping analytics',
  },
  {
    key: 'workflow',
    type: 'string',
    scope: 'run',
    description: 'Workflow or pipeline name',
  },
  {
    key: 'stageOwner',
    type: 'string',
    scope: 'stage',
    description: 'Owning service or team for the stage',
  },
  {
    key: 'userTier',
    type: 'string',
    scope: 'system',
    description: 'Customer tier for cost attribution',
  },
  {
    key: 'region',
    type: 'string',
    scope: 'system',
    description: 'Region in which the span executed',
  },
  {
    key: 'source',
    type: 'string',
    scope: 'run',
    description: 'Source of the run (api|backfill|workflow)',
  },
  {
    key: 'priority',
    type: 'string',
    scope: 'run',
    description: 'Priority bucket used by queues',
  },
  {
    key: 'payloadHash',
    type: 'string',
    scope: 'run',
    description: 'Stable hash for deduplicating ingestion payloads',
  },
  {
    key: 'retryReason',
    type: 'string',
    scope: 'stage',
    description: 'Reason captured when a retry occurs',
  },
];

const registryMap = TAG_REGISTRY.reduce<Record<string, TagDefinition>>((acc, def) => {
  acc[def.key] = def;
  return acc;
}, {});

const strictValidationEnabled = () =>
  (process.env.OBS_TAG_REGISTRY_STRICT || '').toLowerCase() === 'true';

export function validateTags(
  tags: Record<string, string | number | boolean> = {},
): TagValidationResult {
  const valid: Record<string, string | number | boolean> = {};
  const invalidKeys: string[] = [];

  for (const [key, value] of Object.entries(tags)) {
    const def = registryMap[key];
    if (!def) {
      invalidKeys.push(key);
      continue;
    }

    const valueType = typeof value;
    if (valueType !== def.type) {
      invalidKeys.push(key);
      continue;
    }

    if (def.pii) {
      invalidKeys.push(key);
      continue;
    }

    valid[key] = value;
  }

  if (invalidKeys.length > 0) {
    const message = `Rejecting unknown or disallowed tags: ${invalidKeys.join(', ')}`;
    if (strictValidationEnabled()) {
      throw new Error(message);
    } else {
      logger.warn({ invalidKeys }, 'OBS_TAG_REGISTRY_STRICT=false so tagging continued');
    }
  }

  return { valid, invalidKeys };
}
