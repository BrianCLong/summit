import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const STAMP_PATH = path.join(process.cwd(), 'evidence/lineage/lineage.stamp.json');
const EXPECTED_SCHEMA = 'summit.lineage.stamp.v1';

let errors = [];
let corrections = [];
let counts = { inputs: 0, outputs: 0 };

function checkCanonicalDataset(dataset, type, index) {
  if (!dataset.namespace) {
    errors.push(`Missing namespace on ${type}[${index}]`);
  } else if (dataset.namespace !== dataset.namespace.toLowerCase()) {
    errors.push(`Namespace not canonical (lowercase) on ${type}[${index}]: ${dataset.namespace}`);
    corrections.push(`Suggested namespace: ${dataset.namespace.toLowerCase()}`);
  }

  if (!dataset.name) {
    errors.push(`Missing name on ${type}[${index}]`);
  }

  if (dataset.namespace && dataset.name) {
    const expectedId = `sha256:${crypto.createHash('sha256').update(`${dataset.namespace}|${dataset.name}`).digest('hex')}`;
    if (dataset.dataset_id !== expectedId) {
      errors.push(`Invalid dataset_id on ${type}[${index}]: expected ${expectedId}, got ${dataset.dataset_id}`);
    }
  }
}

function verifySorting(datasets, type) {
  for (let i = 0; i < datasets.length - 1; i++) {
    const a = `${datasets[i].namespace}|${datasets[i].name}`;
    const b = `${datasets[i+1].namespace}|${datasets[i+1].name}`;
    if (a.localeCompare(b) > 0) {
      errors.push(`Datasets array '${type}' is not sorted at index ${i}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(STAMP_PATH)) {
    console.error(`❌ [Lineage Integrity] Stamp file missing at ${STAMP_PATH}`);
    process.exit(1);
  }

  let rawData;
  let stamp;
  try {
    rawData = fs.readFileSync(STAMP_PATH, 'utf8');
    stamp = JSON.parse(rawData);
  } catch (e) {
    console.error(`❌ [Lineage Integrity] Failed to parse stamp: ${e.message}`);
    process.exit(1);
  }

  // A. Stamp Present
  if (stamp.schema !== EXPECTED_SCHEMA) {
    errors.push(`Invalid schema: expected ${EXPECTED_SCHEMA}, got ${stamp.schema}`);
  }

  // B. Dataset Canonicalization
  if (stamp.datasets) {
    const inputs = stamp.datasets.inputs || [];
    const outputs = stamp.datasets.outputs || [];

    counts.inputs = inputs.length;
    counts.outputs = outputs.length;

    inputs.forEach((d, i) => checkCanonicalDataset(d, 'inputs', i));
    outputs.forEach((d, i) => checkCanonicalDataset(d, 'outputs', i));

    verifySorting(inputs, 'inputs');
    verifySorting(outputs, 'outputs');
  } else {
    errors.push("Missing 'datasets' field");
  }

  // C. Transformation Hash
  if (!stamp.transformation?.transformation_hash) {
    errors.push("Missing transformation.transformation_hash");
  } else if (!stamp.transformation.transformation_hash.startsWith('sha256:')) {
    errors.push("transformation.transformation_hash must start with 'sha256:'");
  }

  // D. Extraction Error Visibility
  if (stamp.linkage?.openlineage?.extraction_error_present === true) {
    errors.push("OpenLineage extraction error facet present. Extraction failures result in incomplete lineage.");
  }

  // F. Integrity Digest
  if (!stamp.integrity?.content_digest) {
    errors.push("Missing integrity.content_digest");
  } else {
    // Clone and remove integrity field to recompute digest
    // We stringify the original JSON excluding the integrity object to preserve formatting
    const rawJSON = JSON.parse(rawData);
    delete rawJSON.integrity;
    const computedHash = crypto.createHash('sha256').update(JSON.stringify(rawJSON)).digest('hex');
    const expectedDigest = `sha256:${computedHash}`;

    if (stamp.integrity.content_digest !== expectedDigest) {
      errors.push(`Integrity digest mismatch: expected ${expectedDigest}, got ${stamp.integrity.content_digest}`);
    }
  }

  // Output
  console.log(`=== Lineage Integrity Gate ===`);
  console.log(`Inputs tracked: ${counts.inputs}`);
  console.log(`Outputs tracked: ${counts.outputs}`);

  if (corrections.length > 0) {
    console.log(`\nCorrections Attempted/Suggested:`);
    corrections.forEach(c => console.log(`- ${c}`));
  }

  if (errors.length > 0) {
    console.error(`\n❌ Validation Failed:`);
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  }

  console.log(`\n✅ Lineage Integrity Verified`);
  process.exit(0);
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
