import { BaseExtension } from './BaseExtension.js';
import { PluginContext, PluginManifest } from '../types/plugin.js';

/**
 * Base class for visualization plugins
 * Visualization plugins render UI components (via iframe/web component)
 */
export abstract class VisualizationExtension extends BaseExtension {
  constructor(manifest: PluginManifest) {
    super(manifest);
  }

  /**
   * Render visualization with provided data
   */
  abstract render(input: VisualizationInput): Promise<VisualizationOutput>;

  /**
   * Get visualization metadata
   */
  abstract getMetadata(): VisualizationMetadata;

  /**
   * Validate if this visualization can render the given data
   */
  abstract canRender(data: any): Promise<boolean>;

  protected async onInitialize(context: PluginContext): Promise<void> {
    const metadata = this.getMetadata();
    this.log.info(`Initializing visualization plugin: ${metadata.name}`);

    await this.validatePermissions(context);
  }

  protected async onStart(): Promise<void> {
    this.log.info('Visualization plugin started');
  }

  protected async onStop(): Promise<void> {
    this.log.info('Visualization plugin stopped');
  }

  protected async onDestroy(): Promise<void> {
    this.log.info('Visualization plugin cleaned up');
  }

  private async validatePermissions(_context: PluginContext): Promise<void> {
    const requiredPermissions = ['ui:extensions'];
    const hasPermissions = requiredPermissions.every(perm =>
      this.manifest.permissions.map(p => p.toString()).includes(perm)
    );

    if (!hasPermissions) {
      throw new Error(
        `Visualization plugin ${this.manifest.id} missing required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }
}

/**
 * Input for visualization rendering
 */
export interface VisualizationInput {
  /**
   * Data to visualize
   */
  data: any;

  /**
   * Visualization configuration
   */
  config?: VisualizationConfig;

  /**
   * Container dimensions
   */
  dimensions?: {
    width: number;
    height: number;
  };

  /**
   * Interaction callbacks
   */
  interactions?: {
    onClick?: (event: InteractionEvent) => void;
    onHover?: (event: InteractionEvent) => void;
    onSelection?: (selection: any) => void;
  };

  /**
   * Theme configuration
   */
  theme?: ThemeConfig;
}

export interface VisualizationConfig {
  title?: string;
  subtitle?: string;
  layout?: 'vertical' | 'horizontal' | 'grid' | 'free';
  interactive?: boolean;
  exportable?: boolean;
  filters?: Filter[];
  sorting?: SortConfig;
  grouping?: GroupConfig;
  [key: string]: any; // Allow custom config
}

export interface Filter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GroupConfig {
  field: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ThemeConfig {
  colorScheme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface InteractionEvent {
  type: 'click' | 'hover' | 'selection';
  target: any;
  data?: any;
  position?: { x: number; y: number };
}

/**
 * Output from visualization rendering
 */
export interface VisualizationOutput {
  /**
   * Rendering type
   */
  type: 'html' | 'svg' | 'canvas' | 'webcomponent' | 'iframe';

  /**
   * Component configuration
   */
  component: ComponentConfig;

  /**
   * Required assets (CSS, JS)
   */
  assets?: Asset[];

  /**
   * Sandbox configuration for iframe
   */
  sandbox?: SandboxConfig;

  /**
   * Accessibility metadata
   */
  accessibility?: {
    ariaLabel?: string;
    description?: string;
    keyboardShortcuts?: Record<string, string>;
  };
}

export interface ComponentConfig {
  /**
   * Component tag name (for web components)
   */
  tag?: string;

  /**
   * HTML content
   */
  html?: string;

  /**
   * Props to pass to component
   */
  props?: Record<string, any>;

  /**
   * Iframe URL
   */
  url?: string;

  /**
   * Inline script
   */
  script?: string;

  /**
   * Inline styles
   */
  style?: string;
}

export interface Asset {
  type: 'script' | 'style' | 'font' | 'image';
  url: string;
  integrity?: string; // SRI hash
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface SandboxConfig {
  /**
   * Sandbox permissions
   */
  allow: SandboxPermission[];

  /**
   * Content Security Policy
   */
  csp?: string;

  /**
   * Feature policy
   */
  featurePolicy?: Record<string, string[]>;
}

export type SandboxPermission =
  | 'scripts'
  | 'forms'
  | 'modals'
  | 'orientation-lock'
  | 'pointer-lock'
  | 'popups'
  | 'popups-to-escape-sandbox'
  | 'presentation'
  | 'same-origin'
  | 'top-navigation'
  | 'top-navigation-by-user-activation';

/**
 * Visualization plugin metadata
 */
export interface VisualizationMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  icon?: string;
  thumbnail?: string;
  tags?: string[];

  /**
   * Supported visualization types
   */
  types: VisualizationType[];

  /**
   * Data schema this viz can handle
   */
  supportedDataTypes: string[];

  /**
   * Configuration schema
   */
  configSchema?: Record<string, any>;

  /**
   * Examples
   */
  examples?: VisualizationExample[];
}

export interface VisualizationType {
  id: string;
  name: string;
  description: string;
  icon?: string;
  preview?: string;
}

export interface VisualizationExample {
  name: string;
  description: string;
  data: any;
  config?: VisualizationConfig;
  preview?: string;
}
