/**
 * Qwen OpenAI-compatible Client with Deterministic Caching
 * Implements OpenAI-compatible interface for Qwen models via DashScope
 */

import OpenAI from 'openai';
import { createHash } from 'node:crypto';
import cache from './cache.mjs';

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

// Create Qwen client with OpenAI-compatible interface
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

// Generate deterministic cache key from request parameters
export function generateCacheKey(model, messages, params, promptVersion = '1.0', inputHash = null) {
  // Normalize and sort messages for deterministic hashing
  const normalizedMessages = messages
    .map(msg => ({ role: msg.role, content: msg.content }))
    .sort((a, b) => (a.role + a.content).localeCompare(b.role + b.content));

  const keyData = [
    model || '',
    JSON.stringify(normalizedMessages),
    JSON.stringify(params || {}),
    promptVersion,
    inputHash || ''
  ].join('|');
  
  return createHash('sha256').update(keyData).digest('hex');
}

// Main function to call Qwen with optional caching
export async function callQwen(messages, params = {}, inputHash = null) {
  validateQwenConfig();
  
  const model = process.env.QWEN_MODEL ?? "qwen-plus-2025-01-25";
  const client = makeQwenClient();
  
  // Prepare parameters for determinism
  const requestParams = {
    model,
    messages,
    temperature: 0, // Deterministic setting
    ...params // Allow overrides but keep temperature=0 as default
  };

  // Remove top_p if temperature is 0 (avoid conflicts)
  if (requestParams.temperature === 0 && requestParams.top_p) {
    delete requestParams.top_p;
  }

  // Generate cache key for deterministic replay
  const cacheKey = generateCacheKey(model, messages, requestParams, '1.0', inputHash);
  
  // Check cache for replay mode
  const cachedResponse = await cache.get(cacheKey);
  if (cachedResponse) {
    console.debug(`[QWEN CACHE] Using cached response for key: ${cacheKey.substring(0, 12)}...`);
    return cachedResponse;
  }

  // Check if we're in replay-only mode
  if (process.env.QWEN_REPLAY_ONLY === 'true') {
    throw new Error(`No cached response found for key: ${cacheKey}.\n` +
                   `Run with QWEN_RECORD=true to record new responses.`);
  }
  
  console.debug(`[QWEN] Calling API for model: ${model}, cache key: ${cacheKey.substring(0, 12)}...`);
  const response = await client.chat.completions.create(requestParams);
  
  // Cache response if recording
  if (process.env.QWEN_RECORD !== 'false') {
    await cache.put(cacheKey, response);
  }
  
  return response;
}

// Specific function for evidence analysis
export async function analyzeDocumentWithQwen(documentContent, analysisPrompt) {
  const systemPrompt = `You are a governance compliance expert tasked with validating Evidence-IDs in governance documents. 
  Ensure each Evidence-ID follows the format /^[a-zA-Z0-9_-]+(\\.[a-zA-Z0-9_-]+)*$/ and corresponds to valid evidence entries.`;

  const userPrompt = `
    Document Content: ${documentContent}
    
    Analysis Task: ${analysisPrompt}
    
    Please validate the Evidence-IDs in the document and identify any issues, missing mappings, or format problems.
    Return your analysis in a structured JSON format with fields: { issues: [...] } where each issue has type, message, and severity.
  `;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Use the hash of document content as inputHash for cache key
  const inputHash = createHash('sha256').update(documentContent).digest('hex');
  
  return await callQwen(messages, { 
    response_format: { type: "json_object" } 
  }, inputHash);
}