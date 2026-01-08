import { isAfter } from "date-fns";
import { ExceptionEntry } from "./types";

export class ExceptionRegistry {
  private exceptions: Map<string, ExceptionEntry> = new Map();

  register(entry: ExceptionEntry): void {
    this.exceptions.set(entry.id, entry);
  }

  isValid(exceptionId: string, at: Date = new Date()): boolean {
    const entry = this.exceptions.get(exceptionId);
    if (!entry) {
      return false;
    }
    return isAfter(entry.expiresAt, at);
  }

  expiringWithin(days: number, at: Date = new Date()): ExceptionEntry[] {
    const deadline = new Date(at.getTime() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.exceptions.values()).filter((entry) => entry.expiresAt <= deadline);
  }
}
