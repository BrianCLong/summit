"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitCommand = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const TEMPLATE_REGISTRY = {
    default: {
        name: 'maestro-workflow',
        version: '1.0.0',
        stages: [
            {
                name: 'setup',
                steps: [{ run: 'shell', with: { command: 'npm install' } }],
            },
            {
                name: 'test',
                steps: [{ run: 'shell', with: { command: 'npm test' } }],
            },
            {
                name: 'build',
                steps: [{ run: 'shell', with: { command: 'npm run build' } }],
            },
        ],
    },
};
class InitCommand {
    async execute(options) {
        const targetDir = options.directory
            ? path_1.default.resolve(process.cwd(), options.directory)
            : process.cwd();
        await fs_1.promises.mkdir(targetDir, { recursive: true });
        const templateName = options.template || 'default';
        const template = TEMPLATE_REGISTRY[templateName] || TEMPLATE_REGISTRY.default;
        const filePath = path_1.default.join(targetDir, 'maestro.yaml');
        const contents = js_yaml_1.default.dump(template, { indent: 2 });
        await fs_1.promises.writeFile(filePath, contents, 'utf8');
        // eslint-disable-next-line no-console
        console.log(`✓ Created workflow at ${filePath}`);
    }
}
exports.InitCommand = InitCommand;
