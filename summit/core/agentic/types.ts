export type WorkspaceID = string;
export type RunID = string;

export interface Workspace {
  id: WorkspaceID;
  rootUri: string;            // e.g. file:///... or repo://...
  authorizedRoots: string[];  // deny-by-default: only these roots
  configSnapshot: Record<string, unknown>;
}

export interface Plan {
  version: number;
  generatedAt: string; // NOTE: timestamps must be stored only in stamp.json when exported
  steps: Array<{ id: string; title: string; status: "todo"|"doing"|"done"|"blocked" }>;
}

export interface Step {
  id: string;
  tool: string;
  argsSummary: string;
  permissionState: "none"|"requested"|"allowed_once"|"allowed_always"|"denied";
  outputRef?: string;
}

export interface Artifact {
  id: string;
  kind: "file"|"export"|"report";
  uri: string;
  sha256?: string;
}

export interface Run {
  id: RunID;
  workspaceId: WorkspaceID;
  plan: Plan;
  steps: Step[];
  artifacts: Artifact[];
}
