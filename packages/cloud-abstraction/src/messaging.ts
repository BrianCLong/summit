/**
 * Cloud-agnostic message queue interface
 *
 * Placeholder for future implementation of SQS, Service Bus, Pub/Sub abstractions
 */

import {
  CloudProvider,
  Message,
  MessagePublishOptions,
  MessageReceiveOptions,
  MessagingError
} from './types.js';

export interface IMessagingProvider {
  readonly provider: CloudProvider;

  /**
   * Publish message to queue/topic
   */
  publish(
    queueOrTopic: string,
    message: string | object,
    options?: MessagePublishOptions
  ): Promise<string>;

  /**
   * Receive messages from queue
   */
  receive(
    queue: string,
    options?: MessageReceiveOptions
  ): Promise<Message[]>;

  /**
   * Delete message from queue
   */
  deleteMessage(queue: string, receiptHandle: string): Promise<void>;

  /**
   * Create queue or topic
   */
  createQueue(name: string, attributes?: Record<string, any>): Promise<string>;

  /**
   * Delete queue or topic
   */
  deleteQueue(name: string): Promise<void>;

  /**
   * Get queue attributes
   */
  getQueueAttributes(queue: string): Promise<Record<string, any>>;

  /**
   * Set queue attributes
   */
  setQueueAttributes(
    queue: string,
    attributes: Record<string, any>
  ): Promise<void>;
}

// Re-export types for convenience
export type { Message, MessagePublishOptions, MessageReceiveOptions, MessagingError };
