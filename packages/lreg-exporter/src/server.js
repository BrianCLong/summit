"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = __importDefault(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json({ limit: '8mb' }));
app.post('/lreg/export', async (req, res) => {
    const reqBody = req.body;
    const tmpZip = `/tmp/lreg-${reqBody.runId}.zip`;
    const out = fs_1.default.createWriteStream(tmpZip);
    const arc = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    arc.pipe(out);
    arc.append(JSON.stringify({
        meta: {
            runId: reqBody.runId,
            caseId: reqBody.caseId,
            createdAt: new Date().toISOString(),
        },
        kpw: reqBody.kpwBundle,
        aer: reqBody.aer || null,
        policyLogs: reqBody.policyLogs,
        dissent: reqBody.dissentCoverage,
    }, null, 2), { name: 'packet.json' });
    if (reqBody.attachments)
        for (const a of reqBody.attachments)
            if (fs_1.default.existsSync(a.path))
                arc.file(a.path, { name: `attachments/${a.name}` });
    await arc.finalize();
    out.on('close', () => res.download(tmpZip));
});
app.listen(process.env.PORT || 7301, () => console.log('LREG exporter on 7301'));
