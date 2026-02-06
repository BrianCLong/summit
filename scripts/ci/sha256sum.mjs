import crypto from 'crypto';
import fs from 'fs';

const filePath = process.argv[2];
if (!filePath) {
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);

const hex = hashSum.digest('hex');
console.log(hex);
