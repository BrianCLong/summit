"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTemplate = loadTemplate;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const TEMPLATES_DIR = path_1.default.resolve(process.cwd(), 'reports/templates');
async function loadTemplate(templateId, version) {
    const templatePath = path_1.default.join(TEMPLATES_DIR, `${templateId}@${version}`);
    if (!fs_extra_1.default.existsSync(templatePath)) {
        throw new Error(`Template ${templateId}@${version} not found`);
    }
    const hbsPath = path_1.default.join(templatePath, 'index.hbs');
    if (!fs_extra_1.default.existsSync(hbsPath)) {
        throw new Error(`Template source index.hbs not found in ${templatePath}`);
    }
    const hbsContent = await fs_extra_1.default.readFile(hbsPath, 'utf-8');
    const cssPath = path_1.default.join(templatePath, 'print.css');
    const css = fs_extra_1.default.existsSync(cssPath) ? await fs_extra_1.default.readFile(cssPath, 'utf-8') : '';
    const template = handlebars_1.default.compile(hbsContent);
    return {
        render: (data) => {
            // Inject CSS into data context if needed or handle in template
            return template({ ...data, css });
        }
    };
}
