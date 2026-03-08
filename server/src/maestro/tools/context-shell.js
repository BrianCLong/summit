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
exports.ContextShellTool = void 0;
const path_1 = __importDefault(require("path"));
let contextShellModulePromise;
function loadContextShellModule() {
    if (!contextShellModulePromise) {
        const moduleUrl = new URL('../../../../libs/context-shell/node/index.js', import.meta.url).href;
        contextShellModulePromise = Promise.resolve(`${moduleUrl}`).then(s => __importStar(require(s)));
    }
    return contextShellModulePromise;
}
class ContextShellTool {
    action;
    constructor(action) {
        this.action = action;
    }
    async execute(params, _context) {
        const root = path_1.default.resolve(params.root ?? process.cwd());
        const { createContextShell } = await loadContextShellModule();
        const ctx = createContextShell({
            root,
            fsMode: params.fsMode ?? 'readonly',
        });
        if (this.action === 'bash') {
            return ctx.bash(params.command ?? '');
        }
        if (this.action === 'readFile') {
            return ctx.readFile(params.path ?? '');
        }
        return ctx.writeFile(params.path ?? '', params.content ?? '', {
            justification: params.justification,
            format: params.format ?? 'patch',
        });
    }
}
exports.ContextShellTool = ContextShellTool;
