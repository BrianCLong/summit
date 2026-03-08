"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCommand = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const BUILT_IN_TEMPLATES = {
    'build-basic': {
        name: 'build-basic',
        stages: [
            { name: 'install', steps: [{ run: 'shell', with: { command: 'npm ci' } }] },
            { name: 'test', steps: [{ run: 'shell', with: { command: 'npm test' } }] },
        ],
    },
    'scrape-site': {
        name: 'scrape-site',
        stages: [
            {
                name: 'scrape',
                steps: [
                    {
                        run: 'web_scraper',
                        with: { url: 'https://example.com', extract: { type: 'html' } },
                    },
                ],
            },
        ],
    },
};
class TemplateCommand {
    async list(options) {
        if (options.remote) {
            // eslint-disable-next-line no-console
            console.log('Remote template registry is not configured.');
            return;
        }
        // eslint-disable-next-line no-console
        console.table(Object.keys(BUILT_IN_TEMPLATES).map((name) => ({ name })), ['name']);
    }
    async show(name) {
        const template = BUILT_IN_TEMPLATES[name];
        if (!template) {
            // eslint-disable-next-line no-console
            console.error(`Template ${name} not found`);
            return;
        }
        // eslint-disable-next-line no-console
        console.log(js_yaml_1.default.dump(template, { indent: 2 }));
    }
    async create(name, options) {
        const source = path_1.default.resolve(process.cwd(), 'maestro.yaml');
        const targetDir = path_1.default.resolve(process.cwd(), 'templates');
        await fs_1.promises.mkdir(targetDir, { recursive: true });
        const target = path_1.default.join(targetDir, `${name}.yaml`);
        const workflow = await fs_1.promises.readFile(source, 'utf8');
        const parsed = js_yaml_1.default.load(workflow);
        const enriched = {
            ...parsed,
            description: options.description || parsed?.description,
        };
        await fs_1.promises.writeFile(target, js_yaml_1.default.dump(enriched, { indent: 2 }), 'utf8');
        // eslint-disable-next-line no-console
        console.log(`Template saved to ${target}`);
    }
}
exports.TemplateCommand = TemplateCommand;
