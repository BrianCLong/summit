/**
 * scripts/release/lib/attestations.mjs
 * 
 * Library for generating SLSA and SBOM attestations.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function generateSlsaProvenance(checksums, builderId = 'https://github.com/brianlong/summit/.github/workflows/release-ga-pipeline.yml') {
    return {
        _type: 'https://in-toto.io/Statement/v0.1',
        subject: Object.entries(checksums).map(([file, hash]) => ({
            name: file,
            digest: { sha256: hash }
        })),
        predicateType: 'https://slsa.dev/provenance/v0.2',
        predicate: {
            builder: { id: builderId },
            buildType: 'https://github.com/brianlong/summit/build/v1',
            invocation: {
                configSource: {
                    uri: 'git+https://github.com/brianlong/summit',
                    digest: { sha1: process.env.GITHUB_SHA || 'UNKNOWN' },
                    entryPoint: 'scripts/release/generate_evidence_bundle.mjs'
                },
                parameters: {
                    details: 'Automated release build'
                }
            },
            metadata: {
                buildStartedOn: new Date().toISOString(),
                completeness: {
                    parameters: true,
                    environment: true,
                    materials: false
                },
                reproducible: true
            }
        }
    };
}

export function generateSbomAttestation(sbomPath, sbomHash) {
    return {
        _type: 'https://in-toto.io/Statement/v0.1',
        subject: [{
            name: path.basename(sbomPath),
            digest: { sha256: sbomHash }
        }],
        predicateType: 'https://spdx.dev/Document',
        predicate: {
            spdxVersion: 'SPDX-2.3',
            dataLicense: 'CC0-1.0',
            SPDXID: 'SPDXRef-DOCUMENT',
            name: 'Summit Release Bundle',
            documentNamespace: 'http://spdx.org/spdxdocs/summit-release-bundle-' + crypto.randomUUID()
        }
    };
}
