const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sbom') config.sbomPath = args[++i];
    else if (args[i] === '--trivy') config.trivyPath = args[++i];
    else if (args[i] === '--output') config.outputPath = args[++i];
  }
  return config;
}

function main() {
  const config = parseArgs();

  if (!config.sbomPath || !config.trivyPath || !config.outputPath) {
    console.error("Usage: node generate-opa-input.js --sbom <path> --trivy <path> --output <path>");
    process.exit(1);
  }

  const input = {
    type: "container_image", // Default context for now
    timestamp: new Date().toISOString(),
    sbom: null,
    vulnerability_scan: {
      vulnerabilities: []
    }
  };

  // Load SBOM
  try {
    if (fs.existsSync(config.sbomPath)) {
      const sbomRaw = fs.readFileSync(config.sbomPath, 'utf8');
      input.sbom = JSON.parse(sbomRaw);
    } else {
      console.warn(`SBOM file not found at ${config.sbomPath}`);
    }
  } catch (e) {
    console.error(`Failed to read/parse SBOM: ${e.message}`);
  }

  // Load Trivy Results
  try {
    if (fs.existsSync(config.trivyPath)) {
      const trivyRaw = fs.readFileSync(config.trivyPath, 'utf8');
      const trivyJson = JSON.parse(trivyRaw);

      // Flatten vulnerabilities
      if (trivyJson.Results) {
        trivyJson.Results.forEach(result => {
          if (result.Vulnerabilities) {
            result.Vulnerabilities.forEach(v => {
              input.vulnerability_scan.vulnerabilities.push({
                id: v.VulnerabilityID,
                severity: v.Severity,
                package: v.PkgName,
                version: v.InstalledVersion,
                title: v.Title,
                description: v.Description
              });
            });
          }
        });
      }
    } else {
      console.warn(`Trivy file not found at ${config.trivyPath}`);
    }
  } catch (e) {
    console.error(`Failed to read/parse Trivy JSON: ${e.message}`);
  }

  fs.writeFileSync(config.outputPath, JSON.stringify(input, null, 2));
  console.log(`Generated OPA input at ${config.outputPath}`);
}

main();
