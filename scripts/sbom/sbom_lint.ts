import fs from 'fs';

const MAX_LICENSE_TEXT_SIZE = 32 * 1024; // 32KB
const FORBIDDEN_PATHS = ['../', '/etc/', '/proc/', '/var/', 'C:\\', 'C:/'];
const SECRET_MARKERS = [
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN OPENSSH PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
  '-----BEGIN PRIVATE KEY-----'
];

interface LintResult {
  file: string;
  errors: string[];
}

const lintFile = (filePath: string): LintResult => {
  const result: LintResult = { file: filePath, errors: [] };

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Secret Markers Check
    for (const marker of SECRET_MARKERS) {
      if (content.includes(marker)) {
        result.errors.push(`Found secret marker: ${marker}`);
      }
    }

    // 2. Forbidden Path Check (Global)
    for (const badPath of FORBIDDEN_PATHS) {
        if (content.includes(badPath)) {
             result.errors.push(`Found forbidden path pattern: ${badPath}`);
        }
    }

    // 3. License Text Size Check
    const sbom = JSON.parse(content);
    // Support CycloneDX components
    const components = sbom.components || [];
    for (const comp of components) {
      if (comp.licenses) {
        for (const l of comp.licenses) {
           if (l.license && l.license.text && l.license.text.content) {
              if (l.license.text.content.length > MAX_LICENSE_TEXT_SIZE) {
                 result.errors.push(`License text in component ${comp.name} exceeds limit (${l.license.text.content.length} > ${MAX_LICENSE_TEXT_SIZE})`);
              }
           }
        }
      }
    }

  } catch (e) {
    result.errors.push(`Failed to parse/read file: ${e}`);
  }

  return result;
};

const main = () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: tsx sbom_lint.ts <sbom-file>...');
    process.exit(1);
  }

  let failed = false;
  for (const file of args) {
    const res = lintFile(file);
    if (res.errors.length > 0) {
      console.error(`Lint errors in ${res.file}:`);
      res.errors.forEach(e => console.error(`  - ${e}`));
      failed = true;
    } else {
      console.log(`PASS: ${res.file}`);
    }
  }

  if (failed) process.exit(1);
};

main();
