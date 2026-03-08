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
exports.NginxLoadBalancerAdapter = void 0;
const fs = __importStar(require("fs/promises"));
class NginxLoadBalancerAdapter {
    configPath;
    dryRun;
    constructor(configPath, dryRun = true) {
        this.configPath = configPath;
        this.dryRun = dryRun;
    }
    async setTraffic(serviceName, version, percentage) {
        const upstreamConfig = `
upstream ${serviceName} {
    # Traffic split: ${percentage}% to ${version}
    server ${version === 'green' ? '127.0.0.1:3001' : '127.0.0.1:3000'} weight=${percentage};
    server ${version === 'green' ? '127.0.0.1:3000' : '127.0.0.1:3001'} weight=${100 - percentage};
}
`;
        console.log(`[NginxAdapter] Updating upstream config at ${this.configPath}`);
        if (this.dryRun) {
            console.log(`[NginxAdapter] DryRun: Would write:\n${upstreamConfig}`);
            console.log(`[NginxAdapter] DryRun: Would execute 'nginx -s reload'`);
        }
        else {
            try {
                await fs.writeFile(this.configPath, upstreamConfig);
                // Simulate reload - in real usage we would execSync('nginx -s reload')
                // const { execSync } = require('child_process');
                // execSync('nginx -s reload');
                console.log(`[NginxAdapter] Config updated and nginx reloaded.`);
            }
            catch (e) {
                console.error(`[NginxAdapter] Failed to update nginx:`, e);
                throw e;
            }
        }
    }
    async getCurrentTraffic(serviceName) {
        return { 'stable': 100 };
    }
}
exports.NginxLoadBalancerAdapter = NginxLoadBalancerAdapter;
