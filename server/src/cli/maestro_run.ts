#!/usr/bin/env node

import { Maestro } from '../maestro/core';
import { IntelGraphClientImpl } from '../intelgraph/client';
import { CostMeter } from '../maestro/cost_meter';
import { OpenAILLM } from '../maestro/adapters/llm_openai';

async function main() {
  const [, , ...args] = process.argv;
  const requestText = args.join(' ').trim();
  if (!requestText) {
    console.error('Usage: maestro-run "<request text>"');
    process.exit(1);
  }

  // Define a simple pricing table
  const pricingTable = {
    'openai:gpt-4.1': { inputPer1K: 0.03, outputPer1K: 0.06 },
    'openai:gpt-4.1-mini': { inputPer1K: 0.01, outputPer1K: 0.02 },
  };

  const ig = new IntelGraphClientImpl();
  const costMeter = new CostMeter(ig, pricingTable);
  const llm = new OpenAILLM(process.env.OPENAI_API_KEY || 'dummy-key', costMeter);

  const maestro = new Maestro(ig, costMeter, llm, {
    defaultPlannerAgent: 'openai:gpt-4.1',
    defaultActionAgent: 'openai:gpt-4.1-mini',
  });

  const result = await maestro.runPipeline('local-user', requestText);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
