import { addDays, isAfter, isBefore } from "date-fns";
import { RenewalEvent } from "./types";

export class RenewalCalendar {
  private events: RenewalEvent[] = [];

  addEvent(event: RenewalEvent): void {
    this.events.push(event);
  }

  dueWithin(days: number, reference: Date = new Date()): RenewalEvent[] {
    const deadline = addDays(reference, days);
    return this.events.filter((event) => isBefore(event.noticeDate, deadline));
  }

  negotiationWindows(reference: Date = new Date()): RenewalEvent[] {
    return this.events.filter(
      (event) =>
        isAfter(reference, event.negotiationWindowStart) && isBefore(reference, event.renewalDate)
    );
  }
}
