import type { GraphSnapshot, GraphUpdate, StructuredLogger } from "./index.js";

export interface KafkaLikeMessage {
  key?: Buffer | string | null;
  value?: Buffer | string | null;
  headers?: Record<string, string | undefined>;
  timestamp?: string;
  offset?: string;
}

export interface KafkaLikeEachMessagePayload {
  topic: string;
  partition?: number;
  message: KafkaLikeMessage;
}

export interface KafkaLikeConsumer {
  connect?(): Promise<void>;
  subscribe(config: { topic: string; fromBeginning?: boolean }): Promise<void>;
  run(config: {
    eachMessage: (payload: KafkaLikeEachMessagePayload) => Promise<void>;
  }): Promise<void>;
  stop?(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface KafkaStreamConfig {
  topic: string;
  source: string;
  ingress?: string;
  fromBeginning?: boolean;
  parseUpdate?: (payload: KafkaLikeEachMessagePayload) => GraphUpdate | Promise<GraphUpdate>;
  onApplied?: (snapshot: GraphSnapshot) => void | Promise<void>;
  logger?: StructuredLogger;
}

function toUtf8(value?: Buffer | string | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Buffer) {
    return value.toString("utf8");
  }
  return String(value);
}

export class KafkaGraphUpdateStream {
  private readonly consumer: KafkaLikeConsumer;

  private readonly config: KafkaStreamConfig;

  private readonly applyUpdate: (update: GraphUpdate) => GraphSnapshot;

  constructor(
    consumer: KafkaLikeConsumer,
    applyUpdate: (update: GraphUpdate) => GraphSnapshot,
    config: KafkaStreamConfig
  ) {
    this.consumer = consumer;
    this.config = config;
    this.applyUpdate = applyUpdate;
  }

  async start(): Promise<void> {
    if (this.consumer.connect) {
      await this.consumer.connect();
    }
    await this.consumer.subscribe({
      topic: this.config.topic,
      fromBeginning: this.config.fromBeginning ?? false,
    });
    await this.consumer.run({
      eachMessage: async (payload) => {
        try {
          const update = await this.parseUpdate(payload);
          const snapshot = this.applyUpdate({
            source: this.config.source,
            ingress: this.config.ingress ?? "message-broker",
            topic: payload.topic,
            ...update,
          });
          await this.config.onApplied?.(snapshot);
        } catch (error) {
          this.config.logger?.error?.("intelgraph.kg.stream.error", {
            topic: payload.topic,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });
  }

  async stop(): Promise<void> {
    if (this.consumer.stop) {
      await this.consumer.stop();
    }
    await this.consumer.disconnect();
  }

  private async parseUpdate(payload: KafkaLikeEachMessagePayload): Promise<GraphUpdate> {
    if (this.config.parseUpdate) {
      return this.config.parseUpdate(payload);
    }

    const body = toUtf8(payload.message.value);
    const parsed = body ? (JSON.parse(body) as GraphUpdate) : {};
    if (!parsed.source) {
      parsed.source = this.config.source;
    }
    if (!parsed.ingress) {
      parsed.ingress = this.config.ingress ?? "message-broker";
    }
    if (!parsed.topic) {
      parsed.topic = payload.topic;
    }
    if (!parsed.correlationId) {
      const candidateHeader = payload.message.headers?.["correlation-id"];
      if (candidateHeader) {
        parsed.correlationId = candidateHeader;
      }
    }
    return parsed;
  }
}
