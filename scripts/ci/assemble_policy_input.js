const fs = require('fs');
const yaml = require('js-yaml');

// Helper to decode DSSE bundle or extract predicate
function decodeBundle(bundle) {
  // If it's a DSSE envelope (Sigstore bundle)
  if (bundle.dsseEnvelope && bundle.dsseEnvelope.payload) {
    try {
      const payload = Buffer.from(bundle.dsseEnvelope.payload, 'base64').toString('utf8');
      const statement = JSON.parse(payload);
      return statement.predicate;
    } catch (e) {
      console.error('Failed to decode DSSE payload', e);
    }
  }
  // If it's already a statement (Intoto)
  if (bundle.predicate) {
      return bundle.predicate;
  }
  // Fallback: use as is
  return bundle;
}

// Helper to normalize SLSA v1.0 to look like v0.2 if needed for policies
function normalizeProvenance(prov) {
  if (!prov) return null;

  // v1.0 runDetails -> v0.2 metadata/builder
  if (prov.runDetails) {
    if (!prov.builder && prov.runDetails.builder) {
      prov.builder = prov.runDetails.builder;
    }
    if (prov.runDetails.metadata) {
      prov.metadata = prov.metadata || {};
      Object.assign(prov.metadata, prov.runDetails.metadata);
      // Map startedOn to runStartedOn
      if (prov.runDetails.metadata.startedOn && !prov.metadata.runStartedOn) {
        prov.metadata.runStartedOn = prov.runDetails.metadata.startedOn;
      }
    }
  }

  // v1.0 resolvedDependencies -> v0.2 materials
  if (!prov.materials || prov.materials.length === 0) {
     if (prov.buildDefinition && prov.buildDefinition.resolvedDependencies) {
         prov.materials = prov.buildDefinition.resolvedDependencies;
     }
  }

  return prov;
}

// Helper to recursively collect dependencies from package-lock.json v1/v2/v3
function collectNpmDependencies(deps, output) {
  if (!deps) return;
  for (const [name, detail] of Object.entries(deps)) {
    if (detail.version) {
      if (!output[name]) output[name] = [];
      if (!output[name].includes(detail.version)) {
        output[name].push(detail.version);
      }
    }
    // Recurse for nested dependencies (v1)
    if (detail.dependencies) {
      collectNpmDependencies(detail.dependencies, output);
    }
  }
}

// Helper for package-lock.json v2/v3 'packages'
function collectNpmPackages(packages, output) {
  if (!packages) return;
  for (const [path, detail] of Object.entries(packages)) {
    // path is usually "node_modules/name" or empty string for root
    if (!path) continue; // skip root

    // Extract name from path (last segment usually, or scoped)
    let name = detail.name;
    if (!name) {
      const parts = path.split('node_modules/');
      name = parts[parts.length - 1];
    }

    if (name && detail.version) {
      if (!output[name]) output[name] = [];
      if (!output[name].includes(detail.version)) {
        output[name].push(detail.version);
      }
    }
  }
}

const input = {};

// SBOM
try {
  if (fs.existsSync('sbom.json')) {
    input.sbom = JSON.parse(fs.readFileSync('sbom.json', 'utf8'));
  } else {
    input.sbom = { components: [] };
  }
} catch (e) {
  console.warn('Warning: Failed to read sbom.json', e.message);
  input.sbom = { components: [] };
}

// Workflows
try {
  if (fs.existsSync('workflows.json')) {
    input.workflows = JSON.parse(fs.readFileSync('workflows.json', 'utf8'));
  } else {
    input.workflows = [];
  }
} catch (e) {
  console.warn('Warning: Failed to read workflows.json', e.message);
  input.workflows = [];
}

// Provenance
try {
  if (fs.existsSync('provenance.json')) {
    const rawProv = JSON.parse(fs.readFileSync('provenance.json', 'utf8'));
    let decoded = decodeBundle(rawProv);
    input.provenance = normalizeProvenance(decoded);
  } else {
    input.provenance = null;
  }
} catch (e) {
  console.warn('Warning: Failed to read provenance.json', e.message);
  input.provenance = null;
}

// Lockfile
input.lockfile = { dependencies: {} };
try {
  if (fs.existsSync('pnpm-lock.yaml')) {
    const pnpmLock = yaml.load(fs.readFileSync('pnpm-lock.yaml', 'utf8'));
    const packages = pnpmLock.packages || {};
    for (const key of Object.keys(packages)) {
      // Regex to parse /name@version or /scope/name@version
      // Standard regex for pnpm keys (v6+):
      const match = key.match(/^\/((?:@[^/]+\/)?[^@]+)@([^\(\_]+)/);
      if (match) {
        const name = match[1];
        const version = match[2];
        if (!input.lockfile.dependencies[name]) {
            input.lockfile.dependencies[name] = [];
        }
        if (!input.lockfile.dependencies[name].includes(version)) {
            input.lockfile.dependencies[name].push(version);
        }
      }
    }
  } else if (fs.existsSync('package-lock.json')) {
      const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      // Try v2/v3 'packages' first (flatter, complete)
      if (lock.packages) {
        collectNpmPackages(lock.packages, input.lockfile.dependencies);
      } else if (lock.dependencies) {
        // v1 nested dependencies
        collectNpmDependencies(lock.dependencies, input.lockfile.dependencies);
      }
  }
} catch (e) {
  console.error('Failed to read lockfile', e);
}

// Exceptions
try {
  if (fs.existsSync('policies/exceptions.json')) {
    input.exceptions = JSON.parse(fs.readFileSync('policies/exceptions.json', 'utf8'));
  } else {
    input.exceptions = { allow_exact: [], allow_purl_prefix: [] };
  }
} catch (e) {
  console.warn('Warning: Failed to read policies/exceptions.json', e.message);
  input.exceptions = { allow_exact: [], allow_purl_prefix: [] };
}

fs.writeFileSync('policy_input.json', JSON.stringify(input, null, 2));
