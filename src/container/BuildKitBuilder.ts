/**
 * Reproducible Container Builder - Composer vNext Sprint
 * BuildKit-based builds with deterministic outputs and base image pinning
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface BuildConfig {
  dockerfile: string;
  context: string;
  target?: string;
  platform?: string;
  buildArgs: Record<string, string>;
  labels: Record<string, string>;
  tags: string[];
  reproducible: boolean;
  sourceDate?: string;
}

export interface BuildResult {
  imageId: string;
  digest: string;
  size: number;
  duration: number;
  reproducible: boolean;
  warnings: string[];
}

export class BuildKitBuilder {
  private builderName: string = 'maestro-builder';
  private initialized: boolean = false;

  constructor() {
    this.ensureBuilder();
  }

  /**
   * Build container image with reproducible configuration
   */
  async build(config: BuildConfig): Promise<BuildResult> {
    console.log(
      `🏗️  Building image with BuildKit: ${config.tags[0] || 'unnamed'}`,
    );

    const startTime = Date.now();

    // Ensure reproducible environment
    if (config.reproducible) {
      await this.prepareReproducibleBuild(config);
    }

    // Generate Dockerfile with pinned base images
    const dockerfilePath = await this.generatePinnedDockerfile(config);

    // Build with BuildKit
    const buildResult = await this.executeBuildKit(config, dockerfilePath);

    // Cleanup temporary files
    if (dockerfilePath !== config.dockerfile) {
      await fs.unlink(dockerfilePath);
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Build completed: ${buildResult.imageId} (${duration}ms)`);

    return {
      ...buildResult,
      duration,
    };
  }

  /**
   * Verify build reproducibility
   */
  async verifyReproducibility(
    config: BuildConfig,
    expectedDigest?: string,
  ): Promise<{
    reproducible: boolean;
    digest1: string;
    digest2: string;
    identical: boolean;
  }> {
    console.log('🔍 Verifying build reproducibility...');

    // First build
    const result1 = await this.build(config);

    // Clean build cache to ensure fresh build
    await this.cleanCache();

    // Second build
    const result2 = await this.build(config);

    const identical = result1.digest === result2.digest;
    const reproducible =
      identical && (expectedDigest ? result1.digest === expectedDigest : true);

    console.log(identical ? '✅ Builds are identical' : '❌ Builds differ');

    return {
      reproducible,
      digest1: result1.digest,
      digest2: result2.digest,
      identical,
    };
  }

  private async ensureBuilder(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if builder exists
      execSync(`docker buildx inspect ${this.builderName}`, {
        stdio: 'ignore',
      });
    } catch {
      // Create builder if it doesn't exist
      console.log('🔧 Creating BuildKit builder...');
      execSync(
        `docker buildx create --name ${this.builderName} --driver docker-container --use`,
        { stdio: 'inherit' },
      );
    }

    // Use the builder
    execSync(`docker buildx use ${this.builderName}`, { stdio: 'ignore' });
    this.initialized = true;
  }

  private async prepareReproducibleBuild(config: BuildConfig): Promise<void> {
    // Set SOURCE_DATE_EPOCH for reproducible timestamps
    if (!config.sourceDate) {
      // Use git commit timestamp if available, otherwise current time
      try {
        const gitTimestamp = execSync('git log -1 --format=%ct', {
          encoding: 'utf8',
        }).trim();
        config.buildArgs.SOURCE_DATE_EPOCH = gitTimestamp;
      } catch {
        // Fallback to fixed timestamp for reproducibility
        config.buildArgs.SOURCE_DATE_EPOCH = '1640995200'; // Jan 1, 2022
      }
    } else {
      config.buildArgs.SOURCE_DATE_EPOCH = config.sourceDate;
    }

    // Set additional reproducible build args
    config.buildArgs.DEBIAN_FRONTEND = 'noninteractive';
    config.buildArgs.TZ = 'UTC';

    // Add reproducibility labels
    config.labels['org.opencontainers.image.reproducible'] = 'true';
    config.labels['org.opencontainers.image.source-date-epoch'] =
      config.buildArgs.SOURCE_DATE_EPOCH;
  }

  private async generatePinnedDockerfile(config: BuildConfig): Promise<string> {
    let dockerfileContent = await fs.readFile(config.dockerfile, 'utf8');

    // Pin base images to specific digests
    dockerfileContent = await this.pinBaseImages(dockerfileContent);

    // Add reproducibility optimizations
    dockerfileContent = this.addReproducibilityDirectives(dockerfileContent);

    // Write to temporary file
    const tempDockerfile = path.join(
      path.dirname(config.dockerfile),
      '.Dockerfile.pinned',
    );
    await fs.writeFile(tempDockerfile, dockerfileContent);

    return tempDockerfile;
  }

  private async pinBaseImages(dockerfileContent: string): Promise<string> {
    const lines = dockerfileContent.split('\n');
    const pinnedLines: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('FROM ') && !line.includes('@sha256:')) {
        const pinnedLine = await this.pinSingleImage(line);
        pinnedLines.push(pinnedLine);

        if (pinnedLine !== line) {
          console.log(`📌 Pinned: ${line.trim()} -> ${pinnedLine.trim()}`);
        }
      } else {
        pinnedLines.push(line);
      }
    }

    return pinnedLines.join('\n');
  }

  private async pinSingleImage(fromLine: string): Promise<string> {
    try {
      // Extract image name and tag
      const match = fromLine.match(/FROM\s+([^\s]+)(?:\s+as\s+([^\s]+))?/i);
      if (!match) return fromLine;

      const [, imageRef, alias] = match;

      // Skip if already pinned or is a build stage
      if (imageRef.includes('@sha256:') || imageRef.includes('$')) {
        return fromLine;
      }

      // Get digest for the image
      const digest = await this.getImageDigest(imageRef);
      if (!digest) return fromLine;

      // Replace tag with digest
      const [image] = imageRef.split(':');
      const pinnedRef = `${image}@${digest}`;

      return alias ? `FROM ${pinnedRef} as ${alias}` : `FROM ${pinnedRef}`;
    } catch (error) {
      console.warn(`⚠️  Could not pin image: ${fromLine.trim()}`);
      return fromLine;
    }
  }

  private async getImageDigest(imageRef: string): Promise<string | null> {
    try {
      const output = execSync(
        `docker buildx imagetools inspect ${imageRef} --format '{{.Manifest.Digest}}'`,
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );

      return output.trim() || null;
    } catch {
      return null;
    }
  }

  private addReproducibilityDirectives(dockerfileContent: string): string {
    const reproducibilityHeader = `
# Reproducibility optimizations
ARG SOURCE_DATE_EPOCH
ARG DEBIAN_FRONTEND=noninteractive
ARG TZ=UTC

# Set timezone for reproducibility
ENV TZ=UTC
`;

    // Insert after the first FROM statement
    const lines = dockerfileContent.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('FROM ')) {
        insertIndex = i + 1;
        break;
      }
    }

    lines.splice(insertIndex, 0, reproducibilityHeader);

    return lines.join('\n');
  }

  private async executeBuildKit(
    config: BuildConfig,
    dockerfilePath: string,
  ): Promise<Omit<BuildResult, 'duration'>> {
    const buildArgs = Object.entries(config.buildArgs)
      .map(([key, value]) => `--build-arg=${key}=${value}`)
      .join(' ');

    const labels = Object.entries(config.labels)
      .map(([key, value]) => `--label=${key}=${value}`)
      .join(' ');

    const tags = config.tags.map((tag) => `--tag=${tag}`).join(' ');

    const targetFlag = config.target ? `--target=${config.target}` : '';
    const platformFlag = config.platform ? `--platform=${config.platform}` : '';

    const buildCommand = [
      'docker buildx build',
      `--file=${dockerfilePath}`,
      buildArgs,
      labels,
      tags,
      targetFlag,
      platformFlag,
      '--load', // Load image to local docker daemon
      '--progress=plain',
      config.context,
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`🔨 Executing: ${buildCommand}`);

    try {
      const output = execSync(buildCommand, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      // Parse output for image ID and warnings
      const imageId = this.extractImageId(output);
      const digest = await this.getBuiltImageDigest(config.tags[0]);
      const size = await this.getImageSize(config.tags[0]);
      const warnings = this.extractWarnings(output);

      return {
        imageId,
        digest,
        size,
        reproducible: config.reproducible,
        warnings,
      };
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }

  private extractImageId(buildOutput: string): string {
    // Look for image ID in BuildKit output
    const match = buildOutput.match(/writing image sha256:([a-f0-9]{64})/);
    return match ? match[1] : 'unknown';
  }

  private async getBuiltImageDigest(tag: string): Promise<string> {
    try {
      const output = execSync(
        `docker images --digests ${tag} --format "{{.Digest}}"`,
        {
          encoding: 'utf8',
        },
      );
      return output.trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async getImageSize(tag: string): Promise<number> {
    try {
      const output = execSync(`docker images ${tag} --format "{{.Size}}"`, {
        encoding: 'utf8',
      });

      const sizeStr = output.trim();
      if (sizeStr.includes('MB')) {
        return parseFloat(sizeStr.replace('MB', '')) * 1024 * 1024;
      } else if (sizeStr.includes('GB')) {
        return parseFloat(sizeStr.replace('GB', '')) * 1024 * 1024 * 1024;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  private extractWarnings(buildOutput: string): string[] {
    const warnings: string[] = [];
    const lines = buildOutput.split('\n');

    for (const line of lines) {
      if (line.includes('WARNING') || line.includes('WARN')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }

  private async cleanCache(): Promise<void> {
    try {
      execSync(`docker buildx prune --builder=${this.builderName} -f`, {
        stdio: 'ignore',
      });
    } catch {
      // Cache cleanup failed, but this is non-critical
    }
  }
}

// Example usage and CLI
export async function buildWithBuildKit(
  config: BuildConfig,
): Promise<BuildResult> {
  const builder = new BuildKitBuilder();
  return builder.build(config);
}

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: BuildConfig = {
    dockerfile: process.argv[2] || 'Dockerfile',
    context: process.argv[3] || '.',
    buildArgs: {
      NODE_VERSION: '18',
    },
    labels: {
      'org.opencontainers.image.title': 'maestro-build',
      'org.opencontainers.image.version': '1.0.0',
    },
    tags: ['maestro-test:latest'],
    reproducible: true,
  };

  buildWithBuildKit(config)
    .then((result) => {
      console.log('Build result:', result);
    })
    .catch((error) => {
      console.error('Build failed:', error);
      process.exit(1);
    });
}
