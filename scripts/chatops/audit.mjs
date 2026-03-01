import fs from 'fs';
import path from 'path';

const docsDir = path.join(process.cwd(), 'docs', 'chatops');
fs.mkdirSync(docsDir, { recursive: true });

const gapReport = `# ChatOps Gap Report

## Current State
- Missing hierarchical memory system
- Missing intent router with multi-model consensus
- No bounded autonomy framework with risk-tiered gates
- Limited real-time streaming
- No ReAct trace transparency

## Action Items
1. Implement multi-model intent router
2. Implement short/med/long-term hierarchical memory
3. Implement bounded autonomy engine
4. Build graph-native chat interface (NL->Cypher)
`;

const prompts = `# Jules Prompts for ChatOps

1. "Jules, scaffold a new service 'chatops-intent-router' that exposes a GraphQL endpoint for multi-model intent classification."
2. "Jules, implement a 3-tier memory system in Redis and Neo4j for the new ChatOps service."
3. "Jules, create a ReAct agent orchestrator with risk-tiered gates (autonomous, HITL, prohibited)."
`;

fs.writeFileSync(path.join(docsDir, 'audit-gap-report.md'), gapReport);
fs.writeFileSync(path.join(docsDir, 'jules-prompts.md'), prompts);

console.log('✅ Generated gap report -> docs/chatops/audit-gap-report.md');
console.log('✅ Generated Jules prompts -> docs/chatops/jules-prompts.md');
