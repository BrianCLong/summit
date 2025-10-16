import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import archiver from 'archiver';
const app = express();
app.use(bodyParser.json({ limit: '8mb' }));

app.post('/lreg/export', async (req, res) => {
  const reqBody = req.body;
  const tmpZip = `/tmp/lreg-${reqBody.runId}.zip`;
  const out = fs.createWriteStream(tmpZip);
  const arc = archiver('zip', { zlib: { level: 9 } });
  arc.pipe(out);

  arc.append(
    JSON.stringify(
      {
        meta: {
          runId: reqBody.runId,
          caseId: reqBody.caseId,
          createdAt: new Date().toISOString(),
        },
        kpw: reqBody.kpwBundle,
        aer: reqBody.aer || null,
        policyLogs: reqBody.policyLogs,
        dissent: reqBody.dissentCoverage,
      },
      null,
      2,
    ),
    { name: 'packet.json' },
  );

  if (reqBody.attachments)
    for (const a of reqBody.attachments)
      if (fs.existsSync(a.path))
        arc.file(a.path, { name: `attachments/${a.name}` });

  await arc.finalize();
  out.on('close', () => res.download(tmpZip));
});

app.listen(process.env.PORT || 7301, () =>
  console.log('LREG exporter on 7301'),
);
