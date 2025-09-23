import { ruleStore, rulesEngine } from '../../server/src/resolvers/rulesAlerts';

async function main() {
  for (const rule of ruleStore.listEnabled()) {
    await rulesEngine.evalPattern(rule);
  }
}

main();
