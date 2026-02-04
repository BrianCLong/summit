
export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  permissions?: {
    network?: string[];
    filesystem?: string[];
    env?: string[];
    [key: string]: any;
  };
  signature?: string;
  // Summit specific extensions
  entry?: string; // Main entry point
  toolCompat?: Record<string, any>; // Tool compatibility metadata
}

export interface SkillSource {
  type: 'git' | 'local';
  url?: string;
  path: string;
  commit?: string;
  license?: string;
  hashes?: Record<string, string>;
}

export interface Skill {
  id: string;
  manifest: SkillManifest;
  source: SkillSource;
  location: string; // Local path where it's stored in the registry
}

export type InstallMode = 'symlink' | 'copy';

export interface InstallTarget {
  tool: string; // e.g., 'cursor', 'vscode'
  scope: 'user' | 'machine'; // defaulting to user for now
  mode: InstallMode;
  location: string; // Target path
}

export interface InstalledSkill {
  skillId: string;
  target: InstallTarget;
  installedAt: string; // ISO date
  version: string;
}

export interface Adapter {
  name: string;
  detect(): Promise<boolean>;
  getInstallTarget(skill: Skill): Promise<InstallTarget | null>;
  install(skill: Skill, target: InstallTarget): Promise<void>;
  listInstalled(): Promise<InstalledSkill[]>;
}
