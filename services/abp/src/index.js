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
exports.buildPackage = buildPackage;
const selector_1 = require("./selector");
const docker = __importStar(require("./builders/docker"));
const cnb = __importStar(require("./builders/buildpacks"));
async function buildPackage(pkg) {
    const kind = (0, selector_1.pickBuilder)(pkg);
    if (kind === 'docker')
        return docker.buildDocker({
            image: pkg.image,
            tags: pkg.tags,
            context: pkg.path,
        });
    if (kind === 'buildpacks')
        return cnb.buildCNB({ image: pkg.image, path: pkg.path });
    if (kind === 'bazel')
        return run('bazel', ['build', '//...']);
    return run('pnpm', ['turbo', 'run', 'build', '--filter', pkg.path]);
}
function run(cmd, args) {
    return new Promise((res, rej) => require('child_process').execFile(cmd, args, (e) => (e ? rej(e) : res())));
}
