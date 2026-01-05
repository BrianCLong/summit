import { parseTag, listSortedTags, compareTags } from './semver-tags.mjs';
import fs from 'node:fs';
import path from 'node:path';

// Parse arguments: TAG=v...
const args = process.argv.slice(2);
const tagArg = args.find(arg => arg.startsWith('TAG='));
const currentTagRaw = tagArg ? tagArg.split('=')[1] : process.env.TAG;

if (!currentTagRaw) {
  console.error('Usage: node find-prev-tag.mjs TAG=vX.Y.Z[-rc.N]');
  process.exit(1);
}

const current = parseTag(currentTagRaw);
if (!current) {
  console.error(`Error: Invalid tag format '${currentTagRaw}'. expected vX.Y.Z or vX.Y.Z-rc.N`);
  process.exit(1);
}

const allTags = listSortedTags();
// Filter out the current tag if it exists in the list (to avoid comparing with itself)
const otherTags = allTags.filter(t => t.raw !== current.raw);

let prevTag = null;

if (current.channel === 'ga') {
  // GA tag vX.Y.Z
  // Previous tag should be the latest GA < vX.Y.Z
  // Ignore RCs unless no GA exists

  const candidates = otherTags.filter(t => {
      // Must be semver less than current
      if (compareTags(t, current) >= 0) return false;
      return t.channel === 'ga';
  });

  if (candidates.length > 0) {
      prevTag = candidates[candidates.length - 1];
  } else {
       // fallback: max(all tags < current version)
       const allCandidates = otherTags.filter(t => compareTags(t, current) < 0);
       if (allCandidates.length > 0) {
           prevTag = allCandidates[allCandidates.length - 1];
       }
  }

} else {
  // RC tag vX.Y.Z-rc.N
  if (current.rc > 1) {
      // Check if vX.Y.Z-rc.(N-1) exists
      const targetRaw = `v${current.major}.${current.minor}.${current.patch}-rc.${current.rc - 1}`;
      const found = otherTags.find(t => t.raw === targetRaw);
      if (found) {
          prevTag = found;
      } else {
          // If strict N-1 doesn't exist, fall back to latest GA < vX.Y.Z
          const currentGA = { ...current, channel: 'ga', rc: null };
          const candidates = otherTags.filter(t => {
             if (t.channel !== 'ga') return false;
             return compareTags(t, currentGA) < 0;
          });

          if (candidates.length > 0) {
              prevTag = candidates[candidates.length - 1];
          }
      }
  } else {
      // rc.1
      // latest GA < vX.Y.Z if any
       const currentGA = { ...current, channel: 'ga', rc: null };
       const candidates = otherTags.filter(t => {
           if (t.channel !== 'ga') return false;
           return compareTags(t, currentGA) < 0;
       });

       if (candidates.length > 0) {
           prevTag = candidates[candidates.length - 1];
       }
  }
}

const prevTagRaw = prevTag ? prevTag.raw : '';
console.log(prevTagRaw);

// Write to json
const distDir = path.resolve('dist', 'release');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const result = {
    current: currentTagRaw,
    previous: prevTagRaw
};

fs.writeFileSync(path.join(distDir, 'prev-tag.json'), JSON.stringify(result, null, 2));

// Update GitHub Step Summary if running in GitHub Actions
if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `
### Previous Tag Selection
* **Current Tag:** \`${currentTagRaw}\`
* **Previous Tag:** \`${prevTagRaw || 'None'}\`
* **Range:** \`${prevTagRaw ? prevTagRaw + '..' + currentTagRaw : 'Initial commit'}\`
`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
