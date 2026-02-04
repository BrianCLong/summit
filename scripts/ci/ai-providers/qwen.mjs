/**
 * Qwen OpenAI-compatible Client with Deterministic Caching and Security
 * Implements OpenAI-compatible interface for Qwen models via DashScope with redaction and audit trail
 */

import OpenAI from 'openai';
import { createHash } from 'node:crypto';
import cache from './cache.mjs';
import AILedger from './ledger.mjs';
import { redactText } from './redact.mjs';

// Prompt version and schema version for deterministic tracking
export const PROMPT_VERSION = 'evidence-id-analysis-v1.0';
export const SCHEMA_VERSION = 'response-schema-v1.0';

// Load prompt template with version info
const evidenceAnalysisPrompt = `You are a governance compliance expert tasked with validating Evidence-IDs in governance documents.
Ensure each Evidence-ID follows the format /^[a-zA-Z0-9_-]+(\\.[a-zA-Z0-9_-]+)*$/ and corresponds to valid evidence entries.

Analyze the provided document content and return your findings in a structured JSON format like:
{
  "issues": [
    {
      "type": "error|warning|info",
      "message": "Issue description",
      "evidence_id": "specific_id_if_applicable",
      "severity": "error|warning|info"
    }
  ]
}

Document Content: `;

// Validation functions
export function validateQwenConfig() {
  const errors = [];

  if (!process.env.DASHSCOPE_API_KEY && process.env.ENABLE_QWEN_ANALYSIS === 'true') {
    errors.push('DASHSCOPE_API_KEY environment variable is required when ENABLE_QWEN_ANALYSIS=true');
  }

  // Check for pinned model versions (reject latest in production)
  const model = process.env.QWEN_MODEL;
  if (model && (model.includes('-latest') || model.includes('latest'))) {
    // Allow latest in development but warn in CI
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      errors.push(`Qwen model "${model}" uses unstable version, use pinned snapshot (e.g., qwen-plus-2025-01-25) in CI`);
    }
  }

  if (!process.env.QWEN_BASE_URL) {
    errors.push('QWEN_BASE_URL environment variable should be set (e.g., https://dashscope-intl.aliyuncs.com/compatible-mode/v1)');
  }

  if (errors.length > 0) {
    throw new Error(`Qwen configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Enforce replay-only mode in CI
 */
export function enforceReplayMode() {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  if (isCI) {
    // In CI, replay-only mode should be enforced unless explicitly overridden
    if (!process.env.QWEN_REPLAY_ONLY || process.env.QWEN_REPLAY_ONLY === 'true') {
      // Good, we're in safe replay mode
      return true;
    } else if (process.env.ALLOW_QWEN_RECORD_IN_CI !== 'true') {
      throw new Error(
        `Qwen record mode is forbidden in CI environment. ` +
        `Either set QWEN_REPLAY_ONLY=true (default) or explicitly allow with ALLOW_QWEN_RECORD_IN_CI=true.`
      );
    } else {
      console.warn('⚠️  Qwen record mode enabled in CI - ensure this is intended!');
      return false; // Allow record mode
    }
  }

  // Outside CI, respect the setting
  return process.env.QWEN_REPLAY_ONLY === 'true';
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
export function generateCacheKey(model, messages, params, promptVersion = PROMPT_VERSION, inputHash = null) {
  // Normalize and sort messages for deterministic hashing (without exposing content)
  const normalizedMessages = messages
    .map(msg => ({ role: msg.role, content_length: msg.content.length })) // Only content length, not content
    .sort((a, b) => (a.role + String(a.content_length)).localeCompare(b.role + String(b.content_length)));

  const keyData = [
    model || '',
    JSON.stringify(normalizedMessages),
    JSON.stringify(params || {}),
    promptVersion,
    inputHash || ''
  ].join('|');

  return createHash('sha256').update(keyData).digest('hex');
}

/**
 * Call Qwen with redaction, replay enforcement, and audit trail
 */
export async function callQwen(messages, params = {}, inputHash = null, artifactDir = './artifacts') {
  validateQwenConfig();

  const enforceReplay = enforceReplayMode();
  const model = process.env.QWEN_MODEL ?? "qwen-plus-2025-01-25";
  const startTime = Date.now();

  // Apply redaction to all messages if enabled
  const redactionEnabled = process.env.AI_REDACTION !== 'off';
  let processedMessages = messages;
  let allRedactionFindings = [];

  if (redactionEnabled) {
    processedMessages = messages.map(msg => {
      const redactionResult = redactText(msg.content, { mode: 'balanced' });
      allRedactionFindings.push(...redactionResult.findings);
      return {
        ...msg,
        content: redactionResult.redacted
      };
    });
  }

  // Prepare parameters for determinism
  const requestParams = {
    model,
    messages: processedMessages,
    temperature: 0, // Deterministic setting
    ...params // Allow overrides but keep temperature=0 as default
  };

  // Remove top_p if temperature is 0 (avoid conflicts)
  if (requestParams.temperature === 0 && requestParams.top_p) {
    delete requestParams.top_p;
  }

  // Generate cache key for deterministic replay (using redacted content)
  const cacheKey = generateCacheKey(model, processedMessages, requestParams, PROMPT_VERSION, inputHash);

  // Check cache for replay mode
  let cachedResponse = null;
  let cacheHit = false;
  try {
    cachedResponse = await cache.get(cacheKey);
    if (cachedResponse) {
      cacheHit = true;
      console.debug(`[QWEN CACHE] Using cached response for key: ${cacheKey.substring(0, 12)}...`);
    }
  } catch (cacheErr) {
    console.warn(`[QWEN CACHE] Warning: Cache error: ${cacheErr.message}`);
    // Continue without cache
  }

  if (cachedResponse && cacheHit) {
    // Record in ledger and return cached response
    const ledger = new AILedger(artifactDir);
    ledger.addEntry({
      cacheKey,
      model,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      redactionFindings: allRedactionFindings,
      cacheHit: true,
      elapsedMs: Date.now() - startTime,
      inputHash
    });
    await ledger.write();

    return cachedResponse;
  }

  // If we're in replay-only mode and no cache hit, handle appropriately
  if (enforceReplay) {
    if (!cachedResponse) {
      const errorResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              issues: [{
                type: 'replay_missing',
                message: `No cached response found for key: ${cacheKey.substring(0, 12)}...`,
                severity: 'info',
                details: { cache_key: cacheKey, mode: 'replay_only' }
              }]
            })
          }
        }],
        usage: null,
        model: model,
        created: startTime,
        object: 'chat.completion'
      };

      // Still log to ledger that replay was attempted but cache miss occurred
      const ledger = new AILedger(artifactDir);
      ledger.addEntry({
        cacheKey,
        model,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        redactionFindings: allRedactionFindings,
        cacheHit: false, // This is a "miss" in terms of replay
        elapsedMs: Date.now() - startTime,
        inputHash
      });
      await ledger.write();

      return errorResponse;
    }
  }

  // Proceed with live API call
  console.debug(`[QWEN] Calling API for model: ${model}, cache key: ${cacheKey.substring(0, 12)}...`);
  const client = makeQwenClient();
  const response = await client.chat.completions.create(requestParams);

  // Cache response if recording
  if (process.env.QWEN_RECORD !== 'false' && !enforceReplay) {
    try {
      await cache.put(cacheKey, response);
    } catch (cacheErr) {
      console.warn(`[QWEN CACHE] Warning: Failed to cache response: ${cacheErr.message}`);
    }
  }

  // Record in audit ledger
  const ledger = new AILedger(artifactDir);
  ledger.addEntry({
    cacheKey,
    model,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    redactionFindings: allRedactionFindings,
    cacheHit: false, // This was a live call
    elapsedMs: Date.now() - startTime,
    inputHash
  });
  await ledger.write();

  return response;
}

// Specific function for evidence analysis
export async function analyzeDocumentWithQwen(documentContent, analysisPrompt, params = {}, inputHash = null, artifactDir = './artifacts') {
  // Apply redaction to document content before sending to AI
  const redactionEnabled = process.env.AI_REDACTION !== 'off';
  let safeDocumentContent = documentContent;
  let redactionFindings = [];

  if (redactionEnabled) {
    const redactionResult = redactText(documentContent, { mode: 'balanced' });
    safeDocumentContent = redactionResult.redacted;
    redactionFindings = redactionResult.findings;
  }

  const systemPrompt = `You are a governance compliance expert tasked with validating Evidence-IDs in governance documents.
  Ensure each Evidence-ID follows the format /^[a-zA-Z0-9_-]+(\\.[a-zA-Z0-9_-]+)*$/ and corresponds to valid evidence entries.`;

  const userPrompt = `
    Document Content: ${safeDocumentContent}

    Analysis Task: ${analysisPrompt}

    Please validate the Evidence-IDs in the document and identify any issues, missing mappings, or format problems.
    Return your analysis in a structured JSON format with fields: { issues: [...] } where each issue has type, message, and severity.
  `;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Use provided input hash or generate from document content
  const contentHash = inputHash || createHash('sha256').update(documentContent).digest('hex');

  // Merge default parameters with provided ones
  const mergedParams = {
    temperature: 0, // Default to deterministic setting
    response_format: { type: "json_object" },
    ...params
  };

  return await callQwen(messages, mergedParams, contentHash, artifactDir);
}