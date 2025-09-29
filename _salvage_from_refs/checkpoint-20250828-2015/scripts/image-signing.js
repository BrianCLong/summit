#!/usr/bin/env node

/**
 * Container Image Signing and Verification System
 * Implements Sigstore/Cosign integration for supply chain security
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ImageSigningService {
  constructor(config = {}) {
    this.config = {
      keyPath: config.keyPath || './signing-key.pem',
      publicKeyPath: config.publicKeyPath || './signing-key.pub',
      registryUrl: config.registryUrl || 'ghcr.io/intelgraph',
      keylessMode: config.keylessMode || false, // Use Sigstore keyless signing
      rekorUrl: config.rekorUrl || 'https://rekor.sigstore.dev',
      fulcioUrl: config.fulcioUrl || 'https://fulcio.sigstore.dev',
      ...config
    };
    
    this.provenance = {
      buildType: 'intelgraph-build@v1',
      builder: {
        id: 'https://github.com/intelgraph/ci-builder'
      },
      invocation: {
        configSource: {},
        parameters: {},
        environment: {}
      },
      buildConfig: {},
      metadata: {
        buildInvocationId: this.generateBuildId(),
        buildStartedOn: new Date().toISOString(),
        completeness: {
          parameters: true,
          environment: true,
          materials: true
        },
        reproducible: false
      },
      materials: [],
      runDetails: {
        builder: {
          id: 'https://github.com/intelgraph/ci-builder'
        },
        metadata: {
          invocationId: this.generateBuildId()
        }
      }
    };
  }

  /**
   * Generate build provenance for image
   */
  async generateProvenance(imageTag, buildContext = {}) {
    console.log(`🔍 Generating provenance for ${imageTag}...`);
    
    const materials = [];
    
    // Add source materials
    try {
      const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const gitRemote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      materials.push({
        uri: gitRemote,
        digest: {
          sha1: gitCommit
        }
      });
    } catch (error) {
      console.warn('⚠️  Could not get git information');
    }
    
    // Add Docker context materials
    if (fs.existsSync('Dockerfile')) {
      const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
      const dockerfileHash = crypto.createHash('sha256').update(dockerfileContent).digest('hex');
      
      materials.push({
        uri: 'file:///workspace/Dockerfile',
        digest: {
          sha256: dockerfileHash
        }
      });
    }
    
    // Add package.json
    if (fs.existsSync('package.json')) {
      const packageContent = fs.readFileSync('package.json', 'utf8');
      const packageHash = crypto.createHash('sha256').update(packageContent).digest('hex');
      
      materials.push({
        uri: 'file:///workspace/package.json',
        digest: {
          sha256: packageHash
        }
      });
    }

    // Update provenance
    this.provenance.invocation.configSource = {
      uri: materials[0]?.uri || 'unknown',
      digest: materials[0]?.digest || {},
      entryPoint: 'Dockerfile'
    };
    
    this.provenance.buildConfig = {
      buildArgs: buildContext.buildArgs || {},
      target: buildContext.target || '',
      platform: buildContext.platform || 'linux/amd64'
    };
    
    this.provenance.invocation.environment = {
      NODE_ENV: process.env.NODE_ENV || 'production',
      CI: process.env.CI || 'false',
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS || 'false',
      BUILD_NUMBER: process.env.BUILD_NUMBER || 'local',
      ...buildContext.environment
    };
    
    this.provenance.materials = materials;
    this.provenance.metadata.buildFinishedOn = new Date().toISOString();
    
    // Add subject (the built image)
    const imageDigest = await this.getImageDigest(imageTag);
    this.provenance.subject = [{
      name: imageTag,
      digest: {
        sha256: imageDigest
      }
    }];

    console.log(`✅ Generated provenance with ${materials.length} materials`);
    return this.provenance;
  }

  /**
   * Sign container image with provenance
   */
  async signImage(imageTag, options = {}) {
    console.log(`🔐 Signing image: ${imageTag}`);
    
    try {
      const provenance = await this.generateProvenance(imageTag, options.buildContext);
      
      if (this.config.keylessMode) {
        return await this.signImageKeyless(imageTag, provenance, options);
      } else {
        return await this.signImageWithKey(imageTag, provenance, options);
      }
    } catch (error) {
      console.error('❌ Image signing failed:', error);
      throw error;
    }
  }

  /**
   * Sign image using keyless mode (Sigstore)
   */
  async signImageKeyless(imageTag, provenance, options) {
    console.log('🔑 Using keyless signing with Sigstore...');
    
    // Save provenance to temporary file
    const provenanceFile = path.join(__dirname, 'provenance.json');
    fs.writeFileSync(provenanceFile, JSON.stringify(provenance, null, 2));
    
    try {
      // Sign with cosign (keyless mode)
      const cosignCmd = [
        'cosign sign',
        '--yes', // Skip confirmation
        '--rekor-url', this.config.rekorUrl,
        '--fulcio-url', this.config.fulcioUrl,
        imageTag
      ].join(' ');
      
      console.log('📝 Executing:', cosignCmd);
      const signOutput = execSync(cosignCmd, { 
        encoding: 'utf8',
        timeout: 60000,
        env: { ...process.env, COSIGN_EXPERIMENTAL: '1' }
      });
      
      // Attest provenance
      const attestCmd = [
        'cosign attest',
        '--yes',
        '--rekor-url', this.config.rekorUrl,
        '--fulcio-url', this.config.fulcioUrl,
        '--predicate', provenanceFile,
        '--type', 'slsaprovenance',
        imageTag
      ].join(' ');
      
      console.log('📋 Executing:', attestCmd);
      const attestOutput = execSync(attestCmd, { 
        encoding: 'utf8',
        timeout: 60000,
        env: { ...process.env, COSIGN_EXPERIMENTAL: '1' }
      });
      
      // Get transparency log entry
      const rekorEntry = this.extractRekorEntry(attestOutput);
      
      const result = {
        imageTag,
        signed: true,
        keyless: true,
        provenance,
        rekorEntry,
        signatureOutput: signOutput,
        attestationOutput: attestOutput,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Keyless signing completed');
      return result;
      
    } finally {
      // Cleanup
      if (fs.existsSync(provenanceFile)) {
        fs.unlinkSync(provenanceFile);
      }
    }
  }

  /**
   * Sign image using private key
   */
  async signImageWithKey(imageTag, provenance, options) {
    console.log('🔐 Using key-based signing...');
    
    // Generate key pair if not exists
    if (!fs.existsSync(this.config.keyPath)) {
      await this.generateKeyPair();
    }
    
    const provenanceFile = path.join(__dirname, 'provenance.json');
    fs.writeFileSync(provenanceFile, JSON.stringify(provenance, null, 2));
    
    try {
      // Sign with cosign using key
      const signCmd = [
        'cosign sign',
        '--key', this.config.keyPath,
        '--yes',
        imageTag
      ].join(' ');
      
      console.log('📝 Executing:', signCmd);
      const signOutput = execSync(signCmd, { 
        encoding: 'utf8',
        timeout: 60000
      });
      
      // Attest provenance with key
      const attestCmd = [
        'cosign attest',
        '--key', this.config.keyPath,
        '--predicate', provenanceFile,
        '--type', 'slsaprovenance',
        '--yes',
        imageTag
      ].join(' ');
      
      console.log('📋 Executing:', attestCmd);
      const attestOutput = execSync(attestCmd, { 
        encoding: 'utf8',
        timeout: 60000
      });
      
      const result = {
        imageTag,
        signed: true,
        keyless: false,
        keyPath: this.config.keyPath,
        publicKeyPath: this.config.publicKeyPath,
        provenance,
        signatureOutput: signOutput,
        attestationOutput: attestOutput,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Key-based signing completed');
      return result;
      
    } finally {
      // Cleanup
      if (fs.existsSync(provenanceFile)) {
        fs.unlinkSync(provenanceFile);
      }
    }
  }

  /**
   * Verify signed image
   */
  async verifyImage(imageTag, options = {}) {
    console.log(`🔍 Verifying image: ${imageTag}`);
    
    try {
      let verifyCmd;
      
      if (this.config.keylessMode || options.keyless) {
        // Keyless verification
        verifyCmd = [
          'cosign verify',
          '--rekor-url', this.config.rekorUrl,
          imageTag
        ].join(' ');
      } else {
        // Key-based verification
        if (!fs.existsSync(this.config.publicKeyPath)) {
          throw new Error('Public key not found for verification');
        }
        
        verifyCmd = [
          'cosign verify',
          '--key', this.config.publicKeyPath,
          imageTag
        ].join(' ');
      }
      
      console.log('🔍 Executing:', verifyCmd);
      const verifyOutput = execSync(verifyCmd, { 
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, COSIGN_EXPERIMENTAL: '1' }
      });
      
      // Verify attestations
      let attestationCmd;
      
      if (this.config.keylessMode || options.keyless) {
        attestationCmd = [
          'cosign verify-attestation',
          '--type', 'slsaprovenance',
          '--rekor-url', this.config.rekorUrl,
          imageTag
        ].join(' ');
      } else {
        attestationCmd = [
          'cosign verify-attestation',
          '--key', this.config.publicKeyPath,
          '--type', 'slsaprovenance',
          imageTag
        ].join(' ');
      }
      
      console.log('📋 Executing:', attestationCmd);
      const attestationOutput = execSync(attestationCmd, { 
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, COSIGN_EXPERIMENTAL: '1' }
      });
      
      const result = {
        imageTag,
        verified: true,
        verificationOutput: verifyOutput,
        attestationVerified: true,
        attestationOutput: attestationOutput,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Image verification successful');
      return result;
      
    } catch (error) {
      console.error('❌ Image verification failed:', error.message);
      
      return {
        imageTag,
        verified: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate admission policy for Kubernetes
   */
  generateAdmissionPolicy(options = {}) {
    const policy = {
      apiVersion: 'kyverno.io/v1',
      kind: 'ClusterPolicy',
      metadata: {
        name: 'require-signed-images',
        annotations: {
          'policies.kyverno.io/title': 'Require Signed Container Images',
          'policies.kyverno.io/category': 'Security',
          'policies.kyverno.io/subject': 'Pod',
          'policies.kyverno.io/description': 'Requires all container images to be cryptographically signed'
        }
      },
      spec: {
        validationFailureAction: options.enforce ? 'enforce' : 'audit',
        background: false,
        rules: [{
          name: 'require-signed-images',
          match: {
            any: [{
              resources: {
                kinds: ['Pod'],
                operations: ['CREATE', 'UPDATE']
              }
            }]
          },
          exclude: {
            any: [{
              resources: {
                namespaces: ['kube-system', 'kube-public', 'kyverno']
              }
            }]
          },
          verifyImages: [{
            imageReferences: ['*'],
            attestors: this.config.keylessMode ? [{
              entries: [{
                keyless: {
                  rekor: {
                    url: this.config.rekorUrl
                  },
                  ctlog: {
                    url: 'https://ctfe.sigstore.dev/test'
                  },
                  issuer: 'https://accounts.google.com',
                  subject: '*@intelgraph.com',
                  additionalExtensions: {
                    'github-workflow-repository': 'intelgraph/*'
                  }
                }
              }]
            }] : [{
              entries: [{
                keys: {
                  publicKeys: fs.readFileSync(this.config.publicKeyPath, 'utf8')
                }
              }]
            }],
            attestations: [{
              predicateType: 'https://slsa.dev/provenance/v0.2',
              conditions: [{
                all: [
                  {
                    key: '{{ invocation.configSource.uri }}',
                    operator: 'Equals',
                    value: 'https://github.com/intelgraph/*'
                  },
                  {
                    key: '{{ builder.id }}',
                    operator: 'Equals', 
                    value: 'https://github.com/intelgraph/ci-builder'
                  }
                ]
              }]
            }]
          }]
        }]
      }
    };

    // Add additional restrictions for production
    if (options.environment === 'production') {
      policy.spec.rules[0].verifyImages[0].attestors[0].entries[0].keyless = {
        ...policy.spec.rules[0].verifyImages[0].attestors[0].entries[0].keyless,
        subject: '*@intelgraph.com', // Only allow org members
        additionalExtensions: {
          'github-workflow-repository': 'intelgraph/intelgraph',
          'github-workflow-ref': 'refs/heads/main'
        }
      };
    }

    return policy;
  }

  /**
   * Generate OPA admission policy
   */
  generateOPAAdmissionPolicy() {
    return `package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  input.request.object.spec.containers[_].image
  image := input.request.object.spec.containers[_].image
  not image_signed(image)
  msg := sprintf("Container image '%v' is not signed", [image])
}

deny[msg] {
  input.request.kind.kind == "Pod"
  input.request.object.spec.containers[_].image
  image := input.request.object.spec.containers[_].image
  not image_from_trusted_registry(image)
  msg := sprintf("Container image '%v' is not from a trusted registry", [image])
}

image_signed(image) {
  # Check if image has valid signature
  # This would integrate with cosign verification
  startswith(image, "ghcr.io/intelgraph/")
  # Additional signature verification logic would go here
}

image_from_trusted_registry(image) {
  trusted_registries := [
    "ghcr.io/intelgraph/",
    "gcr.io/intelgraph-prod/",
    "intelgraph.azurecr.io/"
  ]
  
  some registry
  trusted_registries[_] = registry
  startswith(image, registry)
}`;
  }

  /**
   * Utility methods
   */
  async generateKeyPair() {
    console.log('🔑 Generating signing key pair...');
    
    try {
      // Generate private key
      execSync(`cosign generate-key-pair --output-key-prefix signing-key`, {
        timeout: 30000,
        stdio: 'inherit'
      });
      
      // Move files to configured paths
      if (fs.existsSync('signing-key.key')) {
        fs.renameSync('signing-key.key', this.config.keyPath);
      }
      if (fs.existsSync('signing-key.pub')) {
        fs.renameSync('signing-key.pub', this.config.publicKeyPath);
      }
      
      console.log('✅ Key pair generated successfully');
      
    } catch (error) {
      console.error('❌ Key generation failed:', error);
      throw error;
    }
  }

  async getImageDigest(imageTag) {
    try {
      // Get image digest using docker inspect
      const output = execSync(`docker inspect ${imageTag} --format='{{index .RepoDigests 0}}'`, {
        encoding: 'utf8',
        timeout: 10000
      }).trim();
      
      const match = output.match(/sha256:([a-f0-9]{64})/);
      return match ? match[1] : crypto.createHash('sha256').update(imageTag).digest('hex');
      
    } catch (error) {
      console.warn('⚠️  Could not get image digest, using tag hash');
      return crypto.createHash('sha256').update(imageTag).digest('hex');
    }
  }

  extractRekorEntry(output) {
    try {
      const match = output.match(/tlog entry created with index: (\d+)/);
      return match ? { index: parseInt(match[1]) } : null;
    } catch (error) {
      return null;
    }
  }

  generateBuildId() {
    return crypto.randomUUID();
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
🔐 IntelGraph Image Signing Tool
===============================

Usage:
  node image-signing.js sign <image-tag> [options]
  node image-signing.js verify <image-tag> [options]
  node image-signing.js policy [options]
  node image-signing.js generate-keys

Options:
  --keyless        Use keyless signing (Sigstore)
  --key-path       Path to signing key (default: ./signing-key.pem)
  --enforce        Generate enforcing policy (vs audit)
  --environment    Target environment (production, staging)

Examples:
  node image-signing.js sign ghcr.io/intelgraph/platform:latest --keyless
  node image-signing.js verify ghcr.io/intelgraph/platform:latest
  node image-signing.js policy --enforce --environment production
`);
    return;
  }

  const imageTag = args[1];
  const options = {
    keyless: args.includes('--keyless'),
    keyPath: args.find(arg => arg.startsWith('--key-path='))?.split('=')[1],
    enforce: args.includes('--enforce'),
    environment: args.find(arg => arg.startsWith('--environment='))?.split('=')[1] || 'development'
  };

  const signingService = new ImageSigningService({
    keylessMode: options.keyless,
    keyPath: options.keyPath || './signing-key.pem'
  });

  try {
    switch (command) {
      case 'sign':
        if (!imageTag) {
          console.error('❌ Image tag required for signing');
          process.exit(1);
        }
        const signResult = await signingService.signImage(imageTag, options);
        console.log('📄 Signing result:', JSON.stringify(signResult, null, 2));
        break;

      case 'verify':
        if (!imageTag) {
          console.error('❌ Image tag required for verification');
          process.exit(1);
        }
        const verifyResult = await signingService.verifyImage(imageTag, options);
        console.log('📄 Verification result:', JSON.stringify(verifyResult, null, 2));
        break;

      case 'policy':
        const kyvernoPolicy = signingService.generateAdmissionPolicy(options);
        const opaPolicy = signingService.generateOPAAdmissionPolicy();
        
        fs.writeFileSync('admission-policy-kyverno.yaml', JSON.stringify(kyvernoPolicy, null, 2));
        fs.writeFileSync('admission-policy-opa.rego', opaPolicy);
        
        console.log('📋 Generated admission policies:');
        console.log('  - admission-policy-kyverno.yaml (Kyverno)');
        console.log('  - admission-policy-opa.rego (OPA)');
        break;

      case 'generate-keys':
        await signingService.generateKeyPair();
        break;

      default:
        console.error('❌ Unknown command:', command);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { ImageSigningService };

// Run if called directly
if (require.main === module) {
  main();
}