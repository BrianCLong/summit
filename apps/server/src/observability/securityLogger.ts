import axios from "axios";

type EventName =
  | "rate_limit_block"
  | "rate_limit_redis_error"
  | "drop_validation_failed"
  | "drop_submission"
  | "vault_error"
  | "session_warning";

interface SecurityEvent {
  level?: "info" | "warn" | "error";
  message?: string;
  [key: string]: unknown;
}

const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK;

const sendToWebhook = async (payload: Record<string, unknown>) => {
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, payload, { timeout: 2000 });
  } catch (error) {
    // Avoid throwing inside logging pipeline
    console.error("Failed to send security alert", error);
  }
};

export const securityLogger = {
  logEvent(event: EventName, data: SecurityEvent = {}): void {
    const entry = {
      event,
      level: data.level || "info",
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (entry.level === "error") {
      console.error("[security]", entry);
    } else if (entry.level === "warn") {
      console.warn("[security]", entry);
    } else {
      console.info("[security]", entry);
    }

    void sendToWebhook(entry);
  },
};
