"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioLoader = void 0;
exports.createScenarioLoader = createScenarioLoader;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = __importDefault(require("yaml"));
const types_js_1 = require("../types.js");
/**
 * ScenarioLoader - Load and validate scenario definitions from YAML files
 */
class ScenarioLoader {
    scenariosPath;
    cache = new Map();
    constructor(scenariosPath = './scenarios') {
        this.scenariosPath = scenariosPath;
    }
    /**
     * Load a single scenario by ID
     */
    loadScenario(scenarioId) {
        // Check cache
        if (this.cache.has(scenarioId)) {
            return this.cache.get(scenarioId);
        }
        // Try to find the file
        const possiblePaths = [
            (0, node_path_1.join)(this.scenariosPath, `${scenarioId}.yaml`),
            (0, node_path_1.join)(this.scenariosPath, `${scenarioId}.yml`),
            (0, node_path_1.join)(this.scenariosPath, scenarioId, 'scenario.yaml'),
            (0, node_path_1.join)(this.scenariosPath, scenarioId, 'scenario.yml'),
        ];
        for (const filePath of possiblePaths) {
            try {
                const scenario = this.loadFromFile(filePath);
                this.cache.set(scenarioId, scenario);
                return scenario;
            }
            catch {
                // Try next path
            }
        }
        throw new Error(`Scenario not found: ${scenarioId}`);
    }
    /**
     * Load scenario from a specific file
     */
    loadFromFile(filePath) {
        const content = (0, node_fs_1.readFileSync)(filePath, 'utf8');
        const parsed = yaml_1.default.parse(content);
        return this.validateScenario(parsed);
    }
    /**
     * Load all scenarios from the scenarios directory
     */
    loadAll() {
        const scenarios = [];
        const files = this.findScenarioFiles(this.scenariosPath);
        for (const file of files) {
            try {
                const scenario = this.loadFromFile(file);
                this.cache.set(scenario.id, scenario);
                scenarios.push(scenario);
            }
            catch (err) {
                console.warn(`Warning: Failed to load scenario from ${file}:`, err);
            }
        }
        return scenarios;
    }
    /**
     * Load scenarios by category
     */
    loadByCategory(category) {
        const all = this.loadAll();
        return all.filter((s) => s.category === category);
    }
    /**
     * Load scenarios by tags
     */
    loadByTags(tags) {
        const all = this.loadAll();
        return all.filter((s) => tags.some((tag) => s.tags?.includes(tag)));
    }
    /**
     * Validate a scenario against the schema
     */
    validateScenario(data) {
        const result = types_js_1.ScenarioSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid scenario format: ${result.error.message}`);
        }
        return result.data;
    }
    /**
     * Recursively find all YAML scenario files
     */
    findScenarioFiles(dir) {
        const files = [];
        try {
            const entries = (0, node_fs_1.readdirSync)(dir);
            for (const entry of entries) {
                const fullPath = (0, node_path_1.join)(dir, entry);
                const stat = (0, node_fs_1.statSync)(fullPath);
                if (stat.isDirectory()) {
                    files.push(...this.findScenarioFiles(fullPath));
                }
                else if (stat.isFile() &&
                    ['.yaml', '.yml'].includes((0, node_path_1.extname)(entry))) {
                    files.push(fullPath);
                }
            }
        }
        catch {
            // Directory doesn't exist or is not accessible
        }
        return files;
    }
    /**
     * Create a scenario from JSON (useful for programmatic creation)
     */
    static fromJSON(json) {
        const result = types_js_1.ScenarioSchema.safeParse(json);
        if (!result.success) {
            throw new Error(`Invalid scenario: ${result.error.message}`);
        }
        return result.data;
    }
    /**
     * Convert scenario to YAML string
     */
    static toYAML(scenario) {
        return yaml_1.default.stringify(scenario);
    }
}
exports.ScenarioLoader = ScenarioLoader;
/**
 * Create a scenario loader with default path
 */
function createScenarioLoader(path) {
    return new ScenarioLoader(path ?? (0, node_path_1.join)(process.cwd(), 'scenarios'));
}
