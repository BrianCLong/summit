import { headersSanityContract } from './headers_sanity.js';
import { toolCallsContract } from './tool_calls.js';
import { jsonStrictnessContract } from './json_strictness.js';
import { maxTokensContract } from './max_tokens.js';
import { streamingContract } from './streaming.js';
import { rateLimitContract } from './rate_limit.js';

export const defaultContracts = [
  headersSanityContract,
  toolCallsContract,
  jsonStrictnessContract,
  maxTokensContract,
  streamingContract,
  rateLimitContract,
];
