import crypto from 'node:crypto';

export interface DesignRequest {
  prompt: string;
  screens?: number;
  model?: string;
}

export interface DesignScreen {
  id: string;
  name: string;
  description?: string;
}

export interface DesignArtifact {
  designId: string;
  screens: DesignScreen[];
  assetsPath: string;
  provider: 'design-mcp';
}

export interface GenerateDesignOptions {
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
  requireFeatureFlag?: boolean;
}

interface DesignMcpResponse {
  designId?: string;
  assetsPath?: string;
  screens?: unknown;
}

function toBooleanFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function resolveDesignId(prompt: string, responseDesignId?: string): string {
  if (responseDesignId && /^[a-z0-9][a-z0-9-]{2,63}$/i.test(responseDesignId)) {
    return responseDesignId;
  }

  const digest = crypto
    .createHash('sha256')
    .update(prompt)
    .digest('hex')
    .slice(0, 12)
    .toLowerCase();

  return `design-${digest}`;
}

function parseScreens(payload: unknown): DesignScreen[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((candidate, index) => {
      if (!candidate || typeof candidate !== 'object') {
        return null;
      }

      const maybeId = (candidate as { id?: unknown }).id;
      const maybeName = (candidate as { name?: unknown }).name;
      const maybeDescription = (candidate as { description?: unknown }).description;

      const fallbackId = `screen-${String(index + 1).padStart(2, '0')}`;
      const id = typeof maybeId === 'string' && maybeId.trim() ? maybeId.trim() : fallbackId;
      const name = typeof maybeName === 'string' && maybeName.trim() ? maybeName.trim() : `Screen ${index + 1}`;
      const description =
        typeof maybeDescription === 'string' && maybeDescription.trim()
          ? maybeDescription.trim()
          : undefined;

      return {
        id,
        name,
        ...(description ? { description } : {}),
      };
    })
    .filter((screen): screen is DesignScreen => screen !== null);
}

/**
 * Generate a design artifact through the configured Design MCP provider.
 * This function enforces an explicit API key and feature-flag default OFF.
 */
export async function generateDesign(
  req: DesignRequest,
  options: GenerateDesignOptions = {},
): Promise<DesignArtifact> {
  if (!req.prompt || !req.prompt.trim()) {
    throw new Error('Design request prompt is required.');
  }

  const requireFeatureFlag = options.requireFeatureFlag ?? true;
  const featureFlagEnabled = toBooleanFlag(process.env.DESIGN_MCP_ENABLED);
  if (requireFeatureFlag && !featureFlagEnabled) {
    throw new Error('Design MCP is disabled. Set DESIGN_MCP_ENABLED=true to enable it.');
  }

  const apiKey = process.env.DESIGN_MCP_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DESIGN_MCP_API_KEY environment variable.');
  }

  const fetcher = options.fetcher ?? globalThis.fetch;
  if (typeof fetcher !== 'function') {
    throw new Error('No fetch implementation available for Design MCP requests.');
  }

  const apiBaseUrl = (options.apiBaseUrl ?? process.env.DESIGN_MCP_BASE_URL ?? 'https://design-mcp.invalid').replace(
    /\/$/,
    '',
  );

  const response = await fetcher(`${apiBaseUrl}/v1/designs:generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      prompt: req.prompt,
      screens: req.screens ?? 1,
      ...(req.model ? { model: req.model } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Design MCP request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as DesignMcpResponse;
  const screens = parseScreens(payload.screens);
  const designId = resolveDesignId(req.prompt, payload.designId);
  const assetsPath =
    typeof payload.assetsPath === 'string' && payload.assetsPath.trim()
      ? payload.assetsPath.trim()
      : `artifacts/ui-design/${designId}`;

  return {
    designId,
    screens,
    assetsPath,
    provider: 'design-mcp',
  };
}
