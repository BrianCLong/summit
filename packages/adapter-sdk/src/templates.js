"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAdapterProject = initAdapterProject;
// @ts-nocheck
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const currentDir = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
const templatesRoot = node_path_1.default.resolve(currentDir, '../templates');
async function initAdapterProject(options) {
    const source = node_path_1.default.join(templatesRoot, options.template);
    if (!(await fs_extra_1.default.pathExists(source))) {
        throw new Error(`Template "${options.template}" was not found in ${templatesRoot}.`);
    }
    const target = node_path_1.default.isAbsolute(options.directory)
        ? options.directory
        : node_path_1.default.resolve(process.cwd(), options.directory);
    if (await fs_extra_1.default.pathExists(target)) {
        if (!options.force) {
            throw new Error(`Target directory ${target} already exists. Re-run with --force to overwrite.`);
        }
        await fs_extra_1.default.emptyDir(target);
    }
    await fs_extra_1.default.ensureDir(target);
    await fs_extra_1.default.copy(source, target, { overwrite: true, errorOnExist: !options.force });
    return target;
}
