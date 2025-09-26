import { Box, Chip, Container, Grid, Link, List, ListItem, Paper, Typography } from '@mui/material';

const signingKeys = [
  {
    label: 'PGP Fingerprint',
    value: '3F23 8C8E 9B77 1A2C 0D11 7A2E 1F9A 44E1 DC55 9AAB'
  },
  {
    label: 'X.509 Key ID',
    value: '4C:F2:89:BA:1A:77:2C:11'
  }
];

const channels = [
  { label: 'Website', value: 'https://intelgraph.example' },
  { label: 'X / Twitter', value: '@intelgraph' },
  { label: 'Facebook', value: '/intelgraph' },
  { label: 'Hotline', value: '+1-800-555-0199 (voice callback required)' }
];

const debunks = [
  {
    tag: 'Election',
    title: 'Robocall claiming new voting hours',
    verdict: 'False. IntelGraph never changes polling times via robocall.',
    details: 'Check with your local election office or call the hotline above.',
    evidence:
      'Audio hash f1c27b5a1d3b4f8ef7c2d81bc1f5e8a9d1f4c3b2a7d6e5f4c3b2a1f0e9d8c7b6 · Case IO-CASE-1001 · Updated 2025-09-25'
  },
  {
    tag: 'Disaster',
    title: 'Shelter closures due to contamination',
    verdict: 'False. All shelters remain open; status dashboard updated hourly.',
    details: 'Confirm at intelgraph.example/shelters or via municipal channels.',
    evidence: 'Verified with Emergency Operations Center bulletin 2025-09-25-07 · Case IO-CASE-1002'
  },
  {
    tag: 'Finance',
    title: 'Deepfake CEO surprise merger announcement',
    verdict: 'False. Official investor communications include C2PA manifests.',
    details: 'See intelgraph.example/investors for signed releases.',
    evidence: 'Video hash 1a2b3c4d5e6f708192a3b4c5d6e7f8019a8b7c6d5e4f30291827364554637281 · Case IO-CASE-1003'
  }
];

const riskAdvisories = [
  {
    story: 'Election voice-clone suppression',
    horizon: '4h',
    riskScore: 0.89,
    confidence: 0.92,
    action: 'Legal + Trust & Safety on-call engaged; callback protocol enforced.'
  },
  {
    story: 'Finance pump with deepfake executive',
    horizon: '2h',
    riskScore: 0.92,
    confidence: 0.95,
    action: 'Investor relations notice drafted; exchange partners briefed.'
  }
];

const provenanceHighlights = [
  {
    story: 'Election robocall audio',
    verified: 3,
    pending: 1,
    phi: 0.67,
    note: 'Synthetic voiceprint matched to known cluster; hotline script published.'
  },
  {
    story: 'Spoofed multilingual news site',
    verified: 1,
    pending: 2,
    phi: 0.41,
    note: 'Registrar validation pending—expect signage update within 60 minutes.'
  }
];

export default function VerifyUs(): JSX.Element {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
        Verify IntelGraph Communications
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Confirm hotline scripts, signed media, and official advisories before taking action. Save this page and share with
        partners who need to validate our communications during fast-moving incidents.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h5" gutterBottom>
              Signing Keys
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Fingerprints rotate quarterly and are mirrored in DNS TXT records.
            </Typography>
            <List>
              {signingKeys.map((key) => (
                <ListItem key={key.label} sx={{ display: 'block', py: 1 }}>
                  <Typography variant="subtitle2">{key.label}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {key.value}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h5" gutterBottom>
              Official Channels
            </Typography>
            <List>
              {channels.map((channel) => (
                <ListItem key={channel.label} sx={{ display: 'block', py: 1 }}>
                  <Typography variant="subtitle2">{channel.label}</Typography>
                  <Typography variant="body2">{channel.value}</Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Debunk Cards
        </Typography>
        <Grid container spacing={3}>
          {debunks.map((card) => (
            <Grid item xs={12} md={4} key={card.title}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Chip label={card.tag} color="primary" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                  <strong>Verdict:</strong> {card.verdict}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {card.details}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.evidence}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper elevation={0} sx={{ mt: 4, p: 3, borderRadius: 3, backgroundColor: 'action.hover' }}>
        <Typography variant="body1">
          Report suspicious communications to{' '}
          <Link href="mailto:trust@intelgraph.example">trust@intelgraph.example</Link>. Attach screenshots, audio files, or the
          originating phone number when possible.
        </Typography>
      </Paper>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Predictive Risk Advisories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Horizon and confidence pulled from the IO foresight service. Scores ≥ 0.85 trigger immediate escalation.
            </Typography>
            <List>
              {riskAdvisories.map((item) => (
                <ListItem key={item.story} sx={{ display: 'block', py: 1 }}>
                  <Typography variant="subtitle2">{item.story}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Risk {item.riskScore.toFixed(2)} · Confidence {item.confidence.toFixed(2)} · Horizon {item.horizon}
                  </Typography>
                  <Typography variant="body2">{item.action}</Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Provenance Ledger Snapshot
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Verified vs. pending assertions (PHI &gt; 0.4 is healthy). Contact provenance ops for any pending spikes.
            </Typography>
            <List>
              {provenanceHighlights.map((item) => (
                <ListItem key={item.story} sx={{ display: 'block', py: 1 }}>
                  <Typography variant="subtitle2">{item.story}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verified {item.verified} · Pending {item.pending} · PHI {item.phi.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">{item.note}</Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
