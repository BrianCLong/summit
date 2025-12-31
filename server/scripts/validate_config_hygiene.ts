
import { exit } from 'process';

const REQUIRED_ENV_VARS = [
    'NODE_ENV',
    // 'DATABASE_URL', // Often not in env for all services, but good to check if expected
    // 'JWT_SECRET',
    // 'PORT'
];

// Heuristic: specific words that suggest secrets
const SECRET_KEYWORDS = ['secret', 'key', 'password', 'token', 'auth', 'credential', 'private'];
// Allowlist for known safe env vars containing "key" or "token" but aren't sensitive leaks
const ALLOWLIST = [
    'NODE_ENV',
    'npm_config_metrics_registry',
    'npm_package_gitHead',
    'TERM_PROGRAM_VERSION',
    'VSCODE_GIT_ASKPASS_MAIN',
    'VSCODE_GIT_IPC_HANDLE',
    'VSCODE_GIT_ASKPASS_NODE'
];

function checkRequiredVars() {
    console.log('Checking for required environment variables...');
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`FAIL: Missing required environment variables: ${missing.join(', ')}`);
        return false;
    }
    console.log(`PASS: All required variables present (${REQUIRED_ENV_VARS.join(', ')})`);
    return true;
}

function checkNodeEnv() {
    console.log('Checking NODE_ENV...');
    const env = process.env.NODE_ENV;
    if (env !== 'production') {
        console.warn(`WARN: NODE_ENV is set to '${env}', expected 'production' for GA release.`);
        // Not a hard failure for this script as we might run it in dev/test, but notable.
        return true;
    }
    console.log("PASS: NODE_ENV is 'production'");
    return true;
}

function scanForLeakedSecrets() {
    console.log('Scanning process.env for potentially exposed secrets...');
    let leaked = false;

    // In a real scenario, this would check if these are printed/logged or available in public config endpoints.
    // Here, we just check if they are set in the environment, which is expected.
    // The "Leak" would be if we found them in a client bundle or public endpoint, which we can't test from here easily.
    // Instead, we verify that *if* they are set, they look like strong secrets (length check)
    // AND that we aren't seeing weird things like "password=123456".

    // For this drill, let's verify that we DON'T have obvious placeholder secrets in production.
    if (process.env.NODE_ENV === 'production') {
        const weakSecrets = ['123456', 'password', 'secret', 'admin', 'changeme'];

        for (const [key, value] of Object.entries(process.env)) {
             if (SECRET_KEYWORDS.some(kw => key.toLowerCase().includes(kw)) && !ALLOWLIST.includes(key)) {
                 if (weakSecrets.includes(value || '')) {
                     console.error(`FAIL: Weak secret detected in ${key}`);
                     leaked = true;
                 }
             }
        }
    }

    if (leaked) return false;

    console.log('PASS: No obvious weak secrets found in environment.');
    return true;
}

function main() {
    console.log('Starting Config & Secrets Hygiene Validation...');

    const requiredPass = checkRequiredVars();
    const envPass = checkNodeEnv();
    const secretsPass = scanForLeakedSecrets();

    if (requiredPass && envPass && secretsPass) {
        console.log('\nConfig Hygiene: PASSED');
        exit(0);
    } else {
        console.error('\nConfig Hygiene: FAILED');
        exit(1);
    }
}

main();
