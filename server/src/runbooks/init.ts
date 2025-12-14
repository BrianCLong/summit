import { RunbookEngine } from '../runbooks/engine/RunbookEngine.js';
import {
  rapidAttribution,
  phishingDiscovery,
  disinformationMapping,
  humanRightsVetting,
  supplyChainTrace
} from '../runbooks/definitions/core.js';
import {
  IngestionStep,
  GraphQueryStep,
  AnalyticsStep,
  CopilotStep,
  GovernanceStep
} from '../runbooks/steps/common.js';
import { runbookEngine } from '../runbooks/engine/RunbookEngine.js';

export function initializeRunbookEngine() {
  // Register Steps
  runbookEngine.registerStep('ingestion', new IngestionStep());
  runbookEngine.registerStep('graph_query', new GraphQueryStep());
  runbookEngine.registerStep('analytics', new AnalyticsStep());
  runbookEngine.registerStep('copilot', new CopilotStep());
  runbookEngine.registerStep('governance', new GovernanceStep());

  // Register Definitions
  runbookEngine.registerDefinition(rapidAttribution);
  runbookEngine.registerDefinition(phishingDiscovery);
  runbookEngine.registerDefinition(disinformationMapping);
  runbookEngine.registerDefinition(humanRightsVetting);
  runbookEngine.registerDefinition(supplyChainTrace);

  console.log('Runbook Engine Initialized with 5 core runbooks');
}
