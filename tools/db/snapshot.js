"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const mh = (0, child_process_1.execSync)("git ls-files server/src/migrations | xargs cat | sha1sum | awk '{print $1}'", { shell: 'bash' })
    .toString()
    .trim();
const key = `pgdump-${mh}.tar.zst`;
fs_1.default.writeFileSync('key.txt', key);
try {
    (0, child_process_1.execSync)(`gh cache restore ${key}`);
    console.log('Restored DB snapshot');
}
catch {
    console.log('Building DB snapshot');
    (0, child_process_1.execSync)('docker compose -f docker-compose.ci.yml up -d pg && sleep 3 && psql -f server/src/migrations/all.sql');
    (0, child_process_1.execSync)(`pg_dump -F t | zstd -19 -o ${key}`);
    (0, child_process_1.execSync)(`gh cache save ${key} -p ${key}`);
}
