#!/usr/bin/env node
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
const commander_1 = require("commander");
const GitImporter_1 = require("../importers/GitImporter");
const LocalImporter_1 = require("../importers/LocalImporter");
const LocalSkillRegistry_1 = require("../registry/LocalSkillRegistry");
const SyncEngine_1 = require("../registry/SyncEngine");
const CursorAdapter_1 = require("../adapters/CursorAdapter");
const path = __importStar(require("path"));
const program = new commander_1.Command();
program
    .name('skillmesh')
    .description('SkillMesh Hub CLI')
    .version('0.1.0');
program
    .command('install')
    .description('Install a skill from a Git URL or local path')
    .argument('<source>', 'Git URL or local path')
    .option('--branch <branch>', 'Git branch to checkout')
    .option('--path <path>', 'Subpath within the repo')
    .action(async (source, options) => {
    try {
        const registry = new LocalSkillRegistry_1.LocalSkillRegistry();
        await registry.init();
        // Detect if source is URL or local path
        let skills = [];
        if (source.startsWith('http') || source.startsWith('git@')) {
            const importer = new GitImporter_1.GitImporter();
            skills = await importer.import(source, options.branch, options.path);
        }
        else {
            const importer = new LocalImporter_1.LocalImporter();
            skills = await importer.import(path.resolve(source));
        }
        if (skills.length === 0) {
            console.log('No skills found.');
            return;
        }
        console.log(`Found ${skills.length} skills.`);
        // Register skills
        for (const skill of skills) {
            await registry.addSkill(skill);
            console.log(`Registered skill: ${skill.manifest.name}`);
        }
        // Sync
        const adapters = [new CursorAdapter_1.CursorAdapter()];
        const syncEngine = new SyncEngine_1.SyncEngine(adapters);
        await syncEngine.syncAll(skills);
        console.log('Installation complete.');
    }
    catch (error) {
        console.error('Error installing skill:', error);
        process.exit(1);
    }
});
program
    .command('sync')
    .description('Sync all installed skills to adapters')
    .action(async () => {
    try {
        const registry = new LocalSkillRegistry_1.LocalSkillRegistry();
        await registry.init();
        const skills = await registry.listSkills();
        const adapters = [new CursorAdapter_1.CursorAdapter()];
        const syncEngine = new SyncEngine_1.SyncEngine(adapters);
        await syncEngine.syncAll(skills);
        console.log('Sync complete.');
    }
    catch (error) {
        console.error('Error syncing skills:', error);
        process.exit(1);
    }
});
program
    .command('list')
    .description('List installed skills')
    .action(async () => {
    try {
        const registry = new LocalSkillRegistry_1.LocalSkillRegistry();
        await registry.init();
        const skills = await registry.listSkills();
        if (skills.length === 0) {
            console.log('No skills installed.');
            return;
        }
        console.log('Installed skills:');
        for (const skill of skills) {
            console.log(`- ${skill.manifest.name} (${skill.manifest.version}) [${skill.source.type}]`);
        }
    }
    catch (error) {
        console.error('Error listing skills:', error);
        process.exit(1);
    }
});
program.parse();
