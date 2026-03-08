"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPersistedQueries = buildPersistedQueries;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function buildPersistedQueries() {
    const queries = { example: 'query Example { ping }' };
    fs_1.default.writeFileSync(path_1.default.join('server', 'src', 'generated', 'persisted-queries.json'), JSON.stringify(queries, null, 2));
}
if (require.main === module) {
    buildPersistedQueries();
}
