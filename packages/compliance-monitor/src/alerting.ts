import { EventEmitter } from "events";

export type AlertType = "failure" | "stale-evidence" | "exception-expiring";

export interface AlertPayload {
  controlId: string;
  type: AlertType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class AlertBroker {
  private readonly emitter = new EventEmitter();

  publish(alert: AlertPayload): void {
    this.emitter.emit("alert", alert);
  }

  subscribe(handler: (alert: AlertPayload) => void): () => void {
    this.emitter.on("alert", handler);
    return () => this.emitter.off("alert", handler);
  }
}
