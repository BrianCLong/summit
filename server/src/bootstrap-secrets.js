"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapSecrets = bootstrapSecrets;
const SecretManager_js_1 = require("./lib/secrets/SecretManager.js");
const logger_js_1 = require("./config/logger.js");
/**
 * Bootstraps the application secrets.
 * Must be called before any configuration is loaded.
 */
async function bootstrapSecrets() {
    try {
        logger_js_1.logger.info('Bootstrapping secrets...');
        await SecretManager_js_1.SecretManager.initialize({
            provider: process.env.VAULT_ADDR ? 'vault' : 'env',
            vaultUrl: process.env.VAULT_ADDR,
            vaultToken: process.env.VAULT_TOKEN,
        });
        const manager = SecretManager_js_1.SecretManager.getInstance();
        // List of secrets to load into env for compatibility
        const secretsToLoad = [
            'DATABASE_URL',
            'NEO4J_PASSWORD',
            'REDIS_PASSWORD',
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY'
        ];
        await manager.loadSecretsToEnv(secretsToLoad);
        logger_js_1.logger.info('Secrets bootstrapped successfully.');
    }
    catch (error) {
        logger_js_1.logger.error(`Failed to bootstrap secrets: ${error}`);
        process.exit(1);
    }
}
