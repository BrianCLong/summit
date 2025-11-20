/**
 * MessageRouter - Advanced message routing and filtering
 *
 * Content-based routing, topic patterns, and message filtering
 */

import type { Message, MessageFilter } from '../core/types.js';

export interface RoutingRule {
  id: string;
  name: string;
  source?: string | string[];
  destination: string;
  filter?: MessageFilter;
  transform?: (message: Message) => Message;
  priority?: number;
}

export class MessageRouter {
  private rules: Map<string, RoutingRule> = new Map();

  /**
   * Add a routing rule
   */
  addRule(rule: RoutingRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a routing rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Route a message to appropriate destinations
   */
  route(message: Message): Array<{ destination: string; message: Message }> {
    const routes: Array<{ destination: string; message: Message }> = [];

    // Sort rules by priority
    const sortedRules = Array.from(this.rules.values()).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const rule of sortedRules) {
      if (this.matchesRule(message, rule)) {
        const routedMessage = rule.transform
          ? rule.transform(message)
          : message;

        routes.push({
          destination: rule.destination,
          message: routedMessage
        });
      }
    }

    return routes;
  }

  /**
   * Check if message matches routing rule
   */
  private matchesRule(message: Message, rule: RoutingRule): boolean {
    // Check source filter
    if (rule.source) {
      const sources = Array.isArray(rule.source) ? rule.source : [rule.source];
      if (!sources.includes(message.metadata.source)) {
        return false;
      }
    }

    // Check message filter
    if (rule.filter) {
      if (!this.matchesFilter(message, rule.filter)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if message matches filter criteria
   */
  private matchesFilter(message: Message, filter: MessageFilter): boolean {
    // Check headers
    if (filter.headers) {
      for (const [key, value] of Object.entries(filter.headers)) {
        const headerValue = message.metadata.headers?.[key];
        if (!headerValue) return false;

        const allowedValues = Array.isArray(value) ? value : [value];
        if (!allowedValues.includes(headerValue)) {
          return false;
        }
      }
    }

    // Check content type
    if (
      filter.contentType &&
      message.metadata.contentType &&
      !filter.contentType.includes(message.metadata.contentType)
    ) {
      return false;
    }

    // Check source
    if (
      filter.source &&
      !filter.source.includes(message.metadata.source)
    ) {
      return false;
    }

    // Custom filter function
    if (filter.custom && !filter.custom(message)) {
      return false;
    }

    return true;
  }

  /**
   * Get all routing rules
   */
  getRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }
}

/**
 * Topic pattern matching utilities
 */
export class TopicMatcher {
  /**
   * Check if topic matches pattern
   * Supports wildcards: * (single level), # (multi-level)
   */
  static matches(topic: string, pattern: string): boolean {
    // Direct match
    if (topic === pattern) return true;

    // Multi-level wildcard
    if (pattern === '#') return true;

    const topicParts = topic.split('.');
    const patternParts = pattern.split('.');

    return this.matchParts(topicParts, patternParts);
  }

  private static matchParts(
    topicParts: string[],
    patternParts: string[]
  ): boolean {
    let ti = 0;
    let pi = 0;

    while (ti < topicParts.length && pi < patternParts.length) {
      const pattern = patternParts[pi];

      if (pattern === '#') {
        // Multi-level wildcard matches rest of topic
        return true;
      }

      if (pattern === '*') {
        // Single-level wildcard
        ti++;
        pi++;
        continue;
      }

      if (topicParts[ti] !== pattern) {
        return false;
      }

      ti++;
      pi++;
    }

    // Check if we consumed all parts
    return ti === topicParts.length && pi === patternParts.length;
  }
}
