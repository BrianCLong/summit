module.exports = {
  presets: [
    ['module:metro-react-native-babel-preset', { useTransformReactJSXExperimental: true }],
    'nativewind/babel',
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/screens': './src/screens',
          '@/services': './src/services',
          '@/stores': './src/stores',
          '@/hooks': './src/hooks',
          '@/contexts': './src/contexts',
          '@/types': './src/types',
          '@/utils': './src/utils',
          '@/navigation': './src/navigation',
          '@/graphql': './src/graphql',
          '@/assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
