export const PAIRING_ENABLED = false;

export interface PairingToken {
  token: string;        // one-time
  expiresAt: string;    // export timestamps only in stamp.json
  serverUrl: string;
}

export function createPairingToken(serverUrl: string): PairingToken {
  // Stub: replace with cryptographically strong random + expiry handling
  return { token: "TODO", expiresAt: "TODO", serverUrl };
}
