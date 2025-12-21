import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash, generateKeyPairSync } from 'crypto';
import {
  VerificationError,
  buildAndSignFromPackage,
  verifyEvidenceBundle,
  persistAllowlist,
  PolicyOptions,
} from '../../tools/prov/verify';

function writeTempPackage(deps: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-pkg-'));
  const pkgPath = path.join(dir, 'package.json');
  fs.writeFileSync(
    pkgPath,
    JSON.stringify(
      {
        name: 'pilot-service',
        version: '1.0.0',
        dependencies: deps,
      },
      null,
      2,
    ),
    'utf8',
  );
  return pkgPath;
}

function buildPolicy(requiredPermissions: string[]): PolicyOptions {
  return {
    allowedBuilders: ['github-actions'],
    allowedIssuers: ['https://token.actions.githubusercontent.com'],
    requiredPermissions,
    freezeWindows: [],
    requireComponents: true,
  };
}

describe('supply chain evidence verification', () => {
  const keyPair = generateKeyPairSync('ed25519');
  const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const digest = `sha256:${createHash('sha256').update('pilot-image').digest('hex')}`;
  const permissions = ['contents:read', 'id-token:write'];

  it('verifies a fully populated evidence bundle', () => {
    const pkgPath = writeTempPackage({ lodash: '4.17.21' });
    const bundle = buildAndSignFromPackage(
      pkgPath,
      'pilot-service',
      '1.2.3',
      digest,
      'github-actions',
      'intelgraph/pilot',
      'refs/heads/main',
      '.github/workflows/pilot.yml',
      permissions,
      'pilot-ci@intelgraph',
      privateKey,
    );

    const result = verifyEvidenceBundle(bundle, {
      ...buildPolicy(permissions),
      expectedDigest: digest,
    });

    expect(result.checks).toEqual(['sbom', 'provenance', 'signature', 'policy']);
  });

  it('blocks deployments during freeze windows', () => {
    const pkgPath = writeTempPackage({ axios: '1.11.0' });
    const bundle = buildAndSignFromPackage(
      pkgPath,
      'pilot-service',
      '1.2.3',
      digest,
      'github-actions',
      'intelgraph/pilot',
      'refs/heads/main',
      '.github/workflows/pilot.yml',
      permissions,
      'pilot-ci@intelgraph',
      privateKey,
    );

    expect(() =>
      verifyEvidenceBundle(bundle, {
        ...buildPolicy(permissions),
        freezeWindows: [
          {
            start: bundle.signedAt,
            end: new Date(Date.parse(bundle.signedAt) + 1000).toISOString(),
            reason: 'release freeze',
          },
        ],
      }),
    ).toThrow(VerificationError);
  });

  it('honors allowlist entries with expiry', () => {
    const pkgPath = writeTempPackage({ express: '4.18.2' });
    const bundle = buildAndSignFromPackage(
      pkgPath,
      'pilot-service',
      '1.2.3',
      digest,
      'github-actions',
      'intelgraph/pilot',
      'refs/heads/main',
      '.github/workflows/pilot.yml',
      permissions,
      'pilot-ci@intelgraph',
      privateKey,
    );

    const allowlistPath = persistAllowlist(
      [
        {
          digest,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          owner: 'security',
          reason: 'approved hotfix',
        },
      ],
      os.tmpdir(),
    );

    const result = verifyEvidenceBundle(bundle, {
      ...buildPolicy(permissions),
      expectedDigest: digest,
      allowlistPath,
    });

    expect(result.checks).toEqual(['allowlist-bypass']);
  });

  it('fails when required permissions are missing', () => {
    const pkgPath = writeTempPackage({ axios: '1.11.0' });
    const bundle = buildAndSignFromPackage(
      pkgPath,
      'pilot-service',
      '1.2.3',
      digest,
      'github-actions',
      'intelgraph/pilot',
      'refs/heads/main',
      '.github/workflows/pilot.yml',
      ['contents:read'],
      'pilot-ci@intelgraph',
      privateKey,
    );

    expect(() =>
      verifyEvidenceBundle(bundle, {
        ...buildPolicy(permissions),
        expectedDigest: digest,
      }),
    ).toThrow(VerificationError);
  });
});
