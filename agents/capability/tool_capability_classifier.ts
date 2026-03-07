export type CapabilityAssignment = {
  tool_id: string;
  capability_ids: string[];
  evidence_ids: string[];
  classifier_version: "v1";
};

export class ToolCapabilityClassifier {
  classify(toolName: string, provider: string, description: string): CapabilityAssignment {
    // Simple mock classification for now
    return {
      tool_id: `${provider.toLowerCase()}-${toolName.toLowerCase().replace(/\s+/g, '-')}`,
      capability_ids: ["code_generation"],
      evidence_ids: ["SUMMIT:CLASS-001"],
      classifier_version: "v1"
    };
  }
}
