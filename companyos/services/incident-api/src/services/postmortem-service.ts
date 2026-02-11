import { TimelineService } from "./timeline-service";
import fs from "fs/promises";
import path from "path";

export class PostmortemService {
  public static async generate(incidentId: string, summary: string): Promise<string> {
    const timeline = TimelineService.getInstance().getTimeline(incidentId);

    let report = `# Postmortem: Incident ${incidentId}\n\n`;
    report += `## Summary\n${summary}\n\n`;
    report += `## Timeline\n`;

    timeline.forEach(event => {
      report += `- [${event.timestamp}] ${event.message}\n`;
    });

    report += `\n## Evidence Links\n`;
    report += `- [Audit Log](https://logs.companyos.local/audit?correlation_id=${incidentId})\n`;

    return report;
  }
}
