"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const generated_1 = require("../sdk/typescript/src/generated");
const axios_1 = __importDefault(require("axios")); // Import AxiosRequestConfig
// Simple retry function
async function retry(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    }
    catch (error) {
        if (retries > 0) {
            console.warn(`Retrying after error: ${error}. Retries left: ${retries}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return retry(fn, retries - 1, delay * 2); // Exponential backoff
        }
        throw error;
    }
}
const createClient = (baseURL, token) => {
    // Configure the default axios instance
    axios_1.default.defaults.baseURL = baseURL;
    if (token) {
        axios_1.default.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    else {
        delete axios_1.default.defaults.headers.common['Authorization'];
    }
    const api = (0, generated_1.getMaestroOrchestrationAPI)();
    // Wrap API calls with retry logic
    const retriedApi = {};
    for (const key in api) {
        if (typeof api[key] === 'function') {
            retriedApi[key] = ((...args) => retry(() => api[key](...args)));
        }
    }
    // Return the wrapped API functions
    return retriedApi;
};
exports.createClient = createClient;
