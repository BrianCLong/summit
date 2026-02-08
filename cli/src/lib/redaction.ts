/**
 * Switchboard Redaction Helper
 */

export class Redactor {
  private sensitivePatterns: Set<string> = new Set();

  /**
   * Register a sensitive value to be redacted.
   */
  register(value: string): void {
    if (value && value.length > 3) {
      this.sensitivePatterns.add(value);
    }
  }

  /**
   * Redact sensitive patterns from a string.
   */
  redact(text: string): string {
    if (!text || this.sensitivePatterns.size === 0) {
      return text;
    }

    let redacted = text;
    for (const pattern of this.sensitivePatterns) {
      // Escape special regex characters
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      redacted = redacted.replace(regex, '[REDACTED]');
    }
    return redacted;
  }

  /**
   * Recursively redact sensitive patterns from an object.
   */
  redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redact(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const redactedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        redactedObj[key] = this.redactObject(value);
      }
      return redactedObj as unknown as T;
    }

    return obj;
  }
}
