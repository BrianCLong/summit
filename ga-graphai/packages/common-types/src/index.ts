export * from "./linearx";

export type AutomationMode = 'auto' | 'guided' | 'manual';

export interface PromptHardening {
  readonly toxicityFilter: boolean;
  readonly jailbreakDetection: boolean;
  readonly piiRedaction: boolean;
  readonly maxPromptChars: number;
}

export interface PromptTuning {
  readonly systemInstruction: string;
  readonly styleGuide: readonly string[];
  readonly safetyClauses: readonly string[];
  readonly temperature: number;
  readonly maxTokens: number;
  readonly hardening: PromptHardening;
}

export interface NavigationDirective {
  readonly url: string;
  readonly method?: 'GET' | 'POST';
  readonly payload?: Record<string, string | number>;
  readonly headers?: Record<string, string>;
}

export interface LlmWebCommand {
  readonly entrypoint: NavigationDirective;
  readonly promptFieldSelector: string;
  readonly submitSelector: string;
  readonly completionSelector: string;
  readonly tuning: PromptTuning;
}

export interface ManualControlPlan {
  readonly mode: AutomationMode;
  readonly pauseBeforeNavigation: boolean;
  readonly pauseBeforePrompt: boolean;
  readonly pauseBeforeCapture: boolean;
}

export interface TicketDescriptor {
  readonly id: string;
  readonly summary: string;
  readonly priority: number;
  readonly requiredCapabilities: readonly string[];
  readonly entryUrl: string;
  readonly prompt: string;
  readonly llmCommand: LlmWebCommand;
  readonly automationMode: AutomationMode;
  readonly context: Record<string, string>;
}

export interface WorkerCapability {
  readonly skill: string;
  readonly weight: number;
}

export interface WorkerDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: readonly WorkerCapability[];
  readonly maxConcurrent: number;
  readonly currentLoad: number;
}

export interface WorkParcelPlan {
  readonly ticket: TicketDescriptor;
  readonly worker: WorkerDescriptor;
  readonly manualControl: ManualControlPlan;
  readonly expectedEffortMinutes: number;
}

export interface AssignmentPlan {
  readonly parcels: readonly WorkParcelPlan[];
  readonly unassigned: readonly TicketDescriptor[];
}

export interface AutomationCommand {
  readonly parcel: WorkParcelPlan;
  readonly composedPrompt: string;
  readonly metadata: Record<string, unknown>;
}
