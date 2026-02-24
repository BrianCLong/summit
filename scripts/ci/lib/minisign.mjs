import { execFile } from 'node:child_process';
import util from 'node:util';

const execFileAsync = util.promisify(execFile);

export async function verifyMinisign({ filePath, sigPath, pubKeyPath }) {
  if (process.env.MOCK_MINISIGN === 'true') {
      // console.log(`[MOCK] Verifying ${filePath}`);
      return true;
  }
  try {
    await execFileAsync('minisign', ['-V', '-m', filePath, '-x', sigPath, '-p', pubKeyPath]);
    return true;
  } catch (error) {
    throw new Error(`Signature verification failed for ${filePath}: ${error.stderr || error.message}`);
  }
}
