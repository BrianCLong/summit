import { stableHash } from './stableHash.js';
import type { Layer } from './types.js';

export function computeRoot(layers: Layer[]): string {
  // H_root = H( H_toolchain || H_source || H_deps || H_env || H_steps || H_artifacts )
  // Ensure order
  const order: Layer['name'][] = ['toolchain', 'source', 'deps', 'env', 'steps', 'artifacts'];

  const orderedLayers = order.map(name => {
    const layer = layers.find(l => l.name === name);
    if (!layer) throw new Error(`Missing layer: ${name}`);
    return layer;
  });

  const buffers = orderedLayers.map(l => Buffer.from(`${l.name}:${l.digest}`));
  return stableHash(buffers);
}
