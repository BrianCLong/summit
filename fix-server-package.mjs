import fs from 'fs';

let content = fs.readFileSync('server/package.json', 'utf8');

// Remove git conflict markers
let lines = content.split('\n');
let result = [];
let inConflict = false;

for (let line of lines) {
    if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        continue;
    }
    if (line.startsWith('=======')) {
        continue;
    }
    if (line.startsWith('>>>>>>>')) {
        inConflict = false;
        continue;
    }

    if (!inConflict) {
        result.push(line);
    }
}

content = result.join('\n');

// Fix unquoted keys in dependencies and devDependencies
content = content.replace(/([^{}\s",:]+):\s*"/g, '"$1": "');

try {
    JSON.parse(content);
    fs.writeFileSync('server/package.json', content);
    console.log('Fixed server/package.json');
} catch (e) {
    console.error('Still invalid JSON:', e.message);
}
