import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type TextAsset = {
  id: string;
  modality: 'text';
  text: string;
};

export type ImageAsset = {
  id: string;
  modality: 'image';
  buffer: Buffer;
};

export type AudioAsset = {
  id: string;
  modality: 'audio';
  pcm: Float32Array | number[];
  sampleRate: number;
};

export type VideoAsset = {
  id: string;
  modality: 'video';
  frames: Buffer[];
};

export type AssetInput = TextAsset | ImageAsset | AudioAsset | VideoAsset;

export type ProvenanceClaim = {
  asset_id: string;
  claim_type: string;
  value: string;
  source?: string;
};

export type ClaimEvidence = {
  claim_type: string;
  value: string;
  source?: string;
};

export type ProvenanceConflict = {
  asset_id: string;
  claims: ClaimEvidence[];
  summary: string;
};

export type Fingerprint = {
  asset_id: string;
  modality: 'text' | 'image' | 'audio' | 'video';
  hash: string;
  vector: number[];
};

export type LinkEvidence = {
  from: string;
  to: string;
  similarity: number;
  evidence: string[];
};

export type ProvenanceNode = {
  id: string;
  kind: string;
  label: string;
  data: unknown;
};

export type ProvenanceEdge = {
  source: string;
  target: string;
  kind: string;
  weight: number;
  evidence: string[];
};

export type ProvenanceGraph = {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  conflicts: ProvenanceConflict[];
};

export type AnalysisResult = {
  fingerprints: Fingerprint[];
  links: LinkEvidence[];
  graph: ProvenanceGraph;
};

export type AnalyzeOptions = {
  /** Override the similarity threshold before sending to CMOL. */
  linkThreshold?: number;
  /** Override the binary path. Defaults to CMOL_BIN env or the release build output. */
  binaryPath?: string;
  /** Environment variables passed to the spawned process. */
  env?: NodeJS.ProcessEnv;
};

const DEFAULT_THRESHOLD = 0.82;

export async function analyzeBundle(
  assets: AssetInput[],
  claims: ProvenanceClaim[] = [],
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  if (!assets.length) {
    throw new Error('CMOL requires at least one asset to analyze');
  }

  const binaryPath = resolve(options.binaryPath ?? process.env.CMOL_BIN ?? defaultBinaryPath());
  if (!existsSync(binaryPath)) {
    throw new Error(
      `CMOL binary not found at ${binaryPath}. Set CMOL_BIN or pass options.binaryPath to analyzeBundle.`
    );
  }

  const request = {
    assets: assets.map(mapAsset),
    claims,
    link_threshold: options.linkThreshold ?? DEFAULT_THRESHOLD,
  };

  const stdout = await runBinary(binaryPath, request, options.env);
  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(stdout) as AnalysisResult;
  } catch (error) {
    throw new Error(`Failed to parse CMOL output: ${(error as Error).message}\n${stdout}`);
  }

  return parsed;
}

export function defaultBinaryPath(): string {
  return join(__dirname, '../../../../cmol/target/release/cmol');
}

function mapAsset(asset: AssetInput) {
  switch (asset.modality) {
    case 'text':
      return {
        id: asset.id,
        modality: 'text',
        payload: {
          type: 'text',
          text: asset.text,
        },
      };
    case 'image':
      return {
        id: asset.id,
        modality: 'image',
        payload: {
          type: 'image',
          data: asset.buffer.toString('base64'),
        },
      };
    case 'audio':
      return {
        id: asset.id,
        modality: 'audio',
        payload: {
          type: 'audio',
          pcm_base64: float32ToBase64(asset.pcm),
          sample_rate: asset.sampleRate,
        },
      };
    case 'video':
      return {
        id: asset.id,
        modality: 'video',
        payload: {
          type: 'video',
          frames: asset.frames.map((frame) => frame.toString('base64')),
        },
      };
    default: {
      const never: never = asset;
      return never;
    }
  }
}

function float32ToBase64(values: Float32Array | number[]): string {
  const array = values instanceof Float32Array ? values : Float32Array.from(values);
  const buffer = Buffer.alloc(array.length * 4);
  array.forEach((value, index) => {
    buffer.writeFloatLE(value, index * 4);
  });
  return buffer.toString('base64');
}

function runBinary(binaryPath: string, payload: unknown, env?: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(binaryPath, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`CMOL exited with code ${code}: ${stderr}`));
        return;
      }
      resolvePromise(stdout.trim());
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
