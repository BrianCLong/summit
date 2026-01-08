import { describe, expect, it, vi } from "vitest";
import { StructuredEventEmitter } from "@ga-graphai/common-types";
import {
  KafkaGraphUpdateStream,
  type KafkaLikeConsumer,
  type KafkaLikeEachMessagePayload,
  OrchestrationKnowledgeGraph,
} from "../src/index.js";

class MockConsumer implements KafkaLikeConsumer {
  handler?: (payload: KafkaLikeEachMessagePayload) => Promise<void>;

  topic?: string;

  async subscribe(config: { topic: string }): Promise<void> {
    this.topic = config.topic;
  }

  async run(config: {
    eachMessage: (payload: KafkaLikeEachMessagePayload) => Promise<void>;
  }): Promise<void> {
    this.handler = config.eachMessage;
  }

  async emit(message: KafkaLikeEachMessagePayload): Promise<void> {
    await this.handler?.(message);
  }

  async disconnect(): Promise<void> {
    // no-op for mock
  }
}

describe("KafkaGraphUpdateStream", () => {
  it("consumes kafka-compatible payloads to update the graph and trigger agents", async () => {
    const transport = vi.fn();
    const emitter = new StructuredEventEmitter({ transport });
    const graph = new OrchestrationKnowledgeGraph(emitter);
    const consumer = new MockConsumer();

    const stream = new KafkaGraphUpdateStream(consumer, (update) => graph.applyUpdate(update), {
      topic: "kg-updates",
      source: "event-hubs",
    });

    await stream.start();

    await consumer.emit({
      topic: consumer.topic ?? "kg-updates",
      partition: 0,
      message: {
        value: Buffer.from(
          JSON.stringify({
            services: [{ id: "svc-stream", name: "Stream Service" }],
            environments: [
              { id: "env-stream", name: "streaming", stage: "prod", region: "us-west-2" },
            ],
            incidents: [
              {
                id: "stream-incident",
                serviceId: "svc-stream",
                environmentId: "env-stream",
                severity: "high",
                occurredAt: new Date("2024-04-01T00:00:00Z").toISOString(),
                status: "open",
              },
            ],
            agentTriggers: [
              {
                agent: "stream-responder",
                reason: "incident from event hub",
              },
            ],
          })
        ),
      },
    });

    const context = graph.queryService("svc-stream");

    expect(context?.incidents?.[0]?.id).toBe("stream-incident");
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ name: "summit.intelgraph.graph.updated" })
    );

    await stream.stop();
  });
});
