import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MANIFEST = (name: string) => `schema_version: s-adk/v1
name: ${name}
description: Summit S-ADK scaffold
tools: []
connections: []
knowledge_base:
  sources: []
policy:
  allow_tools: []
  allow_network: false
`;

const DEFAULT_FIXTURE = `{
  "name": "minimal",
  "inputs": {
    "prompt": "Hello Summit ADK"
  },
  "tool_calls": []
}
`;

export async function initAgentScaffold(agentName: string, cwd: string): Promise<{ manifestPath: string }> {
  const agentDir = path.resolve(cwd, agentName);
  const manifestPath = path.join(agentDir, 'agent.yaml');
  const fixtureDir = path.join(agentDir, 'fixtures');
  const fixturePath = path.join(fixtureDir, 'minimal.json');

  await fs.mkdir(agentDir, { recursive: false });
  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.writeFile(manifestPath, DEFAULT_MANIFEST(agentName), 'utf-8');
  await fs.writeFile(fixturePath, DEFAULT_FIXTURE, 'utf-8');

  return { manifestPath };
}
