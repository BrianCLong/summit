import { createHash } from 'crypto';
export function stepCacheKey({
  pluginDigest,
  inputDigests,
  params,
}: {
  pluginDigest: string;
  inputDigests: string[];
  params: any;
}) {
  const h = createHash('sha256');
  h.update(pluginDigest);
  for (const d of [...inputDigests].sort()) h.update('|' + d);
  h.update('|' + JSON.stringify(params ?? {}));
  return 'sha256:' + h.digest('hex');
}
