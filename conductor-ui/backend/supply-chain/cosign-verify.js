import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CosignVerifier {
  constructor(options = {}) {
    this.cosignBinary = options.cosignBinary || 'cosign';
    this.publicKeyPath =
      options.publicKeyPath || process.env.COSIGN_PUBLIC_KEY_PATH;
    this.rekorUrl = options.rekorUrl || 'https://rekor.sigstore.dev';
    this.fulcioUrl = options.fulcioUrl || 'https://fulcio.sigstore.dev';
    this.oidcIssuer = options.oidcIssuer || 'https://oauth2.sigstore.dev/auth';
    this.enableExperimental = options.enableExperimental || true;
  }

  async verifyImage(imageRef, options = {}) {
    const {
      publicKey = this.publicKeyPath,
      certificate,
      certificateChain,
      signature,
      bundle,
      skipTlogVerify = false,
      skipCertVerify = false,
      allowInsecure = false,
      annotations = {},
      claims,
      issuer,
      subject,
    } = options;

    try {
      const args = ['verify'];

      // Authentication method
      if (publicKey && fs.existsSync(publicKey)) {
        args.push('--key', publicKey);
      } else if (certificate) {
        args.push('--certificate', certificate);
        if (certificateChain) {
          args.push('--certificate-chain', certificateChain);
        }
      } else {
        // Use keyless verification with certificate identity
        args.push('--certificate-identity-regexp', '.*');
        args.push('--certificate-oidc-issuer-regexp', '.*');
      }

      // Rekor transparency log
      if (!skipTlogVerify) {
        args.push('--rekor-url', this.rekorUrl);
      } else {
        args.push('--insecure-ignore-tlog');
      }

      // Certificate verification
      if (skipCertVerify) {
        args.push('--insecure-ignore-sct');
      }

      // Signature bundle
      if (bundle) {
        args.push('--bundle', bundle);
      }

      // Signature file
      if (signature) {
        args.push('--signature', signature);
      }

      // Issuer and subject for keyless verification
      if (issuer) {
        args.push('--certificate-oidc-issuer', issuer);
      }

      if (subject) {
        args.push('--certificate-identity', subject);
      }

      // Annotations
      for (const [key, value] of Object.entries(annotations)) {
        args.push('--annotations', `${key}=${value}`);
      }

      // Allow insecure registry
      if (allowInsecure) {
        args.push('--allow-insecure-registry');
      }

      // Output format
      args.push('--output', 'json');

      // Image reference
      args.push(imageRef);

      const result = await this.executeCosign(args);

      return {
        verified: true,
        imageRef,
        signatures: result.signatures || [],
        certificates: result.certificates || [],
        bundleVerified: result.bundleVerified || false,
        tlogEntries: result.tlogEntries || [],
        timestamp: new Date().toISOString(),
        cosignVersion: await this.getCosignVersion(),
      };
    } catch (error) {
      return {
        verified: false,
        imageRef,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyAttestation(imageRef, attestationType, options = {}) {
    const {
      publicKey = this.publicKeyPath,
      policy,
      type = attestationType || 'slsaprovenance',
    } = options;

    try {
      const args = ['verify-attestation'];

      if (publicKey && fs.existsSync(publicKey)) {
        args.push('--key', publicKey);
      } else {
        args.push('--certificate-identity-regexp', '.*');
        args.push('--certificate-oidc-issuer-regexp', '.*');
      }

      args.push('--type', type);
      args.push('--output', 'json');

      if (policy) {
        args.push('--policy', policy);
      }

      args.push(imageRef);

      const result = await this.executeCosign(args);

      return {
        verified: true,
        imageRef,
        attestationType: type,
        attestations: result.attestations || [],
        policyResult: result.policyResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        verified: false,
        imageRef,
        attestationType: type,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async generateSBOM(imageRef, format = 'spdx-json') {
    try {
      const args = [
        'download',
        'sbom',
        '--output-file',
        '-',
        '--format',
        format,
        imageRef,
      ];
      const result = await this.executeCosign(args, { encoding: 'utf8' });

      return {
        success: true,
        imageRef,
        format,
        sbom: JSON.parse(result),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        imageRef,
        format,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async downloadAttestation(imageRef, predicateType) {
    try {
      const args = [
        'download',
        'attestation',
        '--predicate-type',
        predicateType,
        imageRef,
      ];
      const result = await this.executeCosign(args, { encoding: 'utf8' });

      const attestations = result
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

      return {
        success: true,
        imageRef,
        predicateType,
        attestations,
        count: attestations.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        imageRef,
        predicateType,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async signImage(imageRef, options = {}) {
    const {
      keyPath,
      passphrase,
      annotations = {},
      recursive = false,
      allowInsecure = false,
    } = options;

    try {
      const args = ['sign'];

      if (keyPath) {
        args.push('--key', keyPath);
      } else {
        // Use keyless signing
        args.push('--fulcio-url', this.fulcioUrl);
        args.push('--rekor-url', this.rekorUrl);
        args.push('--oidc-issuer', this.oidcIssuer);
      }

      // Annotations
      for (const [key, value] of Object.entries(annotations)) {
        args.push('-a', `${key}=${value}`);
      }

      if (recursive) {
        args.push('--recursive');
      }

      if (allowInsecure) {
        args.push('--allow-insecure-registry');
      }

      args.push(imageRef);

      const result = await this.executeCosign(args, {
        env: passphrase
          ? { ...process.env, COSIGN_PASSWORD: passphrase }
          : process.env,
      });

      return {
        success: true,
        imageRef,
        signature: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        imageRef,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async attachSBOM(imageRef, sbomPath, options = {}) {
    const { type = 'spdx', allowInsecure = false } = options;

    try {
      const args = ['attach', 'sbom', '--sbom', sbomPath, '--type', type];

      if (allowInsecure) {
        args.push('--allow-insecure-registry');
      }

      args.push(imageRef);

      await this.executeCosign(args);

      return {
        success: true,
        imageRef,
        sbomPath,
        type,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        imageRef,
        sbomPath,
        type,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async attestSLSA(imageRef, provenancePath, options = {}) {
    const { keyPath, type = 'slsaprovenance', allowInsecure = false } = options;

    try {
      const args = ['attest'];

      if (keyPath) {
        args.push('--key', keyPath);
      } else {
        args.push('--fulcio-url', this.fulcioUrl);
        args.push('--rekor-url', this.rekorUrl);
        args.push('--oidc-issuer', this.oidcIssuer);
      }

      args.push('--predicate', provenancePath);
      args.push('--type', type);

      if (allowInsecure) {
        args.push('--allow-insecure-registry');
      }

      args.push(imageRef);

      await this.executeCosign(args);

      return {
        success: true,
        imageRef,
        provenancePath,
        type,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        imageRef,
        provenancePath,
        type,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async executeCosign(args, options = {}) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        COSIGN_EXPERIMENTAL: this.enableExperimental ? '1' : '0',
        ...options.env,
      };

      const child = spawn(this.cosignBinary, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse as JSON first
            const result = JSON.parse(stdout);
            resolve(result);
          } catch {
            // If not JSON, return as string
            resolve(stdout.trim());
          }
        } else {
          reject(
            new Error(`Cosign command failed (exit code ${code}): ${stderr}`),
          );
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn cosign: ${error.message}`));
      });
    });
  }

  async getCosignVersion() {
    try {
      const result = await this.executeCosign(['version', '--json']);
      return result.gitVersion || result.version;
    } catch {
      return 'unknown';
    }
  }

  async checkCosignInstallation() {
    try {
      await this.getCosignVersion();
      return {
        installed: true,
        version: await this.getCosignVersion(),
        path: this.cosignBinary,
      };
    } catch (error) {
      return {
        installed: false,
        error: error.message,
        path: this.cosignBinary,
      };
    }
  }

  // Policy evaluation helpers
  static createPolicy(rules) {
    const policy = {
      apiVersion: 'v1alpha1',
      kind: 'Policy',
      metadata: {
        name: 'maestro-supply-chain-policy',
      },
      spec: {
        requirements: [],
      },
    };

    // Add signature requirement
    if (rules.requireSignature !== false) {
      policy.spec.requirements.push({
        pattern: '*',
        authorities: rules.authorities || [
          {
            keyless: {
              url: 'https://fulcio.sigstore.dev',
              identities: rules.identities || [
                {
                  issuer: 'https://accounts.google.com',
                  subject: '*',
                },
              ],
            },
          },
        ],
      });
    }

    // Add attestation requirements
    if (rules.requireAttestations) {
      for (const attestation of rules.requireAttestations) {
        policy.spec.requirements.push({
          pattern: '*',
          attestations: [
            {
              name: attestation.name || attestation.type,
              predicateType: attestation.predicateType,
              policy: attestation.policy || {
                type: 'cue',
                data: attestation.cuePolicy || 'true',
              },
            },
          ],
        });
      }
    }

    return policy;
  }

  static generateSLSAProvenance(buildInfo) {
    return {
      _type: 'https://in-toto.io/Statement/v0.1',
      subject: [
        {
          name: buildInfo.artifact,
          digest: buildInfo.digest,
        },
      ],
      predicateType: 'https://slsa.dev/provenance/v0.2',
      predicate: {
        builder: {
          id: buildInfo.builderId || 'https://github.com/actions/runner',
        },
        buildType: buildInfo.buildType || 'https://github.com/actions/workflow',
        invocation: {
          configSource: {
            uri: buildInfo.sourceUri,
            digest: buildInfo.sourceDigest,
            entryPoint: buildInfo.entryPoint || '.github/workflows/build.yml',
          },
          parameters: buildInfo.parameters || {},
          environment: buildInfo.environment || {},
        },
        metadata: {
          buildInvocationId: buildInfo.buildId || crypto.randomUUID(),
          buildStartedOn: buildInfo.startTime || new Date().toISOString(),
          buildFinishedOn: buildInfo.endTime || new Date().toISOString(),
          completeness: {
            parameters: true,
            environment: true,
            materials: true,
          },
          reproducible: buildInfo.reproducible || false,
        },
        materials: buildInfo.materials || [],
      },
    };
  }
}

// Express.js middleware for supply chain verification
export const supplyChainMiddleware = (options = {}) => {
  const verifier = new CosignVerifier(options);

  return async (req, res, next) => {
    // Add supply chain verification methods to request
    req.supplyChain = {
      verify: (imageRef, opts) => verifier.verifyImage(imageRef, opts),
      verifyAttestation: (imageRef, type, opts) =>
        verifier.verifyAttestation(imageRef, type, opts),
      getSBOM: (imageRef, format) => verifier.generateSBOM(imageRef, format),
      getAttestation: (imageRef, predicate) =>
        verifier.downloadAttestation(imageRef, predicate),
    };

    next();
  };
};

export default CosignVerifier;
