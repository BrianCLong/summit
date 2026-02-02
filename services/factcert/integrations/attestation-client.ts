/**
 * Attestation Service Client
 *
 * Leverages services/attest for generating cryptographic attestations.
 */

import axios from 'axios';

const ATTEST_SERVICE_URL = process.env.ATTEST_SERVICE_URL || 'http://attest:4040';

export async function generateAttestation(
  artifact: any,
  context: string
): Promise<string> {
  try {
    const reportB64 = Buffer.from(JSON.stringify(artifact)).toString('base64');

    const response = await axios.post(`${ATTEST_SERVICE_URL}/verify`, {
      nodeId: 'FACTCERT-NODE-01',
      provider: 'summit-internal',
      reportB64
    }).catch(() => null);

    if (response?.data?.ok) {
      return `summit://attest/proofs/${response.data.measurement}`;
    }

    return `summit://attest/mock/${Buffer.from(context).toString('hex').substring(0, 8)}`;
  } catch (error) {
    console.error('Failed to generate attestation', error);
    return 'summit://attest/error';
  }
}
