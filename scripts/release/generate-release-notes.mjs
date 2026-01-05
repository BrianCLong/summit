import { execSync } from 'child_process';
import path from 'path';

// Argument: TAG
const tag = process.argv[2];
if (!tag) { console.error("No tag provided"); process.exit(1); }

const findPrevScript = path.resolve('scripts/release/find-prev-tag.mjs');
let prevTag = "";
try {
  // Use find-prev-tag logic to get the previous tag
  prevTag = execSync(`node ${findPrevScript} ${tag}`).toString().trim();
} catch (e) {
  console.error("Error finding previous tag", e);
}

console.log("# Release Notes");
console.log(`\n**Generated:** ${new Date().toISOString()}`);
console.log(`\nPrevious tag selected: ${prevTag || "none"}`);

let range = "none";
if (prevTag) {
  range = `${prevTag}..${tag}`;
  console.log(`Compare range: ${range}`);
  console.log(`\n## Changes since ${prevTag}`);
  try {
     const logs = execSync(`git log --pretty=format:"- %s (%h) - %an" --no-merges ${range}`).toString();
     console.log(logs);
  } catch (e) {
     console.log("Error generating logs: " + e.message);
  }
} else {
  console.log(`Compare range: ${range}`);
  console.log("\n## All Changes (last 200)");
  try {
     const logs = execSync(`git log -n 200 --pretty=format:"- %s (%h) - %an" --no-merges`).toString();
     console.log(logs);
  } catch (e) {
     console.log("Error generating logs: " + e.message);
  }
  console.log("\n**Note:** No previous tag found.");
}

console.log("\n\n---\n🤖 Auto-generated release notes");
