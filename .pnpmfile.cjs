/**
 * pnpm hook file to handle package modifications
 * See: https://pnpm.io/pnpmfile
 */

function readPackage(pkg, context) {
  // Override xlsx in @nlpjs/xtables to use patched version
  if (pkg.name === '@nlpjs/xtables') {
    if (pkg.dependencies && pkg.dependencies.xlsx) {
      context.log(`Overriding xlsx version in ${pkg.name}`);
      pkg.dependencies.xlsx = 'https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz';
    }
  }

  // Force hono >= 4.11.4 to fix JWT vulnerabilities (GHSA-3vhc-576x-3qv4, GHSA-f67f-6cw9-8mq4)
  if (pkg.dependencies && pkg.dependencies.hono) {
    context.log(`Overriding hono version in ${pkg.name} from ${pkg.dependencies.hono} to >=4.11.4`);
    pkg.dependencies.hono = '>=4.11.4';
  }
  if (pkg.peerDependencies && pkg.peerDependencies.hono) {
    context.log(`Overriding hono peer dependency in ${pkg.name} from ${pkg.peerDependencies.hono} to >=4.11.4`);
    pkg.peerDependencies.hono = '>=4.11.4';
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
