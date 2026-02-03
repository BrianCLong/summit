/**
 * Content-Addressed Cache for AI-Generated Responses
 * Implements deterministic caching for LLM responses to ensure reproducible builds
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';

class AIResponseCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || './.qwen-cache';
    this.enabled = options.enabled !== false; // Enabled by default
    this._memoryCache = new Map(); // Memory cache for quick access
  }

  /**
   * Generate deterministic cache key from request parameters
   * The key is based only on static parameters, not runtime values
   */
  generateKey(model, messages, params, inputHash = null, promptVersion = '1.0') {
    // Normalize messages to ensure deterministic order
    const normalizedMessages = messages
      .map(msg => ({ role: msg.role, content: msg.content }))
      .sort((a, b) => (a.role + a.content).localeCompare(b.role + b.content));

    const keyData = [
      model || '',
      JSON.stringify(normalizedMessages),  // Normalized and sorted
      JSON.stringify(params || {}),        // Normalized parameters
      inputHash || '',                     // Hash of input content if provided
      promptVersion                        // Version of prompt template
    ].join('||');

    return createHash('sha256')
      .update(keyData, 'utf8')
      .digest('hex');
  }

  /**
   * Get cached response if available
   */
  async get(key) {
    if (!this.enabled) return null;

    // Check memory cache first
    if (this._memoryCache.has(key)) {
      return this._memoryCache.get(key);
    }

    // Check file cache
    try {
      const cachePath = this._getCacheFilePath(key);
      const content = await fs.readFile(cachePath, 'utf8');
      const response = JSON.parse(content);

      // Cache in memory for subsequent access
      this._memoryCache.set(key, response);
      return response;
    } catch (error) {
      // File doesn't exist or can't parse - return null
      return null;
    }
  }

  /**
   * Put response in cache
   */
  async put(key, response) {
    if (!this.enabled) return;

    // Store in memory cache
    this._memoryCache.set(key, response);

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      const cachePath = this._getCacheFilePath(key);
      await fs.writeFile(cachePath, JSON.stringify(response, null, 2), 'utf8');
    } catch (error) {
      console.warn(`[CACHE] Warning: Failed to write cache entry: ${error.message}`);
    }
  }

  /**
   * Check if cache has entry without retrieving it
   */
  async has(key) {
    if (!this.enabled) return false;

    if (this._memoryCache.has(key)) {
      return true;
    }

    try {
      const cachePath = this._getCacheFilePath(key);
      await fs.access(cachePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache file path for a given key
   */
  _getCacheFilePath(key) {
    // Use subdirectories to avoid filesystem issues with too many files in one dir
    const subDir = key.substring(0, 2); // First 2 hex chars for subdirectory
    return join(this.cacheDir, subDir, `${key}.json`);
  }

  /**
   * Clear all cache entries (for testing)
   */
  async clear() {
    this._memoryCache.clear();
    try {
      // In a real implementation we would clear the file cache too
      // This requires recursive deletion which we'll skip for safety
    } catch (error) {
      console.warn(`[CACHE] Warning: Failed to clear file cache: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: this._memoryCache.size,
      enabled: this.enabled
    };
  }
}

// Singleton instance
const cache = new AIResponseCache({
  cacheDir: process.env.QWEN_CACHE_DIR || './.qwen-cache',
  enabled: process.env.QWEN_CACHE_ENABLED !== 'false' // Enable by default unless explicitly disabled
});

export default cache;