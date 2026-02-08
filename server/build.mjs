import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * esbuild plugin to resolve @intelgraph/* workspace packages to their source
 */
const workspacePlugin = {
  name: 'workspace-resolver',
  setup(build) {
    // Intercept @intelgraph/* imports
    build.onResolve({ filter: /^@intelgraph\// }, (args) => {
      const packageName = args.path.split('/')[1];
      const packagePath = path.resolve(__dirname, '..', 'packages', packageName);

      if (fs.existsSync(packagePath)) {
        // Try src/index.ts first
        const srcIndex = path.join(packagePath, 'src', 'index.ts');
        if (fs.existsSync(srcIndex)) {
          return { path: srcIndex, namespace: 'file' };
        }

        // Fallback to what package.json says
        try {
          const pkgJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'));
          const mainFile = pkgJson.main || 'index.js';
          const resolvedPath = path.join(packagePath, mainFile);
          if (fs.existsSync(resolvedPath)) {
            return { path: resolvedPath, namespace: 'file' };
          }
        } catch (e) {
          // ignore
        }
      }
      return null;
    });
  },
};

/**
 * esbuild plugin to handle .js extensions in imports of .ts files and mark everything else external
 */
const externalAndExtensionPlugin = {
  name: 'external-and-extension',
  setup(build) {
    // Handle .js -> .ts resolution for internal files
    build.onResolve({ filter: /\.js$/ }, (args) => {
      if (args.importer && args.path.startsWith('.')) {
        const tsPath = path.resolve(path.dirname(args.importer), args.path.replace(/\.js$/, '.ts'));
        if (fs.existsSync(tsPath)) {
          return { path: tsPath };
        }
      }
      return null;
    });

    // Aggressively mark all third-party dependencies as external
    build.onResolve({ filter: /^[^.]/ }, (args) => {
      if (args.path.startsWith('@intelgraph/')) {
        return null;
      }
      if (path.isAbsolute(args.path)) {
        return null;
      }
      return { path: args.path, external: true };
    });
  },
};

console.log('🚀 Starting isolated build for server (target: dist-isolated)...');

async function runBuild() {
  const outputDir = 'dist-isolated';
  try {
    // We avoid cleaning if it fails, but we try a fresh dir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      sourcemap: true,
      outfile: path.join(outputDir, 'index.js'),
      plugins: [workspacePlugin, externalAndExtensionPlugin],
      logLevel: 'info',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      loader: {
        '.node': 'binary',
      },
    });

    console.log(`✅ Build completed successfully in ${outputDir}`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

runBuild();
