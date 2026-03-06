import { buildManifest, ContextManifest } from './builder.mjs';

export interface ContextReport {
  sessionId: string;
  timestamp: string;
  loaded: {
    id: string;
    layer: string;
    path: string;
    reason: string;
    provenance: string;
  }[];
  budget: {
    totalChars: number;
    limitChars: number;
    status: 'ok' | 'warn' | 'exceeded';
  };
}

export function generateReport(requestedPaths: string[] = []): ContextReport {
  const manifest = buildManifest();
  const loaded: ContextReport['loaded'] = [];
  let totalChars = 0;
  const LIMIT_CHARS = 200000; // 200k char limit

  // 1. Always load Guidance
  Object.values(manifest.files).filter(f => f.layer === 'guidance').forEach(f => {
    loaded.push({
      id: f.id,
      layer: f.layer,
      path: f.path,
      reason: 'Mandatory Guidance',
      provenance: f.hash
    });
    totalChars += f.size;
  });

  // 2. Load Requested
  for (const req of requestedPaths) {
    const file = Object.values(manifest.files).find(f => f.path.includes(req));
    if (file && !loaded.find(l => l.id === file.id)) {
      loaded.push({
        id: file.id,
        layer: file.layer,
        path: file.path,
        reason: 'Requested Instruction',
        provenance: file.hash
      });
      totalChars += file.size;
    }
  }

  return {
    sessionId: `SES-${Date.now()}`,
    timestamp: new Date().toISOString(),
    loaded,
    budget: {
      totalChars,
      limitChars: LIMIT_CHARS,
      status: totalChars > LIMIT_CHARS ? 'exceeded' : totalChars > (LIMIT_CHARS * 0.8) ? 'warn' : 'ok'
    }
  };
}
