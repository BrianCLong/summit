const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Since we are in a script, we might need to install glob or use a simpler approach.
// For simplicity in this CI script, let's assume we can use basic fs or that glob is available.
// If glob is not available, we can use a recursive readdir function.

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

const evidenceDir = 'evidence';
if (!fs.existsSync(evidenceDir)) {
    console.log('No evidence directory found.');
    process.exit(0);
}

const files = getAllFiles(evidenceDir);
let hasError = false;

files.forEach(file => {
    if (file.endsWith('.json')) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const data = JSON.parse(content);
            // Basic check: if it has an id, ensure it matches filename or some pattern if required
            // For now, we just validate it is valid JSON
        } catch (e) {
            console.error(`Invalid JSON in file: ${file}`, e);
            hasError = true;
        }
    }
});

if (hasError) {
    process.exit(1);
} else {
    console.log('All evidence files verified.');
}
