/**
 * pnpm hook file to handle package modifications
 * See: https://pnpm.io/pnpmfile
 */

function readPackage(pkg, context) {
  // Override xlsx in @nlpjs/xtables to use patched version
  if (pkg.name === "@nlpjs/xtables") {
    if (pkg.dependencies && pkg.dependencies.xlsx) {
      context.log(`Overriding xlsx version in ${pkg.name}`);
      pkg.dependencies.xlsx = "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
