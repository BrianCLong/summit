"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RUNBOOKS_DIR = 'docs/runbooks';
const README_PATH = path_1.default.join(RUNBOOKS_DIR, 'README.md');
function indexRunbooks() {
    if (!fs_1.default.existsSync(RUNBOOKS_DIR)) {
        console.error(`Runbooks directory not found: ${RUNBOOKS_DIR}`);
        return;
    }
    const files = fs_1.default.readdirSync(RUNBOOKS_DIR, { recursive: true })
        .filter(file => file.endsWith('.md') || file.endsWith('.yaml'))
        .filter(file => !file.endsWith('README.md'));
    let content = '# Operational Runbooks\n\nAutomated index of available runbooks.\n\n';
    files.forEach(file => {
        content += `- [${file}](${file})\n`;
    });
    fs_1.default.writeFileSync(README_PATH, content, 'utf-8');
    console.log(`Indexed ${files.length} runbooks to ${README_PATH}`);
}
indexRunbooks();
