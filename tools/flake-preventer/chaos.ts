import { randomBytes, randomUUID } from 'crypto';

export class ChaosGenerator {
  private mutationRate: number;

  constructor(mutationRate: number = 0.1) {
    this.mutationRate = mutationRate;
  }

  private shouldMutate(): boolean {
    return Math.random() < this.mutationRate;
  }

  randomString(length: number = 10): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * Generates a timestamp that might be in the future, far past, or invalid string.
   */
  irregularTimestamp(): string | number {
    const rand = Math.random();
    if (rand < 0.3) {
      // Future
      return new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
    } else if (rand < 0.6) {
      // Far past
      return new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 10).toISOString();
    } else if (rand < 0.8) {
      // Unix timestamp (number) instead of string
      return Date.now();
    } else {
      // Invalid date string
      return "2025-13-45T99:99:99Z";
    }
  }

  /**
   * Takes an object and returns a "partial" version (missing keys).
   */
  partialShape<T extends object>(obj: T): Partial<T> {
    const newObj: any = { ...obj };
    const keys = Object.keys(newObj);
    if (keys.length === 0) return newObj;

    // Remove 1 to N keys
    const numToRemove = Math.floor(Math.random() * keys.length) + 1;
    for (let i = 0; i < numToRemove; i++) {
      const keyToRemove = keys[Math.floor(Math.random() * keys.length)];
      delete newObj[keyToRemove];
    }
    return newObj;
  }

  /**
   * Deeply malforms an object by changing types, removing fields, or injecting garbage.
   */
  malformInput(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      if (this.shouldMutate()) {
        const types = ['string', 'number', 'boolean', 'null', 'undefined'];
        const targetType = types[Math.floor(Math.random() * types.length)];
        switch (targetType) {
          case 'string': return this.randomString();
          case 'number': return Math.random() * 1000;
          case 'boolean': return Math.random() > 0.5;
          case 'null': return null;
          case 'undefined': return undefined;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
        if (this.shouldMutate()) {
            // Truncate
            return obj.slice(0, Math.floor(obj.length / 2));
        }
        return obj.map(item => this.malformInput(item));
    }

    const newObj: any = { ...obj };
    for (const key of Object.keys(newObj)) {
      if (this.shouldMutate()) {
        const action = Math.floor(Math.random() * 3);
        switch (action) {
            case 0: // Delete
                delete newObj[key];
                break;
            case 1: // Change type
                newObj[key] = this.malformInput(null); // Generates primitive
                break;
            case 2: // Recurse
                newObj[key] = this.malformInput(newObj[key]);
                break;
        }
      } else {
          // Deep recurse without forced mutation (but mutation might happen deeper)
          newObj[key] = this.malformInput(newObj[key]);
      }
    }
    return newObj;
  }

  /**
   * Generates near-duplicate entities.
   */
  nearDuplicate(entity: any): any {
    const dup = JSON.parse(JSON.stringify(entity));
    // Modify one field slightly
    const keys = Object.keys(dup);
    if (keys.length > 0) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        if (typeof dup[key] === 'string') {
            dup[key] += '_dup';
        } else if (typeof dup[key] === 'number') {
            dup[key] += 1;
        }
    }
    return dup;
  }
}
