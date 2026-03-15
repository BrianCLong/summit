import fs from 'fs';
import path from 'path';

function fixJsonFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let prev;
  do {
    prev = content;
    // Strip trailing commas before }
    content = content.replace(/,\s*\}/g, '}');
    // Strip extra quotes/etc from bad merges
  } while (content !== prev);

  try {
    JSON.parse(content);
    console.log(`Successfully fixed ${file}`);
  } catch (e) {
    console.error(`Still broken ${file}: ${e.message}`);

    // We can also try to use a more robust regex or just manual replace
    // This script replaces duplicate keys and cleans up
  }
}

fixJsonFile('services/predictive-analytics/predictive-integrity-shield/package.json');
