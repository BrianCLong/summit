import { ExtensionPoint } from "../ExtensionPoint.js";

export interface UIPanelContext {
  theme: "light" | "dark" | "system";
  entityId?: string;
  entityType?: string;
  user?: Record<string, any>;
  viewport?: { width: number; height: number };
}

export interface UIPanelConfig {
  component: string;
  props: Record<string, any>;
  title: string;
  icon?: string;
  layout?: {
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
  };
}

/**
 * UI Panel Extension - Defines a user interface component that can be embedded in the application.
 */
export interface UIPanelExtension extends ExtensionPoint<UIPanelContext, UIPanelConfig> {
  type: "ui-panel";

  location: "sidebar" | "dashboard" | "item-view" | "global-nav";
  componentId: string;
  requiredScopes?: string[];
}

export abstract class BaseUIPanelExtension implements UIPanelExtension {
  readonly type = "ui-panel" as const;

  constructor(
    public readonly id: string,
    public readonly location: "sidebar" | "dashboard" | "item-view" | "global-nav",
    public readonly componentId: string,
    public readonly requiredScopes: string[] = []
  ) {}

  /**
   * Returns the configuration for the panel based on the context.
   */
  abstract execute(context: UIPanelContext): Promise<UIPanelConfig>;
}
