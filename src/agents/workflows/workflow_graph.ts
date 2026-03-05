// eslint-disable
// Example: Lead -> Qualification -> Proposal -> Close
export interface WorkflowNode {
  name: string;
  next: string[];
}
