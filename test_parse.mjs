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
let allGood = true;

for (const file of packageJsons) {
  let content = fs.readFileSync(file, 'utf8');
  try {
    JSON.parse(content);
  } catch (e) {
    console.log(`Failed to parse ${file}: ${e.message}`);
    allGood = false;
  }
}

if (allGood) {
  console.log("All package.json files parsed successfully!");
}
