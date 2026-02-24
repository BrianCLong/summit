type ValidationOutput = {
  errors: string[];
  warnings: string[];
  counts: {
    tools: number;
    resources: number;
    prompts: number;
  };
};

const TOOL_ALLOWED_FIELDS = new Set(['name', 'description', 'scopes']);
const RESOURCE_ALLOWED_FIELDS = new Set(['name', 'description', 'version']);
const PROMPT_ALLOWED_FIELDS = new Set(['name', 'description', 'version']);

export async function run(ctx: { endpoint: string; token?: string }) {
  const headers = ctx.token
    ? { Authorization: `Bearer ${ctx.token}` }
    : undefined;
  try {
    const [toolsRes, resourcesRes, promptsRes] = await Promise.all([
      fetch(`${ctx.endpoint}/.well-known/mcp-tools`, { headers }),
      fetch(`${ctx.endpoint}/.well-known/mcp-resources`, { headers }),
      fetch(`${ctx.endpoint}/.well-known/mcp-prompts`, { headers }),
    ]);

    if (!toolsRes.ok || !resourcesRes.ok || !promptsRes.ok) {
      return {
        name: 'schema',
        pass: false,
        status: {
          tools: toolsRes.status,
          resources: resourcesRes.status,
          prompts: promptsRes.status,
        },
        reason: 'discovery-endpoints-unavailable',
      };
    }

    const [tools, resources, prompts] = await Promise.all([
      toolsRes.json(),
      resourcesRes.json(),
      promptsRes.json(),
    ]);

    const output = validateDiscoveryPayloads({ tools, resources, prompts });
    return {
      name: 'schema',
      pass: output.errors.length === 0,
      details: output,
    };
  } catch (error) {
    return { name: 'schema', pass: false, error: String(error) };
  }
}

export function validateDiscoveryPayloads(payloads: {
  tools: unknown;
  resources: unknown;
  prompts: unknown;
}): ValidationOutput {
  const errors: string[] = [];
  const warnings: string[] = [];

  const tools = validateEntries(payloads.tools, 'tools', errors);
  const resources = validateEntries(payloads.resources, 'resources', errors);
  const prompts = validateEntries(payloads.prompts, 'prompts', errors);

  validateTools(tools, errors, warnings);
  validateResources(resources, errors, warnings);
  validatePrompts(prompts, errors, warnings);

  return {
    errors,
    warnings,
    counts: {
      tools: tools.length,
      resources: resources.length,
      prompts: prompts.length,
    },
  };
}

function validateEntries(
  input: unknown,
  label: 'tools' | 'resources' | 'prompts',
  errors: string[],
): Record<string, unknown>[] {
  if (!Array.isArray(input)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const item = input[i];
    if (!isRecord(item)) {
      errors.push(`${label}[${i}] must be an object`);
      continue;
    }
    out.push(item);
  }
  return out;
}

function validateTools(
  tools: Record<string, unknown>[],
  errors: string[],
  warnings: string[],
) {
  const seen = new Set<string>();
  for (let i = 0; i < tools.length; i += 1) {
    const entry = tools[i];
    const name = entry.name;
    if (typeof name !== 'string' || name.length === 0) {
      errors.push(`tools[${i}].name must be a non-empty string`);
      continue;
    }
    if (seen.has(name)) {
      errors.push(`tools duplicate name: ${name}`);
    }
    seen.add(name);

    if (
      entry.description !== undefined &&
      typeof entry.description !== 'string'
    ) {
      errors.push(`tools[${i}].description must be a string`);
    }
    if (entry.scopes !== undefined) {
      if (!Array.isArray(entry.scopes)) {
        errors.push(`tools[${i}].scopes must be an array of strings`);
      } else if (entry.scopes.some((scope) => typeof scope !== 'string')) {
        errors.push(`tools[${i}].scopes must contain only strings`);
      }
    }
    collectUnknownFields(entry, TOOL_ALLOWED_FIELDS, `tools[${i}]`, warnings);
  }
}

function validateResources(
  resources: Record<string, unknown>[],
  errors: string[],
  warnings: string[],
) {
  const seen = new Set<string>();
  for (let i = 0; i < resources.length; i += 1) {
    const entry = resources[i];
    const name = entry.name;
    if (typeof name !== 'string' || name.length === 0) {
      errors.push(`resources[${i}].name must be a non-empty string`);
      continue;
    }
    if (seen.has(name)) {
      errors.push(`resources duplicate name: ${name}`);
    }
    seen.add(name);

    if (
      entry.description !== undefined &&
      typeof entry.description !== 'string'
    ) {
      errors.push(`resources[${i}].description must be a string`);
    }
    if (entry.version !== undefined && typeof entry.version !== 'string') {
      errors.push(`resources[${i}].version must be a string`);
    }
    collectUnknownFields(
      entry,
      RESOURCE_ALLOWED_FIELDS,
      `resources[${i}]`,
      warnings,
    );
  }
}

function validatePrompts(
  prompts: Record<string, unknown>[],
  errors: string[],
  warnings: string[],
) {
  const seen = new Set<string>();
  for (let i = 0; i < prompts.length; i += 1) {
    const entry = prompts[i];
    const name = entry.name;
    if (typeof name !== 'string' || name.length === 0) {
      errors.push(`prompts[${i}].name must be a non-empty string`);
      continue;
    }
    if (seen.has(name)) {
      errors.push(`prompts duplicate name: ${name}`);
    }
    seen.add(name);

    if (typeof entry.version !== 'string' || entry.version.length === 0) {
      errors.push(`prompts[${i}].version must be a non-empty string`);
    }
    if (
      entry.description !== undefined &&
      typeof entry.description !== 'string'
    ) {
      errors.push(`prompts[${i}].description must be a string`);
    }
    collectUnknownFields(entry, PROMPT_ALLOWED_FIELDS, `prompts[${i}]`, warnings);
  }
}

function collectUnknownFields(
  entry: Record<string, unknown>,
  allowed: Set<string>,
  label: string,
  warnings: string[],
) {
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) {
      warnings.push(`${label} contains forward-compatible field "${key}"`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
