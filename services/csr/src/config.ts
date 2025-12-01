export interface SourcePrecedenceConfig {
  sources: string[];
}

export const defaultSourcePrecedence: SourcePrecedenceConfig = {
  sources: ['crm', 'app_sdk', 'partner']
};

export function sourcePriority(source: string, config: SourcePrecedenceConfig): number {
  const normalized = source.toLowerCase();
  const idx = config.sources.findIndex((s) => s === normalized);
  return idx === -1 ? config.sources.length : idx;
}
