/**
 * AWS SQS Messaging Provider
 */

import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  GetQueueAttributesCommand,
  PurgeQueueCommand
} from '@aws-sdk/client-sqs';
import { IMessagingProvider } from './index';
import {
  CloudProvider,
  Message,
  MessagePublishOptions,
  MessageReceiveOptions,
  MessagingError
} from '../types';

export class AWSMessagingProvider implements IMessagingProvider {
  readonly provider = CloudProvider.AWS;
  private client: SQSClient;
  private queueUrls: Map<string, string> = new Map();

  constructor(region?: string) {
    this.client = new SQSClient({
      region: region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  async publish(
    queue: string,
    message: string | object,
    options?: MessagePublishOptions
  ): Promise<string> {
    try {
      const queueUrl = await this.getQueueUrl(queue);
      const body = typeof message === 'string' ? message : JSON.stringify(message);

      const response = await this.client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: body,
          DelaySeconds: options?.delay,
          MessageDeduplicationId: options?.deduplicationId,
          MessageGroupId: options?.groupId,
          MessageAttributes: options?.attributes
            ? Object.fromEntries(
                Object.entries(options.attributes).map(([key, value]) => [
                  key,
                  { DataType: 'String', StringValue: value }
                ])
              )
            : undefined
        })
      );

      return response.MessageId!;
    } catch (error) {
      throw new MessagingError(
        `Failed to publish message to SQS: ${queue}`,
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
      const queueUrl = await this.getQueueUrl(queue);

      const response = await this.client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: options?.maxMessages || 10,
          VisibilityTimeout: options?.visibilityTimeout || 30,
          WaitTimeSeconds: options?.waitTimeSeconds || 20,
          MessageAttributeNames: ['All'],
          AttributeNames: ['All']
        })
      );

      return (response.Messages || []).map((msg) => ({
        id: msg.MessageId!,
        body: msg.Body!,
        attributes: msg.MessageAttributes
          ? Object.fromEntries(
              Object.entries(msg.MessageAttributes).map(([key, value]) => [
                key,
                value.StringValue || ''
              ])
            )
          : undefined,
        timestamp: new Date(parseInt(msg.Attributes?.SentTimestamp || '0')),
        receiptHandle: msg.ReceiptHandle
      }));
    } catch (error) {
      throw new MessagingError(
        `Failed to receive messages from SQS: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(queue: string, receiptHandle: string): Promise<void> {
    try {
      const queueUrl = await this.getQueueUrl(queue);

      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receiptHandle
        })
      );
    } catch (error) {
      throw new MessagingError(
        `Failed to delete message from SQS: ${queue}`,
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
      const queueUrl = await this.getQueueUrl(queue);

      await this.client.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receiptHandle,
          VisibilityTimeout: seconds
        })
      );
    } catch (error) {
      throw new MessagingError(
        `Failed to extend visibility in SQS: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async getQueueAttributes(queue: string): Promise<Record<string, any>> {
    try {
      const queueUrl = await this.getQueueUrl(queue);

      const response = await this.client.send(
        new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: ['All']
        })
      );

      return response.Attributes || {};
    } catch (error) {
      throw new MessagingError(
        `Failed to get queue attributes from SQS: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  async purge(queue: string): Promise<void> {
    try {
      const queueUrl = await this.getQueueUrl(queue);

      await this.client.send(
        new PurgeQueueCommand({
          QueueUrl: queueUrl
        })
      );
    } catch (error) {
      throw new MessagingError(
        `Failed to purge SQS queue: ${queue}`,
        this.provider,
        error as Error
      );
    }
  }

  private async getQueueUrl(queue: string): Promise<string> {
    if (this.queueUrls.has(queue)) {
      return this.queueUrls.get(queue)!;
    }

    // Assume queue name is the URL or construct it
    const queueUrl = queue.startsWith('https://')
      ? queue
      : `https://sqs.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${queue}`;

    this.queueUrls.set(queue, queueUrl);
    return queueUrl;
  }
}
