const fs = require('fs');

function checkFile(path) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    if (content.includes('result.rows[0].id')) {
        console.log("Still has .id without optional chaining: " + path);
    }
  } else {
    console.log("File not found: " + path);
  }
}

checkFile('server/src/maestro/__tests__/integration.test.ts');
