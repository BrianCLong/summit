#!/usr/bin/env node
import { runStrategicGrowthEngine } from './lib/strategic-growth-engine.mjs';

const result = await runStrategicGrowthEngine();
const totals = result.expansionOpportunities.totals;

console.log('Strategic Growth Report');
console.log('-----------------------');
console.log(`Expansion Opportunities: ${totals.expansion_opportunities}`);
console.log(`New Plugin Categories: ${totals.plugin_categories}`);
console.log(`Partner Verticals: ${totals.partner_verticals}`);
