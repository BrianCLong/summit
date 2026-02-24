import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';

// GDELT GKG files typically do not have headers.
const RECORD_1 = [
  '20150218230000-1', '20150218230000', '1', 'example.com', 'http://example.com/article1',
  '', '', 'THEME1;THEME2', '', '1#Country#US#US#38.0#-97.0#US', '', 'Person1', '', 'Org1', '',
  '1.0,2.0,3.0,4.0,5.0,6.0', '', '', '', '', '', '', '', '', '', '', ''
].join('\t');

const content = `${RECORD_1}`;

const zip = new AdmZip();
zip.addFile('20150218230000.gkg.csv', Buffer.from(content, 'utf8'));

const buffer = zip.toBuffer();
const md5 = createHash('md5').update(buffer).digest('hex');

console.log(`MD5: ${md5}`);
const fixturePath = path.join('test/fixtures/20150218230000.gkg.csv.zip');
fs.ensureDirSync(path.dirname(fixturePath));
fs.writeFileSync(fixturePath, buffer);
console.log(`Fixture written to ${fixturePath}`);

const md5Line = `${md5}  20150218230000.gkg.csv.zip`;
fs.writeFileSync('test/fixtures/md5sums', md5Line);
console.log('md5sums written');
