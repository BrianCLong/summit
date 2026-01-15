import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { AgentSpecValidator } from './validator';

export interface AgentRegistryEntry {
    filePath: string;
    spec: any;
    valid: boolean;
    errors: string[];
}

export class AgentRegistryLoader {
    private validator: AgentSpecValidator;

    constructor() {
        this.validator = new AgentSpecValidator();
    }

    public loadRegistry(registryDir: string): AgentRegistryEntry[] {
        const entries: AgentRegistryEntry[] = [];

        if (!fs.existsSync(registryDir)) {
            throw new Error(`Registry directory not found: ${registryDir}`);
        }

        const files = fs.readdirSync(registryDir).filter(f => f.endsWith('.agent.yaml') || f.endsWith('.agent.yml'));

        // Sort for deterministic loading order
        files.sort();

        for (const file of files) {
            const filePath = path.join(registryDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            let spec: any;
            try {
                spec = yaml.load(content);
                const validation = this.validator.validateSpec(spec);
                entries.push({
                    filePath,
                    spec,
                    valid: validation.valid,
                    errors: validation.errors
                });
            } catch (e: any) {
                entries.push({
                    filePath,
                    spec: null,
                    valid: false,
                    errors: [`Failed to parse YAML: ${e.message}`]
                });
            }
        }

        return entries;
    }
}
