import { appendFile, readFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { AuditEvent, AuditEventSchema } from "./types";
import { signEvent } from "./signer";
import { createLogger } from "../utils/logger";

const logger = createLogger("AuditBus");
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || "./logs/audit";
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, "audit.log");

export class AuditBus {
  private static instance: AuditBus;

  private constructor() {}

  public static getInstance(): AuditBus {
    if (!AuditBus.instance) {
      AuditBus.instance = new AuditBus();
    }
    return AuditBus.instance;
  }

  public async publish(eventData: Omit<AuditEvent, "id" | "timestamp" | "signature">): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...eventData,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const signedEvent = signEvent(event);

    // Validate before saving
    AuditEventSchema.parse(signedEvent);

    await this.ensureDirectory();
    await appendFile(AUDIT_LOG_FILE, JSON.stringify(signedEvent) + "\n");

    logger.info("Audit event published", { eventId: signedEvent.id, type: signedEvent.type });
    return signedEvent;
  }

  public async query(tenantId: string, filter?: { type?: string }): Promise<AuditEvent[]> {
    try {
      const content = await readFile(AUDIT_LOG_FILE, "utf8");
      if (!content.trim()) return [];
      const lines = content.trim().split("\n");
      const events: AuditEvent[] = lines
        .map(line => JSON.parse(line))
        .filter((event: AuditEvent) => event.tenant_id === tenantId);

      if (filter?.type) {
        return events.filter(e => e.type === filter.type);
      }
      return events;
    } catch (error) {
      if ((error as any).code === "ENOENT") return [];
      throw error;
    }
  }

  private async ensureDirectory() {
    await mkdir(AUDIT_LOG_DIR, { recursive: true });
  }
}
