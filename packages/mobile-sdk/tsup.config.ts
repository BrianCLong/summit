import {defineConfig} from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'offline/index': 'src/offline/index.ts',
    'auth/index': 'src/auth/index.ts',
    'storage/index': 'src/storage/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
});
