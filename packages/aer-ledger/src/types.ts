export interface AER {
  assertionHash: string;
  epoch: number;
  subjectToken: string;
  signer: string;
  signature: string;
  algo: 'RSA-SHA256';
}
