/**
 * Cloud-agnostic messaging interface
 */

import {
  CloudProvider,
  Message,
  MessagePublishOptions,
  MessageReceiveOptions,
  MessagingError
} from '../types';

export interface IMessagingProvider {
  readonly provider: CloudProvider;

  /**
   * Publish a message to a queue/topic
   */
  publish(
    queue: string,
    message: string | object,
    options?: MessagePublishOptions
  ): Promise<string>;

  /**
   * Receive messages from a queue
   */
  receive(
    queue: string,
    options?: MessageReceiveOptions
  ): Promise<Message[]>;

  /**
   * Delete/acknowledge a message
   */
  delete(queue: string, receiptHandle: string): Promise<void>;

  /**
   * Extend message visibility timeout
   */
  extendVisibility(
    queue: string,
    receiptHandle: string,
    seconds: number
  ): Promise<void>;

  /**
   * Get queue attributes (message count, etc.)
   */
  getQueueAttributes(queue: string): Promise<Record<string, any>>;

  /**
   * Purge all messages from queue
   */
  purge(queue: string): Promise<void>;
}

export { AWSMessagingProvider } from './aws-messaging';
export { AzureMessagingProvider } from './azure-messaging';
export { GCPMessagingProvider } from './gcp-messaging';
