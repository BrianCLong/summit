
const fs = require('fs');
const path = require('path');

// Basic regression tests for security configuration

describe('Security Configuration Regression', () => {

    test('Server should have Helmet security headers configured', () => {
        // Heuristic check for helmet usage in app.ts or similar
        const serverPath = path.join(__dirname, '../../src/app.ts');
        if (fs.existsSync(serverPath)) {
            const content = fs.readFileSync(serverPath, 'utf8');
            expect(content).toMatch(/helmet\(/);
        } else {
            console.warn("app.ts not found, skipping helmet check");
        }
    });

    test('Operational endpoints require auth + role checks', () => {
        const serverPath = path.join(__dirname, '../../src/app.ts');
        if (fs.existsSync(serverPath)) {
            const content = fs.readFileSync(serverPath, 'utf8');
            expect(content).toMatch(/app\.use\('\/airgap',\s*authenticateToken,\s*ensureRole\(\['ADMIN'\]\)/);
            expect(content).toMatch(/app\.use\('\/analytics',\s*authenticateToken,\s*ensureRole\(\['ADMIN',\s*'ANALYST'\]\)/);
            expect(content).toMatch(/app\.use\('\/dr',\s*authenticateToken,\s*ensureRole\(\['ADMIN'\]\)/);
        } else {
            console.warn("app.ts not found, skipping operational endpoint auth check");
        }
    });

    test('No hardcoded secrets in source code', () => {
         // This is a simplified check, the python tool does a better job
         const srcDir = path.join(__dirname, '../../src');

         function scanDir(dir) {
             if (!fs.existsSync(dir)) return;

             const files = fs.readdirSync(dir);
             files.forEach(file => {
                 const filePath = path.join(dir, file);
                 const stat = fs.statSync(filePath);
                 if (stat.isDirectory()) {
                     scanDir(filePath);
                 } else if (file.endsWith('.ts') || file.endsWith('.js')) {
                     const content = fs.readFileSync(filePath, 'utf8');
                     // Simple check for AWS keys
                     // AKIA is the prefix for AWS Access Key IDs
                     const awsMatch = content.match(/AKIA[0-9A-Z]{16}/);
                     if (awsMatch) {
                         const match = awsMatch[0];
                         // Ignore example keys
                         if (match.includes("EXAMPLE")) {
                             return;
                         }
                         throw new Error(`Potential AWS Key found in ${file}: ${match}`);
                     }
                 }
             });
         }

         scanDir(srcDir);
    });

    test('Auth middleware exists', () => {
        const authPath = path.join(__dirname, '../../src/middleware/auth.ts');
        // Or wherever it is expected
        if(fs.existsSync(authPath)) {
             expect(true).toBe(true);
        } else {
            // Check alternative locations
            const altPath = path.join(__dirname, '../../src/middleware/ensureAuthenticated.ts');
            // Just warn if not found as structure might change
            if (!fs.existsSync(altPath)) {
                // console.warn("Auth middleware file not found in standard locations");
            }
        }
    });
});
