
import fs from 'fs';
import path from 'path';

interface Endpoint {
  method: string;
  path: string;
  sourceFile: string;
  line: number;
  tier: string;
}

const SERVER_ROOT = path.join(process.cwd(), 'server/src');
const APP_FILE = path.join(SERVER_ROOT, 'app.ts');

const endpoints: Endpoint[] = [];

// Regex to find imports: import xyz from './routes/xyz.js' or const xyz = require('./routes/xyz.js')
// We need to map variable name to file path.
const importMap: Record<string, string> = {};

function resolvePath(importPath: string, currentFile: string): string {
  if (importPath.startsWith('.')) {
    const dir = path.dirname(currentFile);
    let resolved = path.join(dir, importPath);
    if (resolved.endsWith('.js')) {
      resolved = resolved.replace(/\.js$/, '.ts');
    }
    // Check if .ts exists, if not check .js (some files might be js)
    if (!fs.existsSync(resolved)) {
       const jsPath = resolved.replace(/\.ts$/, '.js');
       if (fs.existsSync(jsPath)) return jsPath;
    }
    return resolved;
  }
  return importPath;
}

function parseAppFile() {
  const content = fs.readFileSync(APP_FILE, 'utf-8');
  const lines = content.split('\n');

  // Pass 1: Gather imports
  lines.forEach((line, index) => {
    // import x from 'y'
    const importMatch = line.match(/import\s+(\w+)\s+from\s+['"](.+)['"]/);
    if (importMatch) {
      importMap[importMatch[1]] = resolvePath(importMatch[2], APP_FILE);
    }

    // const x = require('y')
    const requireMatch = line.match(/const\s+(\w+)\s+=\s+require\(['"](.+)['"]\)/);
    if (requireMatch) {
      importMap[requireMatch[1]] = resolvePath(requireMatch[2], APP_FILE);
    }

    // Dynamic imports: const { x } = await import('y') - simpler regex for now
    const dynamicImportMatch = line.match(/const\s+\{\s*(\w+)\s*\}\s*=\s*await\s+import\(['"](.+)['"]\)/);
     if (dynamicImportMatch) {
        // e.g. const { buildMaestroRouter } = await import('./routes/maestro_routes.js');
        // This is harder because it's a named export. We'll map the variable to the file.
        importMap[dynamicImportMatch[1]] = resolvePath(dynamicImportMatch[2], APP_FILE);
     }
      const defaultDynamicImport = line.match(/const\s+(\w+)\s*=\s*\(await\s+import\(['"](.+)['"]\)\)\.default/);
      if (defaultDynamicImport) {
          importMap[defaultDynamicImport[1]] = resolvePath(defaultDynamicImport[2], APP_FILE);
      }
  });

  // Pass 2: Find app.use mounts
  lines.forEach((line, index) => {
    // app.use('/api/foo', fooRouter)
    const useMatch = line.match(/app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/);
    if (useMatch) {
      const prefix = useMatch[1];
      const routerVar = useMatch[2];
      const routerFile = importMap[routerVar];

      if (routerFile && fs.existsSync(routerFile)) {
        parseRouterFile(routerFile, prefix);
      } else {
        // console.warn(`Could not resolve router file for ${routerVar} (mapped to ${routerFile})`);
      }
    }

    // Direct app.get/post etc.
    const directMatch = line.match(/app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/);
    if (directMatch) {
        endpoints.push({
            method: directMatch[1].toUpperCase(),
            path: directMatch[2],
            sourceFile: 'server/src/app.ts',
            line: index + 1,
            tier: 'Unknown'
        });
    }
  });
}

function parseRouterFile(filepath: string, prefix: string) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // router.get('/path', ...) or just .get('/path', ...)
    const match = line.match(/(?:router|^)\.(get|post|put|delete|patch)\(\s*['"]([^'"]*)['"]/);
    if (match) {
      let subpath = match[2];
      // Normalize path
      let fullPath = prefix;
      if (prefix.endsWith('/') && subpath.startsWith('/')) {
        fullPath = prefix + subpath.substring(1);
      } else if (!prefix.endsWith('/') && !subpath.startsWith('/')) {
        fullPath = prefix + '/' + subpath;
      } else {
        fullPath = prefix + subpath;
      }

      endpoints.push({
        method: match[1].toUpperCase(),
        path: fullPath,
        sourceFile: path.relative(process.cwd(), filepath),
        line: index + 1,
        tier: classifyTier(fullPath)
      });
    }
  });
}

function classifyTier(apiPath: string): string {
    if (apiPath.startsWith('/auth') || apiPath.includes('/login') || apiPath.includes('/admin')) return 'Tier 0';
    if (apiPath.startsWith('/api/tenants')) return 'Tier 1';
    if (apiPath.startsWith('/api/billing')) return 'Tier 1';
    if (apiPath.includes('webhook')) return 'Tier 1';
    return 'Tier 2';
}

parseAppFile();

// Sort by path
endpoints.sort((a, b) => a.path.localeCompare(b.path));

console.log(JSON.stringify(endpoints, null, 2));
