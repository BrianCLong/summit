
import { createHash } from 'crypto';
import { PolicyCompiler } from '../policy/compiler.js';
import { policyStore } from '../policy/store.js';
import { trace } from '@opentelemetry/api';

export interface ProvenanceManifest {
  version: string;
  generatedAt: string;
  targetId: string;
  purpose: string;

  // Inputs
  inputs: {
    id: string;
    hash: string;
  }[];

  // Policy Proof
  policy: {
    irHash: string;
    activePolicies: string[];
    clausesUsed: string[];
    compilerVersion: string;
  };

  // Merkle Root of the above
  manifestHash: string;
}

export async function generateManifest(targetId: string, purpose: string, inputs: any[]): Promise<ProvenanceManifest> {
  const tracer = trace.getTracer('provenance');
  return tracer.startActiveSpan('export.manifest.write', async (span) => {

    // 1. Get Policies & Compile
    const policies = policyStore.getActivePoliciesForTarget(targetId);
    const compiler = PolicyCompiler.getInstance();
    const ir = compiler.compile(policies);

    // 2. Construct Manifest
    const manifest: ProvenanceManifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      targetId,
      purpose,
      inputs: inputs.map(i => ({ id: i.id, hash: hashContent(i) })),
      policy: {
        irHash: ir.hash,
        activePolicies: ir.activePolicies,
        clausesUsed: ir.clausesUsed,
        compilerVersion: ir.version
      },
      manifestHash: ''
    };

    // 3. Compute Merkle Root / Manifest Hash
    const contentToHash = { ...manifest, manifestHash: undefined };
    manifest.manifestHash = hashContent(contentToHash);

    span.setAttribute('manifest.hash', manifest.manifestHash);
    span.end();

    return manifest;
  });
}

function hashContent(content: any): string {
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
