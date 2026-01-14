import express from 'express';
import { readFile, createReadStream } from 'fs';
import fetch from 'node-fetch';
import { parse } from 'csv-parse';
import { Client } from 'minio';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const app = express();
const argv = yargs(hideBin(process.argv))
  .option('seed', { type: 'string', describe: 'Path to entity CSV' })
  .option('relationships', { type: 'string', describe: 'Path to relationship CSV' })
  .help()
  .parseSync();

const port = Number(process.env.PORT || 4100);
const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:4000/graphql';
const bucket = process.env.MINIO_BUCKET || 'intelgraph-data';
const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

app.use(express.json({ limit: '5mb' }));

app.post('/upload', async (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ error: 'filename and content are required' });
  }
  const buffer = Buffer.from(content, 'base64');
  await minio.putObject(bucket, filename, buffer);
  res.json({ ok: true, path: `s3://${bucket}/${filename}` });
});

const postGraphQL = async (query, variables) => {
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) {
    throw new Error(`Gateway error ${response.status}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
};

const loadMapping = async () => {
  const raw = await readFile(new URL('../mapping/entity-mapping.yaml', import.meta.url));
  return raw.toString();
};

const mapRow = (row, headers) => {
  const mapped = {};
  headers.forEach((header, idx) => {
    mapped[header] = row[idx];
  });
  return mapped;
};

const processCsv = (filePath, handler) =>
  new Promise((resolve, reject) => {
    const stream = createReadStream(filePath).pipe(parse());
    stream.on('readable', async () => {
      let record;
      while ((record = stream.read()) !== null) {
        await handler(record);
      }
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

const seedEntities = async (filePath) => {
  let headers;
  await processCsv(filePath, async (row) => {
    if (!headers) {
      headers = row;
      return;
    }
    const mapped = mapRow(row, headers);
    const payload = {
      type: mapped.type,
      name: mapped.name,
      description: mapped.description,
      labels: mapped.labels ? mapped.labels.split('|') : []
    };
    await postGraphQL(
      `mutation Upsert($input: EntityInput!) { upsertEntity(input: $input) { id name type labels } }`,
      { input: payload }
    );
  });
};

const seedRelationships = async (filePath) => {
  let headers;
  await processCsv(filePath, async (row) => {
    if (!headers) {
      headers = row;
      return;
    }
    const mapped = mapRow(row, headers);
    const payload = {
      type: mapped.type,
      sourceId: mapped.sourceId,
      targetId: mapped.targetId,
      confidence: mapped.confidence ? Number(mapped.confidence) : null
    };
    await postGraphQL(
      `mutation Upsert($input: RelationshipInput!) { upsertRelationship(input: $input) { id type sourceId targetId } }`,
      { input: payload }
    );
  });
};

const boot = async () => {
  app.listen(port, () => {
    console.log(`Ingest stub listening on :${port}`);
  });

  if (argv.seed) {
    await seedEntities(argv.seed);
  }
  if (argv.relationships) {
    await seedRelationships(argv.relationships);
  }

  await minio.makeBucket(bucket, 'us-east-1').catch((err) => {
    if (err.code !== 'BucketAlreadyOwnedByYou') {
      throw err;
    }
  });
  const mapping = await loadMapping();
  console.log('Mapping loaded:', mapping.split('\n')[0], '...');
};

boot().catch((err) => {
  console.error('Failed to start ingest stub', err);
  process.exit(1);
});
