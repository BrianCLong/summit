import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import YAML from 'yaml';
import { ScenarioSchema, type Scenario } from '../types.js';

/**
 * ScenarioLoader - Load and validate scenario definitions from YAML files
 */
export class ScenarioLoader {
  private readonly scenariosPath: string;
  private readonly cache: Map<string, Scenario> = new Map();

  constructor(scenariosPath: string = './scenarios') {
    this.scenariosPath = scenariosPath;
  }

  /**
   * Load a single scenario by ID
   */
  loadScenario(scenarioId: string): Scenario {
    // Check cache
    if (this.cache.has(scenarioId)) {
      return this.cache.get(scenarioId)!;
    }

    // Try to find the file
    const possiblePaths = [
      join(this.scenariosPath, `${scenarioId}.yaml`),
      join(this.scenariosPath, `${scenarioId}.yml`),
      join(this.scenariosPath, scenarioId, 'scenario.yaml'),
      join(this.scenariosPath, scenarioId, 'scenario.yml'),
    ];

    for (const filePath of possiblePaths) {
      try {
        const scenario = this.loadFromFile(filePath);
        this.cache.set(scenarioId, scenario);
        return scenario;
      } catch {
        // Try next path
      }
    }

    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  /**
   * Load scenario from a specific file
   */
  loadFromFile(filePath: string): Scenario {
    const content = readFileSync(filePath, 'utf8');
    const parsed = YAML.parse(content);
    return this.validateScenario(parsed);
  }

  /**
   * Load all scenarios from the scenarios directory
   */
  loadAll(): Scenario[] {
    const scenarios: Scenario[] = [];
    const files = this.findScenarioFiles(this.scenariosPath);

    for (const file of files) {
      try {
        const scenario = this.loadFromFile(file);
        this.cache.set(scenario.id, scenario);
        scenarios.push(scenario);
      } catch (err) {
        console.warn(`Warning: Failed to load scenario from ${file}:`, err);
      }
    }

    return scenarios;
  }

  /**
   * Load scenarios by category
   */
  loadByCategory(category: Scenario['category']): Scenario[] {
    const all = this.loadAll();
    return all.filter((s) => s.category === category);
  }

  /**
   * Load scenarios by tags
   */
  loadByTags(tags: string[]): Scenario[] {
    const all = this.loadAll();
    return all.filter((s) => tags.some((tag) => s.tags?.includes(tag)));
  }

  /**
   * Validate a scenario against the schema
   */
  private validateScenario(data: unknown): Scenario {
    const result = ScenarioSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Invalid scenario format: ${result.error.message}`,
      );
    }
    return result.data;
  }

  /**
   * Recursively find all YAML scenario files
   */
  private findScenarioFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...this.findScenarioFiles(fullPath));
        } else if (
          stat.isFile() &&
          ['.yaml', '.yml'].includes(extname(entry))
        ) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or is not accessible
    }

    return files;
  }

  /**
   * Create a scenario from JSON (useful for programmatic creation)
   */
  static fromJSON(json: Record<string, unknown>): Scenario {
    const result = ScenarioSchema.safeParse(json);
    if (!result.success) {
      throw new Error(`Invalid scenario: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Convert scenario to YAML string
   */
  static toYAML(scenario: Scenario): string {
    return YAML.stringify(scenario);
  }
}

/**
 * Create a scenario loader with default path
 */
export function createScenarioLoader(
  path?: string,
): ScenarioLoader {
  return new ScenarioLoader(
    path ?? join(process.cwd(), 'scenarios'),
  );
}
