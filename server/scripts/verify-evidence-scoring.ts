
import { scoreEvidence } from '../src/connectors/evidence/score.ts';
import { REQUIRED_FIELDS_RULE, REDACTION_MARKER_PRESENCE_RULE, SOURCE_REFERENCE_RULE } from '../src/connectors/evidence/rules.ts';

console.log('Running manual verification for Evidence Scoring...');

let failed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// Case 1: Perfect Record
const perfectRecord = {
  id: '123',
  timestamp: new Date(),
  content: 'Some content with [REDACTED] info',
  url: 'http://example.com',
};
const result1 = scoreEvidence(perfectRecord);
assert(result1.score === 1, 'Perfect record score should be 1');
assert(result1.missing.length === 0, 'Perfect record missing list should be empty');

// Case 2: Missing Required Fields
const incompleteRecord = {
  // id missing
  timestamp: new Date(),
  content: 'Some content',
  url: 'http://example.com',
};
const result2 = scoreEvidence(incompleteRecord);
assert(result2.score < 1, 'Incomplete record score should be < 1');
assert(result2.missing.includes(REQUIRED_FIELDS_RULE.id), 'Incomplete record should miss required-fields');

// Case 3: Missing Redaction
const unredactedRecord = {
  id: '123',
  timestamp: new Date(),
  content: 'Some raw content without protection',
  url: 'http://example.com',
};
const result3 = scoreEvidence(unredactedRecord);
assert(result3.score < 1, 'Unredacted record score should be < 1');
assert(result3.missing.includes(REDACTION_MARKER_PRESENCE_RULE.id), 'Unredacted record should miss redaction-marker-presence');

// Case 4: Missing Source
const noSourceRecord = {
  id: '123',
  timestamp: new Date(),
  content: 'Some content with [REDACTED]',
  // url missing
};
const result4 = scoreEvidence(noSourceRecord);
assert(result4.score < 1, 'No source record score should be < 1');
assert(result4.missing.includes(SOURCE_REFERENCE_RULE.id), 'No source record should miss source-reference');

if (failed) {
  console.error('Verification FAILED');
  process.exit(1);
} else {
  console.log('Verification PASSED');
  process.exit(0);
}
