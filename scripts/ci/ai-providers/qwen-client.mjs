/**
 * Qwen OpenAI-compatible Client
 * Implements OpenAI-compatible interface for Qwen models via DashScope
 */

import OpenAI from 'openai';
import { createHash } from 'node:crypto';

// Cache for deterministic replay
let cache = new Map();

// Load cache from disk if needed
function loadCache() {
  if (typeof process.env.QWEN_CACHE_PATH !== 'undefined') {
    try {
      // In a real implementation, we would load from disk
      // For now, initialize empty cache for demo purposes
      cache = new Map();
    } catch (error) {
      console.warn(`Could not load Qwen cache from ${process.env.QWEN_CACHE_PATH}: ${error.message}`);
      cache = new Map();
    }
  } else {
    cache = new Map();
  }
}

export function makeQwenClient() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY environment variable is required for Qwen integration');
  }

  return new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  });
}

export function generateCacheKey(model, messages, params, promptVersion = '1.0') {
  // Create deterministic cache key from inputs
  const combined = [
    model || '',
    JSON.stringify(messages.sort((a, b) => (a.role + a.content).localeCompare(b.role + b.content))),
    JSON.stringify(params || {}),
    promptVersion,
  ].join('|');
  
  return createHash('sha256').update(combined).digest('hex');
}

export async function callQwen(messages, opts = {}) {
  const model = process.env.QWEN_MODEL ?? "qwen-plus-2025-01-25";
  const client = makeQwenClient();
  
  // Prepare parameters for determinism
  const params = {
    model,
    messages,
    temperature: 0, // Deterministic setting
    ...opts // Allow overrides but keep temperature=0 as default
  };

  // Remove top_p if temperature is 0 (avoid conflicts)
  if (params.temperature === 0 && params.top_p) {
    delete params.top_p;
  }

  // Generate cache key for deterministic replay
  const cacheKey = generateCacheKey(model, messages, params);
  
  // Check cache for replay mode
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Live call mode
  if (process.env.QWEN_REPLAY_ONLY === 'true') {
    throw new Error(`No cached response found for key: ${cacheKey}. Run with QWEN_RECORD=true to record.`);
  }
  
  console.debug(`Calling Qwen API (model: ${model})`);
  const response = await client.chat.completions.create(params);
  
  // Cache response if recording
  if (process.env.QWEN_RECORD !== 'false') {
    cache.set(cacheKey, response);
  }
  
  return response;
}

// Validation functions
export function validateQwenConfig() {
  const errors = [];
  
  if (!process.env.DASHSCOPE_API_KEY) {
    errors.push('DASHSCOPE_API_KEY environment variable is required');
  }
  
  // Check for pinned model versions (reject latest)
  const model = process.env.QWEN_MODEL;
  if (model && (model.includes('-latest') || model.includes('latest'))) {
    errors.push(`Qwen model "${model}" uses unstable version, use pinned snapshot (e.g., qwen-plus-2025-01-25)`);
  }
  
  if (!process.env.QWEN_BASE_URL) {
    errors.push('QWEN_BASE_URL environment variable should be set (e.g., https://dashscope-intl.aliyuncs.com/compatible-mode/v1)');
  }
  
  if (errors.length > 0) {
    throw new Error(`Qwen configuration validation failed:\n${errors.join('\n')}`);
  }
}

loadCache();