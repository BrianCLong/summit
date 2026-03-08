"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
class ConfigLoader {
    static load() {
        dotenv_1.default.config();
        const requiredVars = [
            'DATABASE_URL',
            'JWT_SECRET'
        ];
        const missing = requiredVars.filter(v => !process.env[v]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
    static get(key) {
        return process.env[key] || '';
    }
}
exports.ConfigLoader = ConfigLoader;
