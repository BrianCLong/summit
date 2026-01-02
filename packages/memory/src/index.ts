export interface MemoryOptions {
  ttl?: number;
}

export class MemoryStore {
  private store: Map<string, any>;
  private ttl: number;

  constructor(options: MemoryOptions = {}) {
    this.store = new Map();
    this.ttl = options.ttl || 3600;
  }

  set(key: string, value: any): void {
    // Redact sensitive info if detected (mock logic)
    const sanitizedValue = this.redact(value);
    this.store.set(key, sanitizedValue);
  }

  get(key: string): any {
    return this.store.get(key);
  }

  private redact(value: any): any {
    if (typeof value === 'string' && value.includes('password')) {
        return '[REDACTED]';
    }
    if (typeof value === 'object' && value !== null) {
        if (value.password) {
            return { ...value, password: '[REDACTED]' };
        }
    }
    return value;
  }
}
