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
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
rl.on('line', (line) => {
    if (!line.trim())
        return;
    try {
        const msg = JSON.parse(line);
        handleMessage(msg);
    }
    catch (e) {
        // ignore
    }
});
function handleMessage(msg) {
    if (msg.method === 'initialize') {
        const response = {
            jsonrpc: '2.0',
            id: msg.id,
            result: {
                protocolVersion: '2025-06-18',
                capabilities: {},
                serverInfo: {
                    name: 'echo-server',
                    version: '1.0.0'
                }
            }
        };
        console.log(JSON.stringify(response));
    }
    else if (msg.method === 'tools/list') {
        const response = {
            jsonrpc: '2.0',
            id: msg.id,
            result: {
                tools: [{
                        name: 'echo',
                        description: 'Echoes back the input',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string' }
                            }
                        }
                    }]
            }
        };
        console.log(JSON.stringify(response));
    }
    else if (msg.method === 'tools/call') {
        if (msg.params.name === 'echo') {
            const response = {
                jsonrpc: '2.0',
                id: msg.id,
                result: {
                    content: [{
                            type: 'text',
                            text: msg.params.arguments.message
                        }]
                }
            };
            console.log(JSON.stringify(response));
        }
    }
}
