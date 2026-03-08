"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommand = void 0;
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
class ConfigCommand {
    getConfigPath(global) {
        const base = global ? os_1.default.homedir() : process.cwd();
        return path_1.default.join(base, '.maestro', 'config.json');
    }
    async readConfig(global) {
        const file = this.getConfigPath(global);
        try {
            const raw = await fs_1.promises.readFile(file, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    async writeConfig(config, global) {
        const file = this.getConfigPath(global);
        await fs_1.promises.mkdir(path_1.default.dirname(file), { recursive: true });
        await fs_1.promises.writeFile(file, JSON.stringify(config, null, 2), 'utf8');
    }
    async get(key) {
        const config = await this.readConfig(false);
        // eslint-disable-next-line no-console
        console.log(config[key] ?? '<unset>');
    }
    async set(key, value, options) {
        const config = await this.readConfig(options.global);
        config[key] = value;
        await this.writeConfig(config, options.global);
        // eslint-disable-next-line no-console
        console.log(`Set ${key}`);
    }
    async list(options) {
        const config = await this.readConfig(options.global);
        Object.entries(config).forEach(([key, value]) => {
            // eslint-disable-next-line no-console
            console.log(`${key} = ${value}`);
        });
    }
}
exports.ConfigCommand = ConfigCommand;
