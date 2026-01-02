// @ts-nocheck
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { MessageBroker } from './cross-region-sync.js';

/**
 * Production-ready implementation of MessageBroker using AWS SNS and SQS.
 * This architecture supports true cross-region broadcasting:
 * 1. Each region publishes to a global SNS Topic (or regional topics fan-out).
 * 2. Each region has an SQS Queue subscribed to the SNS Topic(s).
 *
 * This ensures that when Region A publishes a state change, Regions B and C receive it.
 */
export class SnsMessageBroker implements MessageBroker {
  private snsClient: SNSClient;
  private sqsClient: SQSClient;
  private topicArn: string;
  private queueUrl: string;
  private isPolling: boolean = false;

  constructor(region: string, topicArn: string, queueUrl: string) {
    this.snsClient = new SNSClient({ region });
    this.sqsClient = new SQSClient({ region });
    this.topicArn = topicArn;
    this.queueUrl = queueUrl;
  }

  async publish(channel: string, message: string): Promise<void> {
    // We map 'channel' to message attributes or assume topic per channel.
    // Here we wrap it in a structure.
    const payload = JSON.stringify({ channel, message });

    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: payload,
      }),
    );
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    // In this architecture, we subscribe to the Queue, which is subscribed to SNS.
    // We just filter messages by channel if necessary.

    if (this.isPolling) return; // Already polling
    this.isPolling = true;

    this.pollQueue(channel, callback);
  }

  private async pollQueue(channel: string, callback: (message: string) => void) {
    while (this.isPolling) {
      try {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20, // Long polling
          }),
        );

        if (response.Messages) {
          for (const msg of response.Messages) {
            if (msg.Body) {
              // Parse SNS notification structure
              const snsMessage = JSON.parse(msg.Body) as { Message: string }; // SQS wraps SNS message
              const payload = JSON.parse(snsMessage.Message) as {
                channel: string;
                message: string;
              };

              if (payload.channel === channel) {
                callback(payload.message);
              }
            }

            // Acknowledge (Delete) message
            await this.sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: msg.ReceiptHandle,
              }),
            );
          }
        }
      } catch (error: any) {
        console.error('Error polling SQS:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Backoff
      }
    }
  }

  async stop() {
    this.isPolling = false;
  }
}
