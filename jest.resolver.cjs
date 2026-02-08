const fs = require('fs');
const path = require('path');

const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.json',
  '.gql',
  '.graphql',
];

const repoRoot = __dirname;

const resolveLocal = (basePath) => {
  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  for (const ext of EXTENSIONS) {
    const indexCandidate = path.join(basePath, `index${ext}`);
    if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
      return indexCandidate;
    }
  }
  return null;
};

module.exports = (request, options) => {
  const defaultResolver = options && options.defaultResolver;
  const basedir = options && options.basedir ? options.basedir : '';

  if (request.startsWith('.')) {
    const hasJsExtension = request.endsWith('.js');
    const hasExtension = /\.[^/]+$/.test(request);
    const baseRequest = hasJsExtension ? request.slice(0, -3) : request;

    if (!hasExtension || hasJsExtension) {
      if (basedir && basedir.startsWith(repoRoot)) {
        const absBase = path.resolve(basedir, baseRequest);
        const resolved = resolveLocal(absBase);
        if (resolved) {
          return resolved;
        }
      }

      try {
        return defaultResolver(baseRequest, options);
      } catch (error) {
        for (const ext of EXTENSIONS) {
          try {
            return defaultResolver(`${baseRequest}${ext}`, options);
          } catch {}
          try {
            return defaultResolver(`${baseRequest}/index${ext}`, options);
          } catch {}
        }
      }
    }
  }

  return defaultResolver(request, options);
};
