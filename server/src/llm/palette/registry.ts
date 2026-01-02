import fs from 'fs';
import path from 'path';
import { ReasoningPalette, ReasoningPaletteId, PaletteRuntimeConfig } from './types.js';

function safePrefix(id: string, body: string): string {
  return [`--- REASONING PALETTE MODE: ${id} ---`, body.trim(), '--- END REASONING PALETTE ---'].join('\n');
}

const builtInPalettes: ReasoningPalette[] = [
  {
    id: 'math_rigor',
    label: 'Math Rigor',
    description: 'Careful stepwise mathematical derivations with explicit checks.',
    injection: {
      kind: 'text_prefix',
      textPrefix: safePrefix(
        'math_rigor',
        `Work through quantitative questions with explicit derivations.
Always restate givens, define variables, and check dimensional consistency.
List assumptions, show each algebraic step, and validate the final result with a quick sanity check.`
      ),
    },
    decoding: { temperature: 0.2, topP: 0.9 },
    tags: ['math', 'rigor'],
    safeDefault: true,
  },
  {
    id: 'code_planner',
    label: 'Code Planner',
    description: 'Plan before coding; outline functions, edge cases, and tests.',
    injection: {
      kind: 'text_prefix',
      textPrefix: safePrefix(
        'code_planner',
        `Plan-first coding. Summarize goal, outline key functions, note interfaces and failure cases.
Describe test ideas before presenting final code. Keep instructions concise and policy-safe.`
      ),
    },
    decoding: { temperature: 0.35, topP: 0.9 },
    tags: ['code', 'planning'],
    safeDefault: true,
  },
  {
    id: 'skeptical_audit',
    label: 'Skeptical Audit',
    description: 'Challenge assumptions and look for weaknesses before concluding.',
    injection: {
      kind: 'text_prefix',
      textPrefix: safePrefix(
        'skeptical_audit',
        `Adopt a skeptical reviewer mindset. Identify unstated assumptions, missing data, and potential failure modes.
Flag compliance or safety risks and propose mitigations. Keep tone professional and brief.`
      ),
    },
    decoding: { temperature: 0.3, topP: 0.85 },
    tags: ['audit', 'safety'],
    safeDefault: true,
  },
  {
    id: 'concise_exec',
    label: 'Concise Execution',
    description: 'Direct, minimal, action-focused reasoning.',
    injection: {
      kind: 'text_prefix',
      textPrefix: safePrefix(
        'concise_exec',
        `Be succinct and execution-focused. Provide only the necessary reasoning to reach a decision.
Prefer bullet points and numbered steps. Avoid speculative or policy-violating content.`
      ),
    },
    decoding: { temperature: 0.25, topP: 0.85 },
    tags: ['concise', 'ops'],
    safeDefault: true,
  },
  {
    id: 'creative_diverge',
    label: 'Creative Divergence',
    description: 'Generate diverse options before selecting a path.',
    injection: {
      kind: 'text_prefix',
      textPrefix: safePrefix(
        'creative_diverge',
        `Generate multiple distinct approaches first. List at least three options with pros/cons, then choose one.
Stay within safety and policy constraints; avoid sensitive or disallowed content.`
      ),
    },
    decoding: { temperature: 0.6, topP: 0.95 },
    tags: ['creative', 'brainstorm'],
    safeDefault: true,
  },
];

const paletteMap: Map<ReasoningPaletteId, ReasoningPalette> = new Map(
  builtInPalettes.map((p) => [p.id, p]),
);

export function registerPalette(palette: ReasoningPalette): void {
  paletteMap.set(palette.id, palette);
}

export function getPalette(id: ReasoningPaletteId): ReasoningPalette | undefined {
  return paletteMap.get(id);
}

export function listPalettes(): ReasoningPalette[] {
  return Array.from(paletteMap.values());
}

export function loadPalettesFromFile(filePath?: string): void {
  if (!filePath) return;
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) return;
  try {
    const data = JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as ReasoningPalette[];
    data.forEach(registerPalette);
  } catch (err: any) {
    console.warn('Failed to load palettes from config', err);
  }
}

export function resolvePaletteRuntimeConfig(): PaletteRuntimeConfig {
  const enabled = process.env.REASONING_PALETTE_ENABLED === 'true';
  const defaultPaletteId = process.env.REASONING_PALETTE_DEFAULT_ID || 'concise_exec';
  const allowExploration = process.env.REASONING_PALETTE_ALLOW_EXPLORATION === 'true';
  const maxK = Number(process.env.REASONING_PALETTE_MAX_K || 3);
  const allowed = process.env.REASONING_PALETTE_ALLOWED_IDS
    ? process.env.REASONING_PALETTE_ALLOWED_IDS.split(',').map((v) => v.trim()).filter(Boolean)
    : undefined;
  const allowListConfig = process.env.REASONING_PALETTE_TENANT_ALLOWLIST;
  let tenantAllowList: Record<string, ReasoningPaletteId[]> | undefined;
  if (allowListConfig) {
    try {
      tenantAllowList = JSON.parse(allowListConfig);
    } catch (err: any) {
      console.warn('Failed to parse tenant allowlist for palettes', err);
    }
  }

  return {
    enabled,
    defaultPaletteId,
    allowExploration,
    maxK,
    allowedPaletteIds: allowed,
    tenantAllowList,
  };
}

// Load optional external palette catalog at module load for long-lived processes
loadPalettesFromFile(process.env.REASONING_PALETTE_CONFIG_PATH);
