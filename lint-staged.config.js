export default {
  '**/*.{ts,tsx,js,jsx}': ['eslint --fix --no-warn-ignored'],
  '**/*.{md,css,scss,json,yaml,yml}': ['prettier --write'],
};
