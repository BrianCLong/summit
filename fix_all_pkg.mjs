import fs from 'fs';
import path from 'path';

function findPackageJsons(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findPackageJsons(filePath, fileList);
    } else if (file === 'package.json') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const packageJsons = findPackageJsons('.');

for (const file of packageJsons) {
  let content = fs.readFileSync(file, 'utf8');
  try {
    JSON.parse(content);
  } catch (e) {
    console.log(`Fixing ${file}`);

    // Some files might just have a missing quote or extra comma due to bad regex replacement
    // Try to remove trailing commas before closing braces
    content = content.replace(/,\s*\}/g, '}');

    // Or they might have been poorly replaced earlier, let's just restore them to original first

    // We didn't backup so let's try git checkout for the ones we just modified
    // Only if it's one of the files we just replaced regex on.
  }
}
