import { getSortedTags, parseTag, compareTags } from './semver-tags.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function findPreviousTag(current, allTags) {
  let prevTag = null;

  if (current.isGa) {
    // For GA vX.Y.Z: previous = latest GA < vX.Y.Z
    for (let i = allTags.length - 1; i >= 0; i--) {
      const t = allTags[i];
      if (t.isGa && compareTags(t, current) < 0) {
        prevTag = t;
        break;
      }
    }

    // Fallback: ignore RC unless no GA exists
    if (!prevTag) {
       for (let i = allTags.length - 1; i >= 0; i--) {
          const t = allTags[i];
          if (compareTags(t, current) < 0) {
            prevTag = t;
            break;
          }
        }
    }
  } else {
    // For RC vX.Y.Z-rc.N
    const targetPrevRc = (current.rc || 0) - 1;

    if (targetPrevRc >= 1) {
       const expectedPrev = `v${current.major}.${current.minor}.${current.patch}-rc.${targetPrevRc}`;
       const found = allTags.find(t => t.original === expectedPrev);
       if (found) {
         prevTag = found;
       }
    }

    if (!prevTag) {
      // else latest GA < X.Y.Z
      for (let i = allTags.length - 1; i >= 0; i--) {
          const t = allTags[i];
          if (t.isGa && compareTags(t, current) < 0) {
            prevTag = t;
            break;
          }
      }
    }
  }
  return prevTag;
}

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  const currentTagStr = process.argv[2];
  if (!currentTagStr) {
    console.error("Usage: node find-prev-tag.mjs <TAG>");
    process.exit(1);
  }

  const current = parseTag(currentTagStr);
  if (!current) {
    console.error(`Invalid tag format: ${currentTagStr}`);
    process.exit(1);
  }

  const allTags = getSortedTags();
  const prevTag = findPreviousTag(current, allTags);

  const result = {
    current: currentTagStr,
    previous: prevTag ? prevTag.original : null
  };

  if (result.previous) {
    console.log(result.previous);
  }

  const distDir = path.resolve('dist/release');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(path.join(distDir, 'prev-tag.json'), JSON.stringify(result, null, 2));
}
