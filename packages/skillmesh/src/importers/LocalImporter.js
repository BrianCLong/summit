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
exports.LocalImporter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const LocalSkillRegistry_1 = require("../registry/LocalSkillRegistry");
class LocalImporter {
    async import(localPath) {
        if (!await fs.pathExists(localPath)) {
            throw new Error(`Path not found: ${localPath}`);
        }
        const skills = [];
        // Check for manifest at path
        if (await fs.pathExists(path.join(localPath, 'manifest.json'))) {
            const skill = await LocalSkillRegistry_1.LocalSkillRegistry.createSkillFromPath(localPath, {
                type: 'local',
                path: localPath
            });
            skills.push(skill);
        }
        else {
            // Scan subdirs
            const entries = await fs.readdir(localPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subDir = path.join(localPath, entry.name);
                    if (await fs.pathExists(path.join(subDir, 'manifest.json'))) {
                        try {
                            const skill = await LocalSkillRegistry_1.LocalSkillRegistry.createSkillFromPath(subDir, {
                                type: 'local',
                                path: subDir
                            });
                            skills.push(skill);
                        }
                        catch (e) {
                            console.warn(`Skipping invalid skill in ${subDir}: ${e}`);
                        }
                    }
                }
            }
        }
        return skills;
    }
}
exports.LocalImporter = LocalImporter;
