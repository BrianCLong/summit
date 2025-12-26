
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: ExtensionPermission[];
  scopes: ExtensionScope[];
  executionMode: ExtensionExecutionMode;
  resources: ExtensionResources;
  entryPoint: string; // URL or local path
}

export type ExtensionPermission =
  | 'read:graph'
  | 'write:graph'
  | 'read:user'
  | 'execute:analysis';

export interface ExtensionScope {
  resourceType: 'node' | 'edge' | 'user' | 'report';
  action: 'read' | 'write' | 'create' | 'delete';
  filter?: Record<string, any>; // For potential future granular filtering
}

export enum ExtensionExecutionMode {
  WEBHOOK = 'webhook',
  WORKFLOW_STEP = 'workflow_step',
  READ_ONLY_QUERY = 'read_only_query',
}

export interface ExtensionResources {
  memoryLimitMb: number;
  timeoutMs: number;
  networkAccess: boolean; // If true, allow outbound calls (governed by policy)
}

export enum ExtensionState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  REVOKED = 'revoked',
}

export interface Installation {
  id: string; // Installation ID
  tenantId: string;
  extensionId: string;
  version: string;
  state: ExtensionState;
  permissionsGranted: ExtensionPermission[];
  installedAt: Date;
  updatedAt: Date;
}

export interface ExtensionContext {
  tenantId: string;
  extensionId: string;
  installationId: string;
  permissions: ExtensionPermission[];
}

export interface ExtensionRegistry {
  register(manifest: ExtensionManifest): Promise<void>;
  get(id: string): Promise<ExtensionManifest | null>;
  list(): Promise<ExtensionManifest[]>;
  uninstall(tenantId: string, extensionId: string): Promise<void>; // Uninstall from tenant
  install(tenantId: string, extensionId: string): Promise<Installation>; // Install to tenant
  getInstallation(tenantId: string, extensionId: string): Promise<Installation | null>;
  revoke(extensionId: string, reason: string): Promise<void>; // Global revocation
}
