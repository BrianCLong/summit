import { describe, it, expect } from "vitest";
import { TimelineService } from "../src/services/timeline-service";
import { PostmortemService } from "../src/services/postmortem-service";

describe("Incident Automation", () => {
  it("should capture timeline events and generate a postmortem", async () => {
    const timeline = TimelineService.getInstance();
    const incidentId = "INC-123";

    timeline.addEvent(incidentId, "Database connection lost");
    timeline.addEvent(incidentId, "Failover initiated");
    timeline.addEvent(incidentId, "Service restored");

    const events = timeline.getTimeline(incidentId);
    expect(events.length).toBe(3);
    expect(events[0].message).toBe("Database connection lost");

    const report = await PostmortemService.generate(incidentId, "A database failover caused 5 minutes of downtime.");
    expect(report).toContain("# Postmortem: Incident INC-123");
    expect(report).toContain("Database connection lost");
    expect(report).toContain("Evidence Links");
  });
});
