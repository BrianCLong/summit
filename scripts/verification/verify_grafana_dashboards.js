"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';
function error(msg) {
    console.error(`${RED}ERROR: ${msg}${RESET}`);
    process.exitCode = 1;
}
function success(msg) {
    console.log(`${GREEN}PASS: ${msg}${RESET}`);
}
const DASHBOARD_DIRS = [
    'observability/dashboards',
    'monitoring/dashboards',
    'ops/observability/grafana',
    'monitoring/grafana/dashboards'
];
function findJsonFiles(dir) {
    if (!fs_1.default.existsSync(dir))
        return [];
    const results = [];
    const list = fs_1.default.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results.push(...findJsonFiles(fullPath));
        }
        else {
            if (file.endsWith('.json')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}
const FILES = [];
DASHBOARD_DIRS.forEach(d => {
    FILES.push(...findJsonFiles(d));
});
console.log(`Verifying ${FILES.length} Grafana dashboard files...`);
let failure = false;
FILES.forEach(file => {
    try {
        const content = fs_1.default.readFileSync(file, 'utf8');
        const doc = JSON.parse(content);
        // Some dashboards are wrapped in a "dashboard" key, some are flat.
        let dashboard = doc;
        if (doc.dashboard) {
            dashboard = doc.dashboard;
        }
        if (!dashboard.title) {
            error(`${file}: Missing 'title'`);
            failure = true;
        }
        if (!dashboard.panels && !dashboard.rows) {
            if (!dashboard.schemaVersion && !dashboard.uid) {
                error(`${file}: Missing 'panels', 'rows', or 'uid' - is this a dashboard?`);
                failure = true;
            }
        }
        if (!failure)
            success(`${file} OK`);
    }
    catch (e) {
        error(`${file}: ${e.message}`);
        failure = true;
    }
});
if (failure) {
    process.exit(1);
}
