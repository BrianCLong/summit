import React, { useState } from 'react';
import { ReportAPI, apiBase } from '../../services/api';
import { Box, Typography, TextField, Button, Grid, Card, CardContent } from '@mui/material';

export default function ReportGenerator() {
  const [investigationId, setInvestigationId] = useState('');
  const [title, setTitle] = useState('Investigation Report');
  const [findings, setFindings] = useState('');
  const [evidence, setEvidence] = useState('');
  const [lastUrl, setLastUrl] = useState('');
  const [format, setFormat] = useState('html');
  const [zip, setZip] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const payload = {
        investigationId: investigationId || null,
        title,
        findings: findings
          ? findings
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        evidence: evidence
          ? evidence
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        metadata: { generatedBy: 'Copilot' },
        format,
        zip,
      };
      const res = await ReportAPI.generate(payload);
      const url = `${apiBase()}${res.url}`;
      setLastUrl(url);
      // trigger download/open
      window.open(url, '_blank');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Copilot Report Generation
      </Typography>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Investigation ID"
                fullWidth
                value={investigationId}
                onChange={(e) => setInvestigationId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Title"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Findings (one per line)"
                fullWidth
                multiline
                minRows={6}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Evidence (one per line)"
                fullWidth
                multiline
                minRows={6}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Format"
                select
                fullWidth
                SelectProps={{ native: true }}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="html">HTML</option>
                <option value="pdf">PDF</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Zip Output"
                select
                fullWidth
                SelectProps={{ native: true }}
                value={zip ? 'yes' : 'no'}
                onChange={(e) => setZip(e.target.value === 'yes')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={generate} disabled={busy}>
                Generate HTML
              </Button>
              {lastUrl && (
                <Typography variant="body2" sx={{ ml: 2, display: 'inline-block' }}>
                  Last:{' '}
                  <a href={lastUrl} target="_blank" rel="noreferrer">
                    Open report
                  </a>
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
