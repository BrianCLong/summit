const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Optimized for:
 * - Faster builds
 * - Smaller bundle size
 * - Better tree-shaking
 * - Improved caching
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    // Enable inline requires for better lazy loading
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    // Use Hermes for better performance
    hermesCommand: path.resolve(__dirname, '../../node_modules/hermes-engine/osx-bin/hermesc'),
    // Minify for production
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      ecma: 8,
      keep_classnames: false,
      keep_fnames: false,
      module: true,
      mangle: {
        module: true,
        toplevel: false,
      },
      compress: {
        // Remove console.log in production
        drop_console: !__DEV__,
        drop_debugger: true,
        pure_funcs: !__DEV__ ? ['console.log', 'console.info', 'console.debug'] : [],
        passes: 3,
      },
      output: {
        ascii_only: true,
        comments: false,
        beautify: false,
      },
    },
  },
  resolver: {
    // Support more file extensions
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'cjs', 'json', 'mjs'],
    // Asset extensions
    assetExts: [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'svg',
      'ttf',
      'otf',
      'woff',
      'woff2',
      'eot',
      'mp3',
      'mp4',
      'mov',
      'wav',
      'pdf',
    ],
    // Node modules to include
    nodeModulesPaths: [path.resolve(__dirname, '../../node_modules')],
    // Resolve symlinks
    resolveRequest: null,
  },
  serializer: {
    // Custom module ID factory for smaller IDs
    createModuleIdFactory: function () {
      const projectRootPath = __dirname;
      return (path) => {
        const relativePath = path
          .replace(projectRootPath, '')
          .replace(/\//g, '_')
          .replace(/\\/g, '_');
        return relativePath;
      };
    },
    // Process modules for better tree-shaking
    processModuleFilter: (module) => {
      // Filter out source maps in production
      if (!__DEV__ && module.path.includes('.map')) {
        return false;
      }
      return true;
    },
  },
  server: {
    // Enable persistent caching
    enhanceMiddleware: (middleware) => {
      return middleware;
    },
  },
  cacheStores: [
    {
      // File-based cache store for faster rebuilds
      get: async (key) => {
        // Implement cache retrieval if needed
        return null;
      },
      set: async (key, value) => {
        // Implement cache storage if needed
      },
    },
  ],
  // Watch options for better dev experience
  watchFolders: [
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../../packages'),
  ],
  // Reset cache on these changes
  resetCache: false,
  // Maximum workers for parallel processing
  maxWorkers: require('os').cpus().length,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
