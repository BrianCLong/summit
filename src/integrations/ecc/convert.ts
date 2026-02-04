import * as fs from 'node:fs';
import * as path from 'node:path';
import { EccPack } from './types';

/**
 * Reads all markdown files in a directory and returns a mapping of filename (without extension) to content.
 */
function readMarkdownFiles(dirPath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = path.basename(file, '.md');
        result[name] = fs.readFileSync(path.join(dirPath, file), 'utf8');
      }
    }
  }
  return result;
}

/**
 * Loads an ECC pack from the specified root directory.
 */
export function loadEccPack(root: string): EccPack {
  return {
    agents: readMarkdownFiles(path.join(root, 'agents')),
    skills: readMarkdownFiles(path.join(root, 'skills')),
    commands: readMarkdownFiles(path.join(root, 'commands')),
    rules: readMarkdownFiles(path.join(root, 'rules')),
    hooksJson: fs.existsSync(path.join(root, 'hooks.json'))
      ? JSON.parse(fs.readFileSync(path.join(root, 'hooks.json'), 'utf8'))
      : undefined,
    mcpServersJson: fs.existsSync(
      path.join(root, 'mcp-configs', 'mcp-servers.json')
    )
      ? JSON.parse(
          fs.readFileSync(
            path.join(root, 'mcp-configs', 'mcp-servers.json'),
            'utf8'
          )
        )
      : undefined,
  };
}

/**
 * Converts an EccPack to a Summit Blueprint Pack model.
 */
export function convertToSummitPack(ecc: EccPack) {
  return {
    meta: {
      source: 'ECC',
      version: '1.0.0',
    },
    agents: ecc.agents,
    skills: ecc.skills,
    commands: ecc.commands,
    policies: ecc.rules,
    hooks: ecc.hooksJson,
    tools: ecc.mcpServersJson,
  };
}
