import { createSign, createVerify } from 'crypto';

// Keys are loaded from environment variables for security.
const privateKey = process.env.RECEIPT_PRIVATE_KEY;
const publicKey = process.env.RECEIPT_PUBLIC_KEY;

export class ReceiptService {
  public static async generateReceipt(data: any): Promise<{ signature: string; signedData: string }> {
    const signedData = JSON.stringify(data);
    const sign = createSign('sha256');
    sign.update(signedData);
    sign.end();
    const signature = sign.sign(privateKey, 'hex');
    return { signature, signedData };
  }

  public static async verifyReceipt(signature: string, signedData: string): Promise<boolean> {
    const verify = createVerify('sha256');
    verify.update(signedData);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  }
}
