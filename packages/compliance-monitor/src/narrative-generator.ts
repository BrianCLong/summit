import { ControlDefinition } from "./control-registry.js";
import { EvidenceRecord } from "./evidence-store.js";

export class NarrativeGenerator {
  build(control: ControlDefinition, evidence?: EvidenceRecord): string {
    const lines = [
      `# ${control.title}`,
      "",
      `**Objective:** ${control.objective}`,
      `**Owner:** ${control.owner.primary}${control.owner.team ? ` (${control.owner.team})` : ""}`,
      `**Category:** ${control.category}`,
      `**Check Type:** ${control.check.type}`,
      `**Schedule:** Every ${control.schedule.frequencyMinutes} minutes (tolerance ${control.schedule.toleranceMinutes}m)`,
      `**Tags:** ${control.tags.join(", ") || "none"}`,
      "",
      "## How it works",
      control.narrative ||
        "Control executes according to registry definition with evidence captured to the immutable store.",
      "",
      "## Evidence",
    ];

    if (evidence) {
      const expiry = new Date(evidence.createdAt);
      expiry.setDate(expiry.getDate() + evidence.ttlDays);
      lines.push(
        `- Latest evidence: ${evidence.artifactPath} (hash: ${evidence.hash})`,
        `- Captured: ${evidence.createdAt.toISOString()}`,
        `- Expires: ${expiry.toISOString()}`
      );
    } else {
      lines.push("- No evidence captured yet.");
    }

    return `${lines.join("\n")}`;
  }
}
