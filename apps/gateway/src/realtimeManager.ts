import Redis from "ioredis";
import { EventEmitter } from "events";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class RealtimeManager extends EventEmitter {
  private redisSubscriber: Redis;

  constructor() {
    super();
    this.setMaxListeners(0); // Allow many clients
    this.redisSubscriber = new Redis(REDIS_URL);
    this.start();
  }

  private async start() {
    try {
      await this.redisSubscriber.subscribe("realtime:fanout");
      this.redisSubscriber.on("message", (channel, message) => {
        if (channel === "realtime:fanout") {
          try {
            const event = JSON.parse(message);
            this.emit("event", event);
          } catch (e) {
            console.error("Error parsing event", e);
          }
        }
      });
    } catch (e) {
      console.error("RealtimeManager error", e);
    }
  }
}

export const realtimeManager = new RealtimeManager();
