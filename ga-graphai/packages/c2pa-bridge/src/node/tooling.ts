import { ToolChainEntry } from '../types';

export function parseToolChainOption(value: string): ToolChainEntry {
  const [toolPart, paramPart] = value.split('|', 2);
  const [name, version] = toolPart.split('@');
  if (!name || !version) {
    throw new Error(`Invalid tool specification: ${value}. Expected format name@version|key=value`);
  }
  const parameters: Record<string, string> = {};
  if (paramPart) {
    for (const pair of paramPart.split(',')) {
      if (!pair.trim()) {
        continue;
      }
      const [key, val] = pair.split('=');
      if (!key || val === undefined) {
        throw new Error(`Invalid tool parameter in "${value}"`);
      }
      parameters[key.trim()] = val.trim();
    }
  }
  return {
    name: name.trim(),
    version: version.trim(),
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
  };
}
