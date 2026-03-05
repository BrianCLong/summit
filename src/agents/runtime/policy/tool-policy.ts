import { ToolInvocationGate } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class YamlToolPolicyGate implements ToolInvocationGate {
  private allowedTools: Set<string> = new Set();
  private loaded: boolean = false;

  constructor(private policyPath: string) {}

  private async loadPolicy(): Promise<void> {
    if (this.loaded) return;

    try {
      const fullPath = path.resolve(this.policyPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Basic YAML parsing for the allowed tools
      // In a real scenario, use js-yaml or similar
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('- ')) {
          this.allowedTools.add(line.trim().substring(2).trim());
        }
      }
      this.loaded = true;
    } catch (error) {
      console.error(`Failed to load policy from ${this.policyPath}:`, error);
      // Default deny
      this.allowedTools.clear();
      this.loaded = true;
    }
  }

  async validate(toolName: string, args: any): Promise<boolean> {
    await this.loadPolicy();

    // Check if tool is allowed
    if (!this.allowedTools.has(toolName)) {
      return false;
    }

    // In a real implementation, you might also validate the args against JSON Schema
    return true;
  }
}
