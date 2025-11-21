import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Custom analyzer extension point
 */
export interface AnalyzerExtension extends ExtensionPoint<AnalyzerInput, AnalyzerResult> {
  type: 'analyzer';
  name: string;
  description: string;
  supportedDataTypes: string[];
}

export interface AnalyzerInput {
  data: any;
  dataType: string;
  options?: Record<string, any>;
}

export interface AnalyzerResult {
  insights: Insight[];
  entities?: Entity[];
  relationships?: Relationship[];
  confidence: number;
  metadata?: Record<string, any>;
}

export interface Insight {
  type: string;
  description: string;
  confidence: number;
  evidence?: any[];
}

export interface Entity {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

/**
 * Base class for analyzer extensions
 */
export abstract class BaseAnalyzerExtension implements AnalyzerExtension {
  readonly type = 'analyzer' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly supportedDataTypes: string[]
  ) {}

  abstract execute(input: AnalyzerInput): Promise<AnalyzerResult>;
}
