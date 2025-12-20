
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: ExtensionPermission[];
  entryPoint: string; // URL or local path
}

export type ExtensionPermission =
  | 'read:graph'
  | 'write:graph'
  | 'read:user'
  | 'execute:analysis';

export interface ExtensionContext {
  tenantId: string;
  extensionId: string;
  permissions: ExtensionPermission[];
}

export interface ExtensionHook {
  event: string;
  callbackUrl: string;
}

export interface ExtensionRegistry {
  register(manifest: ExtensionManifest): Promise<void>;
  get(id: string): Promise<ExtensionManifest | null>;
  list(): Promise<ExtensionManifest[]>;
  uninstall(id: string): Promise<void>;
}
