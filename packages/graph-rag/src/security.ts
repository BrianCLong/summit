import { Node } from './types.js';

export class RetrievalSanitizer {
  // Simple patterns for prompt injection/jailbreak attempts
  private static INJECTION_PATTERNS = [
    /<script>/gi,
    /ignore previous instructions/gi,
    /system prompt:/gi,
    /you are a chat bot/gi
  ];

  /**
   * Sanitizes text content to remove potential injection vectors.
   */
  static sanitize(text: string): string {
    let cleanText = text;
    for (const pattern of this.INJECTION_PATTERNS) {
      cleanText = cleanText.replace(pattern, '[REDACTED]');
    }
    return cleanText;
  }

  /**
   * Validates if a node is trusted enough to be included in the context.
   * By default, rejects 'untrusted' nodes unless explicit overrides exist.
   */
  static validateTrust(node: Node): boolean {
    if (node.trust_level === 'untrusted') {
      return false;
    }
    // Default to safe if undefined, or assume 'trusted'/'verified' are good.
    return true;
  }
}
