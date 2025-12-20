import {
  ExecutionReceipt,
  canonicalReceiptPayload,
} from '@intelgraph/provenance';
import pino from 'pino';
import { KmsClient } from './kmsClient';

export interface SignerServiceOptions {
  kmsClient: KmsClient;
  logger?: pino.Logger;
}

export class ReceiptSignerService {
  private readonly logger: pino.Logger;

  constructor(private readonly options: SignerServiceOptions) {
    this.logger = options.logger ?? pino({ name: 'receipt-signer' });
  }

  async sign(receipt: ExecutionReceipt): Promise<ExecutionReceipt> {
    this.logger.debug({ receiptId: receipt.id }, 'Signing receipt');
    const payload = canonicalReceiptPayload({ ...receipt, signature: '' });
    const response = await this.options.kmsClient.sign({ payload });
    const signed: ExecutionReceipt = {
      ...receipt,
      signer: {
        ...receipt.signer,
        algorithm: 'ed25519',
        keyId: response.keyId,
      },
      signature: response.signature.toString('base64'),
    };
    this.logger.info({ receiptId: receipt.id, keyId: response.keyId }, 'Receipt signed');
    return signed;
  }
}
