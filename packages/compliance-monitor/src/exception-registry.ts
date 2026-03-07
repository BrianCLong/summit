export interface ExceptionEntry {
  id: string;
  controlId: string;
  owner: string;
  scope: string;
  compensatingControls: string[];
  expiresAt: Date;
  createdAt: Date;
  status: "active" | "expired" | "escalated";
}

export class ExceptionRegistry {
  private readonly exceptions: Map<string, ExceptionEntry> = new Map();

  add(entry: Omit<ExceptionEntry, "createdAt" | "status">): ExceptionEntry {
    const exception: ExceptionEntry = { ...entry, createdAt: new Date(), status: "active" };
    this.exceptions.set(entry.id, exception);
    return exception;
  }

  expiringWithin(days: number, now: Date = new Date()): ExceptionEntry[] {
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.exceptions.values()).filter(
      (entry) => entry.expiresAt <= threshold && entry.status === "active"
    );
  }

  refreshStatuses(now: Date = new Date()): void {
    for (const entry of this.exceptions.values()) {
      if (entry.status === "active" && entry.expiresAt <= now) {
        entry.status = "expired";
      }
    }
  }

  list(): ExceptionEntry[] {
    return Array.from(this.exceptions.values());
  }
}
