export type EccPack = {
  agents: Record<string, string>; // name -> markdown
  skills: Record<string, string>;
  commands: Record<string, string>;
  rules: Record<string, string>;
  hooksJson?: unknown;
  mcpServersJson?: unknown;
};
