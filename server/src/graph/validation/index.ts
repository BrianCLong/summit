import { getNeo4jDriver } from '../../db/neo4j.js';
import GraphValidationService from './GraphValidationService.js';
import { createCypherExecutorFromDriver, defaultGraphCypherRules } from './cypherRules.js';
export * from './types.js';
export { defaultGraphCypherRules, createCypherExecutorFromDriver, GraphValidationService };

let singleton: GraphValidationService | null = null;

export function getGraphValidationService(): GraphValidationService {
  if (!singleton) {
    const driver = getNeo4jDriver();
    singleton = new GraphValidationService({
      cypherRules: defaultGraphCypherRules,
      cypherExecutor: createCypherExecutorFromDriver(driver),
    });
  }
  return singleton;
}
