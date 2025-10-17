import { createRequire } from 'node:module';
import type { SourceMapUploadOptions } from './types';

type ReleaseManager = {
  new: (release: string, options: { org: string; projects: string[] }) => PromiseLike<void>;
  uploadSourceMaps: (
    release: string,
    options: {
      include: string[];
      urlPrefix?: string;
      dist?: string;
      projects: string[];
      rewrite?: boolean;
    }
  ) => PromiseLike<void>;
  finalize: (release: string) => PromiseLike<void>;
};

type SentryCliConstructor = new (
  configFile?: string | null,
  options?: { authToken?: string }
) => { releases: ReleaseManager };

const require = createRequire(import.meta.url);

function createNoopCli(): SentryCliConstructor {
  return class NoopCli {
    public readonly releases: ReleaseManager = {
      new: async () => undefined,
      uploadSourceMaps: async () => undefined,
      finalize: async () => undefined
    };

    constructor(_configFile: string | null = null, _options: { authToken?: string } = {}) {
      void _configFile;
      void _options;
    }
  };
}

const defaultCli: SentryCliConstructor = (() => {
  try {
    return require('@sentry/cli') as SentryCliConstructor;
  } catch {
    return createNoopCli();
  }
})();

export async function uploadSourceMaps(
  options: SourceMapUploadOptions,
  Cli: SentryCliConstructor = defaultCli
): Promise<void> {
  const cli = new Cli(undefined, {
    authToken: options.authToken
  });

  await cli.releases.new(options.release, {
    org: options.org,
    projects: [options.project]
  });

  await cli.releases.uploadSourceMaps(options.release, {
    include: options.include,
    urlPrefix: options.urlPrefix,
    dist: options.dist,
    projects: [options.project],
    rewrite: false
  });

  if (options.finalize !== false) {
    await cli.releases.finalize(options.release);
  }
}
