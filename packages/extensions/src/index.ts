// Extension system for IntelGraph platform
export const version = '1.0.0';

export interface Extension {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface ExtensionRegistry {
  register(extension: Extension): void;
  unregister(id: string): void;
  get(id: string): Extension | undefined;
  list(): Extension[];
}
