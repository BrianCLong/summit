import fs from 'fs';
import crypto from 'crypto';

function computeDatasetId(namespace, name) {
  return `sha256:${crypto.createHash('sha256').update(`${namespace}|${name}`).digest('hex')}`;
}

const payload = {
  schema: "summit.lineage.stamp.v1",
  run: {
    run_id: "00000000-0000-0000-0000-000000000000",
    attempt: 1
  },
  transformation: {
    transformation_hash: "sha256:d8a5598ba9ff95c654d0bf9420063ec3828ed3ffbf658b1f8c14e040c4ccdf35",
    hash_schema: "summit.lineage.transformation.v1"
  },
  datasets: {
    inputs: [
      {
        namespace: "prod.postgres",
        name: "public.orders",
        dataset_id: computeDatasetId("prod.postgres", "public.orders"),
        schema_fingerprint: "sha256:4a0d9e8ebec8fc6deaf08ea01de47cc6c5cd41c099395f1fa68c2fb5fbf3f545",
        origin: "openlineage"
      }
    ],
    outputs: [
      {
        namespace: "prod.postgres",
        name: "analytics.orders_rollup",
        dataset_id: computeDatasetId("prod.postgres", "analytics.orders_rollup"),
        schema_fingerprint: "sha256:a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
        origin: "openlineage"
      }
    ]
  },
  linkage: {
    openlineage: {
      event_time_omitted: true,
      producer: "summit-spark-producer",
      run_facets_present: ["nominalTime"],
      extraction_error_present: false
    }
  }
};

const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
payload.integrity = {
  content_digest: `sha256:${hash}`
};

fs.writeFileSync('evidence/lineage/lineage.stamp.json', JSON.stringify(payload, null, 2));
