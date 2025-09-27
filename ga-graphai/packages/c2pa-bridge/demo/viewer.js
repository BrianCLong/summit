import { verifyManifestInBrowser } from '../dist/browser/browser.js';

const assetInput = document.getElementById('asset');
const manifestInput = document.getElementById('manifest');
const publicKeyInput = document.getElementById('publicKey');
const verifyButton = document.getElementById('verify');
const resultsSection = document.getElementById('results');
const resultText = document.getElementById('resultText');

async function readSelectedFile(input) {
  if (!input.files || input.files.length === 0) {
    throw new Error('Missing required file input.');
  }
  return input.files[0];
}

function formatIssues(issues) {
  if (!issues.length) {
    return 'No issues detected.';
  }
  return issues.map((issue) => `- [${issue.level}] ${issue.message}`).join('\n');
}

verifyButton.addEventListener('click', async () => {
  try {
    const assetFile = await readSelectedFile(assetInput);
    const manifestFile = await readSelectedFile(manifestInput);
    const publicKey = publicKeyInput.value.trim();
    if (!publicKey) {
      throw new Error('Public key is required.');
    }

    const [assetBuffer, manifestText] = await Promise.all([
      assetFile.arrayBuffer(),
      manifestFile.text(),
    ]);
    const manifest = JSON.parse(manifestText);
    const result = await verifyManifestInBrowser({
      manifest,
      publicKey,
      asset: assetBuffer,
    });

    const lines = [
      `Signature: ${result.validSignature ? 'valid' : 'INVALID'}`,
      `Asset hash: ${result.validAssetHash ? 'valid' : 'INVALID'}`,
      `Manifest hash: ${result.manifestHash}`,
      `Claim hash: ${result.claimHash}`,
      'Issues:',
      formatIssues(result.issues),
    ];

    resultText.textContent = lines.join('\n');
    resultsSection.hidden = false;
  } catch (error) {
    resultText.textContent = `Verification failed: ${(error && error.message) || error}`;
    resultsSection.hidden = false;
  }
});
