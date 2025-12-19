// Simple in-memory LRU implementation since lru-cache package is unavailable
import { LLMResponse } from './types.js';
import crypto from 'crypto';

class SimpleLRU<K, V> {
  private cache: Map<K, V>;
  private max: number;
  private ttl: number;
  private timestamps: Map<K, number>;

  constructor(options: { max: number; ttl: number }) {
    this.cache = new Map();
    this.timestamps = new Map();
    this.max = options.max;
    this.ttl = options.ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      const timestamp = this.timestamps.get(key);
      if (timestamp && Date.now() - timestamp > this.ttl) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        return undefined;
      }
      // Refresh
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
        this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) { // Check to ensure firstKey is not undefined
          this.cache.delete(firstKey);
          this.timestamps.delete(firstKey);
        }
    }
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }
}

export class LLMCache {
  private cache: SimpleLRU<string, LLMResponse>;

  constructor(ttlMs: number = 1000 * 60 * 60) { // 1 hour default
    this.cache = new SimpleLRU({
      max: 1000,
      ttl: ttlMs,
    });
  }

  get(key: string): LLMResponse | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: LLMResponse): void {
    // Clone to mark as cached
    const cachedValue = { ...value, cached: true };
    this.cache.set(key, cachedValue);
  }

  generateKey(request: any): string {
    const relevant = {
      tenantId: request.tenantId,
      taskType: request.taskType,
      modelClass: request.modelClass,
      sensitivity: request.sensitivity,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      tools: request.tools
    };
    return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
  }
}
