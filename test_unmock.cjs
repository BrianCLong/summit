const fs = require('fs');
const file = 'server/src/maestro/__tests__/integration.test.ts';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes("jest.unmock('pg')")) {
    content = "jest.unmock('pg');\n" + content;
    fs.writeFileSync(file, content);
}
