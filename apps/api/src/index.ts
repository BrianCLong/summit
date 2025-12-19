import 'dotenv/config';
import { ReceiptSigner } from '@intelgraph/receipt-signer';

import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT ?? '4100', 10);
const kmsKeyId = process.env.RECEIPT_KMS_KEY_ID;

if (!kmsKeyId) {
  throw new Error('RECEIPT_KMS_KEY_ID must be set');
}

const signer = new ReceiptSigner({ kmsKeyId });
const app = buildApp({ signer });

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Receipt API listening on :${PORT}`);
});
