"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const connector_js_1 = require("@intelgraph/connector-js");
class CsvConnector extends connector_js_1.BaseConnector {
    file;
    constructor(file) {
        super();
        this.file = file;
    }
    async run(ctx) {
        const lines = fs_1.default.readFileSync(this.file, 'utf-8').trim().split('\n');
        const headers = lines[0].split(',');
        for (const line of lines.slice(1)) {
            const cols = line.split(',');
            const record = {};
            headers.forEach((h, i) => (record[h] = cols[i]));
            ctx.emit({ type: 'Record', ...record });
        }
    }
}
const connector = new CsvConnector(process.argv[2]);
const emit = (0, connector_js_1.createEmitter)(process.stdout);
connector.run({ emit });
