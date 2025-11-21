/**
 * Shared types for data-augmentation package
 */

/**
 * Tabular data structure (local definition to avoid circular dependencies)
 */
export interface TabularData {
  columns: string[];
  data: any[][];
  metadata?: {
    types?: Record<string, 'categorical' | 'numerical' | 'datetime'>;
    distributions?: Record<string, any>;
    correlations?: number[][];
  };
}
