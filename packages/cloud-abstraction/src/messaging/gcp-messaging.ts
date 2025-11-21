/**
 * GCP Pub/Sub Messaging Provider
 */

import { PubSub, Topic, Subscription, Message as PubSubMessage } from '@google-cloud/pubsub';
import { IMessagingProvider } from './index';
import {
  CloudProvider,
  Message,
  MessagePublishOptions,
  MessageReceiveOptions,
  MessagingError
} from '../types';

export class GCPMessagingProvider implements IMessagingProvider {
  readonly provider = CloudProvider.GCP;
  private pubsub: PubSub;

  constructor(projectId?: string, keyFilename?: string) {
    this.pubsub = new PubSub({
      projectId: projectId || process.env.GCP_PROJECT_ID,
      keyFilename: keyFilename || process.env.GCP_KEY_FILENAME
    });
  }

  async publish(
    queue: string,
    message: string | object,
    options?: MessagePublishOptions
  ): Promise<string> {
    try {
      const topic = this.pubsub.topic(queue);
      const data = typeof message === 'string' ? message : JSON.stringify(message);

      const messageId = await topic.publishMessage({
        data: Buffer.from(data),
        attributes: options?.attributes,
        orderingKey: options?.groupId
      });

      return messageId;
    } catch (error) {
      throw new MessagingError(
        `Failed to publish message to Pub/Sub: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async receive(
    queue: string,
    options?: MessageReceiveOptions
  ): Promise<Message[]> {
    try {
      // In Pub/Sub, we pull from a subscription, not a topic
      const subscription = this.pubsub.subscription(queue);

      const [messages] = await subscription.pull({
        maxMessages: options?.maxMessages || 10
      });

      return messages.map((msg) => ({
        id: msg.id,
        body: msg.data.toString(),
        attributes: msg.attributes as Record<string, string>,
        timestamp: msg.publishTime || new Date(),
        receiptHandle: msg.ackId
      }));
    } catch (error) {
      throw new MessagingError(
        `Failed to receive messages from Pub/Sub: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(queue: string, receiptHandle: string): Promise<void> {
    try {
      const subscription = this.pubsub.subscription(queue);
      await subscription.ack([receiptHandle]);
    } catch (error) {
      throw new MessagingError(
        `Failed to acknowledge message in Pub/Sub: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async extendVisibility(
    queue: string,
    receiptHandle: string,
    seconds: number
  ): Promise<void> {
    try {
      const subscription = this.pubsub.subscription(queue);
      await subscription.modifyAckDeadline(receiptHandle, seconds);
    } catch (error) {
      throw new MessagingError(
        `Failed to extend visibility in Pub/Sub: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async getQueueAttributes(queue: string): Promise<Record<string, any>> {
    try {
      const subscription = this.pubsub.subscription(queue);
      const [metadata] = await subscription.getMetadata();

      return {
        name: metadata.name,
        topic: metadata.topic,
        ackDeadlineSeconds: metadata.ackDeadlineSeconds,
        messageRetentionDuration: metadata.messageRetentionDuration,
        retainAckedMessages: metadata.retainAckedMessages
      };
    } catch (error) {
      throw new MessagingError(
        `Failed to get subscription attributes from Pub/Sub: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async purge(queue: string): Promise<void> {
    try {
      const subscription = this.pubsub.subscription(queue);
      await subscription.seek(new Date());
    } catch (error) {
      throw new MessagingError(
        `Failed to purge Pub/Sub subscription: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }
}
