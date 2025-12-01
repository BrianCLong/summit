/**
 * Credential Issuer - Issue and manage verifiable credentials
 */

import crypto from 'crypto';
import type { VerifiableCredential, Proof } from './types.js';

interface IssueCredentialOptions {
  issuerDid: string;
  issuerPrivateKey: string;
  subjectDid: string;
  credentialType: string;
  claims: Record<string, unknown>;
  expirationDate?: Date;
}

export class CredentialIssuer {
  private issuedCredentials: Map<string, VerifiableCredential> = new Map();

  async issueCredential(options: IssueCredentialOptions): Promise<VerifiableCredential> {
    const credentialId = `urn:uuid:${crypto.randomUUID()}`;
    const issuanceDate = new Date().toISOString();

    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
      ],
      id: credentialId,
      type: ['VerifiableCredential', options.credentialType],
      issuer: options.issuerDid,
      issuanceDate,
      expirationDate: options.expirationDate?.toISOString(),
      credentialSubject: {
        id: options.subjectDid,
        ...options.claims,
      },
    };

    // Sign credential
    credential.proof = await this.createProof(
      credential,
      options.issuerDid,
      options.issuerPrivateKey,
    );

    this.issuedCredentials.set(credentialId, credential);
    return credential;
  }

  async issueDataContributorCredential(
    issuerDid: string,
    issuerPrivateKey: string,
    subjectDid: string,
    poolId: string,
    contributionCount: number,
  ): Promise<VerifiableCredential> {
    return this.issueCredential({
      issuerDid,
      issuerPrivateKey,
      subjectDid,
      credentialType: 'DataContributorCredential',
      claims: {
        poolId,
        contributionCount,
        contributorSince: new Date().toISOString(),
        trustLevel: this.calculateTrustLevel(contributionCount),
      },
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }

  async issueDataAccessCredential(
    issuerDid: string,
    issuerPrivateKey: string,
    subjectDid: string,
    poolIds: string[],
    accessLevel: 'read' | 'write' | 'admin',
  ): Promise<VerifiableCredential> {
    return this.issueCredential({
      issuerDid,
      issuerPrivateKey,
      subjectDid,
      credentialType: 'DataAccessCredential',
      claims: {
        poolIds,
        accessLevel,
        grantedAt: new Date().toISOString(),
      },
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  async revokeCredential(credentialId: string): Promise<boolean> {
    return this.issuedCredentials.delete(credentialId);
  }

  async getCredential(credentialId: string): Promise<VerifiableCredential | undefined> {
    return this.issuedCredentials.get(credentialId);
  }

  private async createProof(
    credential: VerifiableCredential,
    issuerDid: string,
    _privateKey: string,
  ): Promise<Proof> {
    const dataToSign = JSON.stringify({
      '@context': credential['@context'],
      type: credential.type,
      issuer: credential.issuer,
      issuanceDate: credential.issuanceDate,
      credentialSubject: credential.credentialSubject,
    });

    // Create signature (simplified - in production use proper JWS)
    const signature = crypto
      .createHash('sha256')
      .update(dataToSign)
      .digest('base64url');

    return {
      type: 'JsonWebSignature2020',
      created: new Date().toISOString(),
      verificationMethod: `${issuerDid}#key-1`,
      proofPurpose: 'assertionMethod',
      jws: signature,
    };
  }

  private calculateTrustLevel(contributionCount: number): string {
    if (contributionCount >= 100) return 'gold';
    if (contributionCount >= 50) return 'silver';
    if (contributionCount >= 10) return 'bronze';
    return 'standard';
  }
}
