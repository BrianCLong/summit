import { verifySignature } from './verify';

export interface PluginCapability {
  readGraph?(query: string): Promise<any>;
  export?(type: 'splunk' | 's3', payload: any): Promise<void>;
}

export interface PluginManifest {
  name: string;
  version: string;
  capabilities: string[];
  signature: string;
  sbomDigest: string;
}

export class PluginHost {
  async load(manifest: PluginManifest, filePath: string) {
    await verifySignature(manifest, filePath);
    return { manifest };
  }
}
