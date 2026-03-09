import fs from 'node:fs';
import path from 'node:path';

export class ConstitutionLoader {
  private sections: Map<string, string> = new Map();

  constructor(private rootPath: string = process.cwd()) {}

  load(): void {
    const agentsPath = path.join(this.rootPath, 'AGENTS.md');
    if (!fs.existsSync(agentsPath)) {
      throw new Error(`AGENTS.md not found at ${agentsPath}`);
    }

    const content = fs.readFileSync(agentsPath, 'utf8');
    const sections = content.split(/^##\s+/m);

    // Skip the first part (header before first ##)
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      this.sections.set(title, body);
    }
  }

  getPolicy(section: string): string | undefined {
    return this.sections.get(section);
  }

  validate(agentId: string, action: string): boolean {
    const section = Array.from(this.sections.keys()).find(key => key.includes(agentId));
    if (!section) return false;

    const body = this.sections.get(section);
    return body?.includes(action) ?? false;
  }
}
