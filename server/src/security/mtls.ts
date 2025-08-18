import tls from 'tls';

export function requireMtls(peerCert: tls.PeerCertificate) {
  if (!peerCert || !peerCert.subject || !peerCert.issuer) throw new Error('mtls_required');
  if (!peerCert.subject.CN?.includes('intelgraph.internal')) throw new Error('mtls_subject_reject');
  return true;
}
