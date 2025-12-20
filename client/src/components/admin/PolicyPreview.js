import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { toggleRtl } from '../../store/slices/uiSlice';
import { loadLanguage } from '../../utils/i18n';

export default function PolicyPreview() {
  const [action, setAction] = useState('query:Entity.props');
  const [resource, setResource] = useState('{"type":"Entity","field":"props"}');
  const [role, setRole] = useState('ANALYST');
  const [result, setResult] = useState(null);
  const [language, setLanguage] = useState('en');
  const rtl = useSelector((s) => s.ui.rtl);
  const dispatch = useDispatch();

  const preview = async () => {
    try {
      const user = { role };
      const res = await fetch('/api/admin/policy/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user, resource: JSON.parse(resource) }),
      });
      const data = await res.json();
      setResult(data.decision || data);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  const onLanguage = async (_e, val) => {
    if (!val) return;
    setLanguage(val);
    await loadLanguage(val);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Policy Preview & UI Settings
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Resource (JSON)"
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={preview}>
                  Preview Decision
                </Button>
                <Box>
                  <Typography variant="subtitle2">Decision</Typography>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {result ? JSON.stringify(result, null, 2) : '—'}
                  </pre>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                UI Settings
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <ToggleButtonGroup
                  value={language}
                  exclusive
                  onChange={onLanguage}
                  size="small"
                >
                  <ToggleButton value="en">EN</ToggleButton>
                  <ToggleButton value="ar">AR</ToggleButton>
                </ToggleButtonGroup>
                <Button
                  variant="outlined"
                  onClick={() => dispatch(toggleRtl())}
                >
                  {rtl ? 'LTR' : 'RTL'}
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Language and RTL toggles apply immediately for preview.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
