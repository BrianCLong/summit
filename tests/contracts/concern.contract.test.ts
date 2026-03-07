import Ajv from 'ajv/dist/2020';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv();
const schemaPath = path.join(__dirname, '../../schemas/evolution/concern.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

describe('Concern Contract', () => {
  it('validates a correct concern', () => {
    const concern = {
      concern_id: "concern.graph.resolution.weak_alias_merge",
      title: "Weak alias merge scoring for person entities",
      type: "quality_gap",
      domain: "graph-core",
      severity: "medium",
      status: "open",
      source_signals: ["signal.inv_0031.weak_merge"],
      evidence_refs: ["evidence://investigations/inv_0031/graph.diff.json"],
      owner: "graph-resolution",
      created_from: "gap_cluster.pending"
    };
    const valid = validate(concern);
    expect(valid).toBe(true);
  });

  it('rejects an incomplete concern', () => {
    const concern = {
      title: "Incomplete"
    };
    const valid = validate(concern);
    expect(valid).toBe(false);
  });
});
