export interface OsintTool {
  /** Deterministic identifier for the tool (e.g., hash of source + name) */
  id: string;

  /** Name of the tool */
  name: string;

  /** Category of the tool (e.g., "Reverse Image Search", "Geolocation") */
  category: string;

  /** Primary URL for the tool */
  url: string;

  /** Description of the tool's purpose and any limitations */
  description: string;

  /** Source of the tool entry (e.g., "bellingcat") */
  source: string;

  /** Whether the tool requires authentication */
  authNeeded: boolean;

  /** Cost model of the tool */
  cost: 'free' | 'paid' | 'freemium' | 'unknown';

  /** Date the tool was last checked for drift (YYYY-MM-DD format) */
  lastChecked?: string;
}

export interface ToolRegistry {
  /** Source name for this registry partition */
  source: string;

  /** Array of normalized tools */
  tools: OsintTool[];

  /** Total number of tools */
  count: number;

  /** When the registry was generated (ISO string, use deterministic value for static bundles) */
  generatedAt: string;
}
