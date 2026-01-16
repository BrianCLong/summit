import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = 'docs/customer-security/hardening';

function lint() {
  const files = fs.readdirSync(DOCS_DIR);
  let hasError = false;

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');

      // Rule 1: Must have an Overview
      if (!content.includes('## Overview')) {
        console.error(`ERROR: ${file} missing "Overview" section.`);
        hasError = true;
      }

      // Rule 2: No internal links (rudimentary check)
      if (content.includes('http://internal.summit.com')) {
        console.error(`ERROR: ${file} contains internal links.`);
        hasError = true;
      }
    }
  });

  if (hasError) {
    process.exit(1);
  }
}

lint();
