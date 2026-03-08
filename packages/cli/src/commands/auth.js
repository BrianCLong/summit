"use strict";
/**
 * Summit CLI Auth Commands
 *
 * Authentication commands.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 *
 * @module @summit/cli/commands/auth
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
/* eslint-disable no-console */
const chalk_1 = __importDefault(require("chalk"));
const config_js_1 = require("../config.js");
/**
 * Login to Summit platform
 */
async function login(options) {
    await (0, config_js_1.loadConfig)();
    // Update URL if provided
    if (options.url) {
        await (0, config_js_1.saveConfig)({ baseUrl: options.url });
    }
    const config = (0, config_js_1.getConfig)();
    if (!(0, config_js_1.isConfigured)() && !options.url) {
        console.error(chalk_1.default.red('CLI not configured. Run `summit config init` first or provide --url.'));
        process.exit(1);
    }
    // API Key authentication
    if (options.apiKey) {
        console.log(chalk_1.default.blue('Authenticating with API key...'));
        try {
            const response = await fetch(`${config.baseUrl}/auth/api-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: options.apiKey }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
                console.error(chalk_1.default.red(`Login failed: ${errorData.error || errorData.message}`));
                process.exit(1);
            }
            const data = (await response.json());
            await (0, config_js_1.saveConfig)({
                apiKey: options.apiKey,
                token: data.data.token,
                tenantId: data.data.user.tenantId,
            });
            console.log(chalk_1.default.green('\nAuthenticated successfully!'));
            console.log(`User:   ${data.data.user.email}`);
            console.log(`Tenant: ${data.data.user.tenantId}`);
            console.log(`Role:   ${data.data.user.role}`);
            return;
        }
        catch (err) {
            console.error(chalk_1.default.red(`Login failed: ${err.message}`));
            process.exit(1);
        }
    }
    // Interactive email/password authentication
    const readline = await Promise.resolve().then(() => __importStar(require('readline')));
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt, hidden = false) => {
        return new Promise((resolve) => {
            if (hidden) {
                // Simple hidden input (basic implementation)
                process.stdout.write(prompt);
                let input = '';
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.setEncoding('utf8');
                const onData = (char) => {
                    if (char === '\n' || char === '\r') {
                        process.stdin.setRawMode(false);
                        process.stdin.removeListener('data', onData);
                        process.stdout.write('\n');
                        resolve(input);
                    }
                    else if (char === '\u0003') {
                        // Ctrl+C
                        process.exit();
                    }
                    else if (char === '\u007F') {
                        // Backspace
                        input = input.slice(0, -1);
                    }
                    else {
                        input += char;
                    }
                };
                process.stdin.on('data', onData);
            }
            else {
                rl.question(prompt, resolve);
            }
        });
    };
    try {
        const email = options.email || await question('Email: ');
        const password = await question('Password: ', true);
        console.log(chalk_1.default.blue('\nAuthenticating...'));
        const response = await fetch(`${config.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
            console.error(chalk_1.default.red(`Login failed: ${errorData.error || errorData.message}`));
            process.exit(1);
        }
        const data = (await response.json());
        await (0, config_js_1.saveConfig)({
            token: data.data.token,
            tenantId: data.data.user.tenantId,
        });
        console.log(chalk_1.default.green('\nAuthenticated successfully!'));
        console.log(`User:   ${data.data.user.email}`);
        console.log(`Tenant: ${data.data.user.tenantId}`);
        console.log(`Role:   ${data.data.user.role}`);
    }
    finally {
        rl.close();
    }
}
/**
 * Logout from Summit platform
 */
async function logout() {
    await (0, config_js_1.loadConfig)();
    const config = (0, config_js_1.getConfig)();
    if (config.token) {
        try {
            await fetch(`${config.baseUrl}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.token}`,
                },
            });
        }
        catch {
            // Ignore logout errors
        }
    }
    await (0, config_js_1.saveConfig)({
        token: undefined,
        apiKey: undefined,
    });
    console.log(chalk_1.default.green('Logged out successfully.'));
}
