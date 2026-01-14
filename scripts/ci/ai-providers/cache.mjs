/**
 * Content-Addressed Cache for LLM Responses
 * Implements deterministic caching to ensure reproducible outputs
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

class AIResponseCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || './.qwen-cache';
    this.enabled = options.enabled ?? true;
    this._cache = new Map();
    this._loaded = false;
  }

  // Generate deterministic cache key from request parameters
  generateKey(model, messages, params, inputHash = null) {
    // Normalize messages to ensure deterministic order
    const normalizedMessages = messages
      .map(msg => ({ role: msg.role, content: msg.content }))
      .sort((a, b) => (a.role + a.content).localeCompare(b.role + b.content));

    const keyData = [
      model,
      JSON.stringify(normalizedMessages),
      JSON.stringify(this._normalizeParams(params)),
      inputHash || ''
    ].join('||');

    return createHash('sha256')
      .update(keyData, 'utf8')
      .digest('hex');
  }

  _normalizeParams(params) {
    // Create a normalized parameter object
    const normalized = {};
    const keys = Object.keys(params).sort();
    
    for (const key of keys) {
      if (typeof params[key] === 'object' && params[key] !== null) {
        normalized[key] = this._normalizeParams(params[key]);
      } else {
        normalized[key] = params[key];
      }
    }
    
    return normalized;
  }

  async load() {
    if (!this.enabled) return;
    
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const cachePath = resolve(this.cacheDir, 'responses.json');
      if (await this._fileExists(cachePath)) {
        const data = await fs.readFile(cachePath, 'utf8');
        const cacheData = JSON.parse(data);
        
        // Convert plain object back to Map
        this._cache = new Map();
        for (const [key, value] of Object.entries(cacheData)) {
          this._cache.set(key, value);
        }
      }
      this._loaded = true;
    } catch (error) {
      console.warn(`Failed to load cache from ${this.cacheDir}: ${error.message}`);
      this._cache = new Map(); // Initialize empty cache
    }
  }

  async save() {
    if (!this.enabled) return;
    
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const cachePath = resolve(this.cacheDir, 'responses.json');
      const cacheObj = Object.fromEntries(this._cache);
      await fs.writeFile(cachePath, JSON.stringify(cacheObj, null, 2));
    } catch (error) {
      console.error(`Failed to save cache to ${this.cacheDir}: ${error.message}`);
    }
  }

  async _fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async get(key) {
    if (!this.enabled) return null;
    
    if (!this._loaded) {
      await this.load();
    }
    
    return this._cache.get(key);
  }

  async put(key, value) {
    if (!this.enabled) return;
    
    if (!this._loaded) {
      await this.load();
    }
    
    this._cache.set(key, value);
    await this.save();
  }

  async has(key) {
    if (!this.enabled) return false;
    
    if (!this._loaded) {
      await this.load();
    }
    
    return this._cache.has(key);
  }

  // Clear cache (for testing)
  async clear() {
    this._cache.clear();
    await this.save();
  }
}

// Singleton instance
const cacheInstance = new AIResponseCache({
  cacheDir: process.env.QWEN_CACHE_DIR || './.qwen-cache',
  enabled: process.env.QWEN_CACHE_ENABLED !== 'false'
});

export default cacheInstance;