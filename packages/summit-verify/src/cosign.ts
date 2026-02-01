import { spawnSync } from 'child_process';

export interface VerifyOptions {
  key?: string;
  certificateIdentity?: string;
  certificateOidcIssuer?: string;
  bundlePath?: string;
}

export function verifyAttestation(params: {
  imageRef: string;
  predicateType: string;
  options?: VerifyOptions;
}): string {
  const { imageRef, predicateType, options } = params;
  const args = ['verify-attestation', '--type', predicateType];

  if (options?.key) {
    args.push('--key', options.key);
  } else if (options?.certificateIdentity && options?.certificateOidcIssuer) {
    args.push('--certificate-identity', options.certificateIdentity);
    args.push('--certificate-oidc-issuer', options.certificateOidcIssuer);
  } else {
    // Default to lax mode for testing, should be tightened in production
    args.push('--certificate-identity-regexp', '.*');
    args.push('--certificate-oidc-issuer', 'https://token.actions.githubusercontent.com');
  }

  if (options?.bundlePath) {
    args.push('--bundle', options.bundlePath);
  }

  args.push(imageRef);

  console.log(`Running: cosign ${args.join(' ')}`);
  const result = spawnSync('cosign', args, { encoding: 'utf-8' });

  if (result.status !== 0) {
    throw new Error(`cosign verify-attestation failed with status ${result.status}: ${result.stderr}`);
  }

  return result.stdout;
}
