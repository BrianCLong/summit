export type Session = { id: string };
export type InvokeArgs = { fn: string; args: unknown };

export type ToolDescriptor = {
  name: string;
  description?: string;
  scopes?: string[];
};

export type ResourceDescriptor = {
  name: string;
  description?: string;
  version?: string;
};

export type PromptDescriptor = {
  name: string;
  version: string;
  description?: string;
};
