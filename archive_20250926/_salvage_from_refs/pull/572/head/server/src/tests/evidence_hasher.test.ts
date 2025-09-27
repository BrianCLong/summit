import fs from 'fs';
import path from 'path';
import { sha256File } from '../cases/EvidenceHasher';

describe('evidence hasher', () => {
  it('hashes file', () => {
    const p = path.join(__dirname, 'tmp.txt');
    fs.writeFileSync(p, 'hi');
    const h = sha256File(p);
    expect(h).toHaveLength(64);
    fs.unlinkSync(p);
  });
});
