"use strict";
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
exports.listRecipes = listRecipes;
exports.loadRecipe = loadRecipe;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function listRecipes() {
    const dir = node_path_1.default.join(process.cwd(), 'recipes');
    try {
        return node_fs_1.default
            .readdirSync(dir)
            .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    }
    catch {
        return [];
    }
}
async function loadRecipe(name) {
    const p = node_path_1.default.join(process.cwd(), 'recipes', name);
    const y = node_fs_1.default.readFileSync(p, 'utf8');
    // Lazy import to avoid bundling when not needed
    try {
        const YAML = (await Promise.resolve().then(() => __importStar(require('yaml')))).default;
        return YAML.parse(y);
    }
    catch {
        return { __error: 'YAML module not installed', raw: y };
    }
}
