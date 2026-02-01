import { spawnSync } from 'child_process';

export interface CosignOptions {
  key?: string;
  allowKeyless?: boolean;
  registry?: string;
}

export function attestArtifact(params: {
  imageRef: string;
  predicatePath: string;
  predicateType: string;
  options?: CosignOptions;
}) {
  const { imageRef, predicatePath, predicateType, options } = params;
  const args = [
    'attest',
    '--predicate',
    predicatePath,
    '--type',
    predicateType,
  ];

  if (options?.key) {
    args.push('--key', options.key);
  } else if (options?.allowKeyless) {
    args.push('--yes');
  } else {
    throw new Error(
      'Neither key nor keyless signing enabled for cosign attest'
    );
  }

  args.push(imageRef);

  console.log(`Running: cosign ${args.join(' ')}`);
  const result = spawnSync('cosign', args, { stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error(`cosign attest failed with status ${result.status}`);
  }
}
