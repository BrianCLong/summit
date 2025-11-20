import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Visualization widget extension point
 */
export interface VisualizationExtension extends ExtensionPoint<VisualizationData, VisualizationConfig> {
  type: 'visualization';
  name: string;
  description: string;
  componentPath: string;
}

export interface VisualizationData {
  data: any;
  config?: Record<string, any>;
}

export interface VisualizationConfig {
  component: string;
  props: Record<string, any>;
  layout?: {
    width?: number | string;
    height?: number | string;
  };
}

/**
 * Base class for visualization extensions
 */
export abstract class BaseVisualizationExtension implements VisualizationExtension {
  readonly type = 'visualization' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly componentPath: string
  ) {}

  abstract execute(input: VisualizationData): Promise<VisualizationConfig>;
}
