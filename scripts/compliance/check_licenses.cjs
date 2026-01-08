const checker = require("license-checker");
const path = require("path");

// Allowlist based on policy
const ALLOWED_LICENSES = [
  "MIT",
  "Apache-2.0",
  "Apache 2.0",
  "BSD",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Unlicense",
  "CC0-1.0",
  "MPL-2.0",
  "PSF",
  "Python-2.0",
  "BlueOak-1.0.0",
  "0BSD",
];

const IGNORED_PACKAGES = [
  // Add specific packages here if needed
];

console.log("Starting license check...");

checker.init(
  {
    start: path.resolve(__dirname, "../../"),
    production: true, // Only check production dependencies
    excludePrivatePackages: true,
  },
  function (err, packages) {
    if (err) {
      console.error("Error running license checker:", err);
      process.exit(1);
    }

    let failed = false;
    const violations = [];

    Object.keys(packages).forEach((pkg) => {
      if (IGNORED_PACKAGES.includes(pkg)) return;

      const license = packages[pkg].licenses;
      const licenseType = Array.isArray(license) ? license[0] : license;
      const cleanLicense = licenseType ? licenseType.replace(/\*$/, "").trim() : "UNKNOWN";

      const isAllowed = ALLOWED_LICENSES.some((allowed) => {
        return (
          cleanLicense === allowed ||
          cleanLicense.startsWith(allowed) ||
          cleanLicense.indexOf(allowed) > -1
        );
      });

      if (!isAllowed) {
        violations.push({ package: pkg, license: cleanLicense });
        failed = true;
      }
    });

    if (failed) {
      console.error("❌ FAILED: Found non-compliant licenses:");
      violations.forEach((v) => {
        console.error(`  - ${v.package}: ${v.license}`);
      });
      process.exit(1);
    } else {
      console.log("✅ SUCCESS: All dependencies have allowed licenses.");
      process.exit(0);
    }
  }
);
