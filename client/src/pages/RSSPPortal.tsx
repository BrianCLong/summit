import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  Divider,
  Tooltip,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import {
  RSSPAttestationDetail,
  RSSPAttestationSummary,
  RSSPVerificationResponse,
  fetchAttestationDetail,
  fetchAttestations,
  fetchExportPack,
  fetchPublicKey,
  fetchServerVerification,
} from '../services/rssp';

const encoder = new TextEncoder();

const stableStringify = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

async function sha256Hex(input: string | ArrayBuffer | Uint8Array): Promise<string> {
  const buffer =
    typeof input === 'string'
      ? encoder.encode(input)
      : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToSpkiDer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bytes = base64ToBytes(base64);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function verifyEd25519Signature(publicKeyPem: string, message: Uint8Array, signature: Uint8Array) {
  const keyData = pemToSpkiDer(publicKeyPem);
  const cryptoKey = await window.crypto.subtle.importKey('spki', keyData, { name: 'Ed25519' }, false, [
    'verify',
  ]);
  return window.crypto.subtle.verify('Ed25519', cryptoKey, signature, message);
}

interface ClientVerificationResult {
  payloadHashMatches: boolean;
  exportHashMatches: boolean;
  signatureValid: boolean;
  ok: boolean;
}

const renderKeyValue = (label: string, value: React.ReactNode) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
      {value}
    </Typography>
  </Stack>
);

function QueryTemplateList({ templates }: { templates?: unknown }) {
  if (!Array.isArray(templates)) return null;
  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {templates.map((template: any) => (
        <Card key={template.id} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {template.title}
            </Typography>
            {renderKeyValue('Template ID', template.id)}
            {renderKeyValue('Statement Hash', template.statementHash)}
            {template.redactions && template.redactions.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {template.redactions.map((redaction: string) => (
                  <Chip key={redaction} label={`redacted:${redaction}`} size="small" color="warning" />
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function ControlsSummary({ controls }: { controls?: unknown }) {
  if (!controls || typeof controls !== 'object') return null;
  const entries = Object.entries(controls as Record<string, unknown>);
  if (!entries.length) return null;
  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {entries.map(([key, value]) => (
        <Stack key={key} direction="row" spacing={1} alignItems="center">
          <Chip label={key} size="small" color="info" />
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

const initialVerification: ClientVerificationResult = {
  payloadHashMatches: false,
  exportHashMatches: false,
  signatureValid: false,
  ok: false,
};

export default function RSSPPortal(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attestations, setAttestations] = useState<RSSPAttestationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RSSPAttestationDetail>>({});
  const [exportCache, setExportCache] = useState<Record<string, Uint8Array>>({});
  const [publicKey, setPublicKey] = useState<string>('');
  const [serverVerification, setServerVerification] = useState<RSSPVerificationResponse | null>(null);
  const [clientVerification, setClientVerification] = useState<ClientVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [list, key] = await Promise.all([fetchAttestations(), fetchPublicKey()]);
        setAttestations(list);
        setPublicKey(key);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selectedDetail = selectedId ? details[selectedId] : undefined;

  const ensureDetail = useCallback(
    async (id: string) => {
      if (details[id]) return details[id];
      const detail = await fetchAttestationDetail(id);
      setDetails((prev) => ({ ...prev, [id]: detail }));
      return detail;
    },
    [details],
  );

  const ensureExport = useCallback(
    async (id: string) => {
      if (exportCache[id]) return exportCache[id];
      const bytes = await fetchExportPack(id);
      setExportCache((prev) => ({ ...prev, [id]: bytes }));
      return bytes;
    },
    [exportCache],
  );

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setClientVerification(null);
    setServerVerification(null);
    try {
      await ensureDetail(id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    if (!selectedId || details[selectedId]) {
      return;
    }
    ensureDetail(selectedId).catch((err) => setError((err as Error).message));
  }, [details, ensureDetail, selectedId]);

  const downloadExport = async () => {
    if (!selectedId) return;
    try {
      const bytes = await ensureExport(selectedId);
      const blob = new Blob([bytes], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedId}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runVerification = useCallback(async () => {
    if (!selectedId) return;
    setVerifying(true);
    setError(null);
    try {
      const [detail, exportBytes, serverResult] = await Promise.all([
        ensureDetail(selectedId),
        ensureExport(selectedId),
        fetchServerVerification(selectedId),
      ]);

      setServerVerification(serverResult);

      const payloadCanonical = stableStringify(detail.payload);
      const computedPayloadHash = await sha256Hex(payloadCanonical);
      const computedExportHash = await sha256Hex(exportBytes);
      const messageBytes = encoder.encode(`${computedPayloadHash}:${computedExportHash}`);
      const signatureBytes = base64ToBytes(detail.verification.signature);
      const signatureValid = await verifyEd25519Signature(publicKey, messageBytes, signatureBytes);

      const clientResult: ClientVerificationResult = {
        payloadHashMatches: computedPayloadHash === detail.payloadHash,
        exportHashMatches: computedExportHash === detail.exportHash,
        signatureValid,
        ok:
          computedPayloadHash === detail.payloadHash &&
          computedExportHash === detail.exportHash &&
          signatureValid,
      };
      setClientVerification(clientResult);
    } catch (err) {
      setClientVerification({ ...initialVerification, ok: false });
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }, [ensureDetail, ensureExport, publicKey, selectedId]);

  const statusChip = useMemo(() => {
    if (!selectedDetail) return null;
    const label = selectedDetail.type.replace('-', ' ');
    return <Chip icon={<PrivacyTipIcon />} label={label} color="primary" variant="outlined" />;
  }, [selectedDetail]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <FactCheckIcon color="primary" />
              <Typography variant="h6">Proof & Evidence Catalogue</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Regulator-only workspace aggregating differential privacy budgets, deletion receipts,
              transparency proofs, and consent attestations. All artifacts are hashed and redacted to
              exclude personal data.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <List dense>
              {attestations.map((attestation) => (
                <ListItem key={attestation.id} disablePadding>
                  <ListItemButton
                    selected={attestation.id === selectedId}
                    onClick={() => void handleSelect(attestation.id)}
                  >
                    <ListItemText
                      primary={attestation.title}
                      secondary={`Issued ${new Date(attestation.issuedAt).toLocaleDateString()}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card variant="outlined">
          <CardContent>
            {selectedDetail ? (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h5" sx={{ flexGrow: 1 }}>
                    {selectedDetail.title}
                  </Typography>
                  {statusChip}
                </Stack>
                <Typography variant="body1" color="text.secondary">
                  {selectedDetail.summary}
                </Typography>
                <Divider />
                <Stack spacing={1}>
                  {renderKeyValue('Issued', new Date(selectedDetail.issuedAt).toUTCString())}
                  {renderKeyValue('Jurisdictions', selectedDetail.jurisdiction.join(', '))}
                  {renderKeyValue('Retention Policy', selectedDetail.retentionPolicy)}
                  {renderKeyValue('Payload Hash', selectedDetail.payloadHash)}
                  {renderKeyValue('Export Hash', selectedDetail.exportHash)}
                  {renderKeyValue('Signature', selectedDetail.verification.signature)}
                  {renderKeyValue('Signature Message', selectedDetail.verification.message)}
                  {renderKeyValue('Export Size', `${selectedDetail.exportPackBytes} bytes`)}
                </Stack>
                <Divider />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Query Templates
                </Typography>
                <QueryTemplateList templates={(selectedDetail.payload as any).queryTemplates} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Control Envelope
                </Typography>
                <ControlsSummary controls={(selectedDetail.payload as any).controls} />
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<VerifiedIcon />}
                    onClick={() => void runVerification()}
                    disabled={verifying}
                  >
                    {verifying ? 'Verifying…' : 'Run verification'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => void downloadExport()}
                  >
                    Download export pack
                  </Button>
                  <Tooltip title="Refresh data from the regulator evidence hub">
                    <span>
                      <Button
                        variant="text"
                        startIcon={<ReplayIcon />}
                        onClick={() => void handleSelect(selectedDetail.id)}
                        disabled={verifying}
                      >
                        Refresh
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
                {(serverVerification || clientVerification) && (
                  <Card variant="outlined" sx={{ backgroundColor: '#f5f7fa' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        Cryptographic Verification Checklist
                      </Typography>
                      {serverVerification && (
                        <Alert severity={serverVerification.result.ok ? 'success' : 'error'} sx={{ mb: 1 }}>
                          Server attestation verification: {serverVerification.result.ok ? 'passed' : 'failed'}
                        </Alert>
                      )}
                      {clientVerification && (
                        <Alert severity={clientVerification.ok ? 'success' : 'error'}>
                          Client verification
                          <br />
                          Payload hash integrity: {clientVerification.payloadHashMatches ? '✅' : '❌'} | Export hash integrity:{' '}
                          {clientVerification.exportHashMatches ? '✅' : '❌'} | Signature:{' '}
                          {clientVerification.signatureValid ? '✅' : '❌'}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Stack>
            ) : (
              <Typography variant="body1">Select an attestation to inspect regulator proofs.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
