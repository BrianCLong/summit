const fs = require('fs');

const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const targetVersion = rootPkg.version;

const updateVersion = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            pkg.version = targetVersion;
            fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
            console.log(`Updated ${filePath} to version ${targetVersion}`);
        }
    } catch (err) {
        console.error(`Error updating ${filePath}:`, err);
    }
};

updateVersion('server/package.json');
updateVersion('client/package.json');
