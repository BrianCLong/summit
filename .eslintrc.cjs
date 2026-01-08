// Legacy ESLint config - will be migrated to eslint.config.mjs
// This is kept for backward compatibility during the transition
module.exports = {
  // This config is kept minimal to avoid conflicts with the new flat config
  // Most rules are now defined in eslint.config.mjs
  ignorePatterns: ["dist", "build", "coverage", "node_modules", "*.min.js"],
  // Use the new flat config instead
  root: true,
};
