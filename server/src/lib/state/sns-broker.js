"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnsMessageBroker = void 0;
// @ts-nocheck
const client_sns_1 = require("@aws-sdk/client-sns");
const client_sqs_1 = require("@aws-sdk/client-sqs");
/**
 * Production-ready implementation of MessageBroker using AWS SNS and SQS.
 * This architecture supports true cross-region broadcasting:
 * 1. Each region publishes to a global SNS Topic (or regional topics fan-out).
 * 2. Each region has an SQS Queue subscribed to the SNS Topic(s).
 *
 * This ensures that when Region A publishes a state change, Regions B and C receive it.
 */
class SnsMessageBroker {
    snsClient;
    sqsClient;
    topicArn;
    queueUrl;
    isPolling = false;
    constructor(region, topicArn, queueUrl) {
        this.snsClient = new client_sns_1.SNSClient({ region });
        this.sqsClient = new client_sqs_1.SQSClient({ region });
        this.topicArn = topicArn;
        this.queueUrl = queueUrl;
    }
    async publish(channel, message) {
        // We map 'channel' to message attributes or assume topic per channel.
        // Here we wrap it in a structure.
        const payload = JSON.stringify({ channel, message });
        await this.snsClient.send(new client_sns_1.PublishCommand({
            TopicArn: this.topicArn,
            Message: payload,
        }));
    }
    async subscribe(channel, callback) {
        // In this architecture, we subscribe to the Queue, which is subscribed to SNS.
        // We just filter messages by channel if necessary.
        if (this.isPolling)
            return; // Already polling
        this.isPolling = true;
        this.pollQueue(channel, callback);
    }
    async pollQueue(channel, callback) {
        while (this.isPolling) {
            try {
                const response = await this.sqsClient.send(new client_sqs_1.ReceiveMessageCommand({
                    QueueUrl: this.queueUrl,
                    MaxNumberOfMessages: 10,
                    WaitTimeSeconds: 20, // Long polling
                }));
                if (response.Messages) {
                    for (const msg of response.Messages) {
                        if (msg.Body) {
                            // Parse SNS notification structure
                            const snsMessage = JSON.parse(msg.Body); // SQS wraps SNS message
                            const payload = JSON.parse(snsMessage.Message);
                            if (payload.channel === channel) {
                                callback(payload.message);
                            }
                        }
                        // Acknowledge (Delete) message
                        await this.sqsClient.send(new client_sqs_1.DeleteMessageCommand({
                            QueueUrl: this.queueUrl,
                            ReceiptHandle: msg.ReceiptHandle,
                        }));
                    }
                }
            }
            catch (error) {
                console.error('Error polling SQS:', error);
                await new Promise((resolve) => setTimeout(resolve, 5000)); // Backoff
            }
        }
    }
    async stop() {
        this.isPolling = false;
    }
}
exports.SnsMessageBroker = SnsMessageBroker;
