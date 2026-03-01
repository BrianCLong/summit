const fs = require('fs');
const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = rootPkg.version;

const serverPkgPath = 'server/package.json';
const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf8'));
serverPkg.version = version;
fs.writeFileSync(serverPkgPath, JSON.stringify(serverPkg, null, 2));

const clientPkgPath = 'client/package.json';
const clientPkg = JSON.parse(fs.readFileSync(clientPkgPath, 'utf8'));
clientPkg.version = version;
fs.writeFileSync(clientPkgPath, JSON.stringify(clientPkg, null, 2));

console.log('Set all versions to', version);
