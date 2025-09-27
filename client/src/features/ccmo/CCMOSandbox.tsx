import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface NotificationResponse {
  status: string;
  message: string;
  body?: string;
}

interface AppealEntry {
  subjectId: string;
  topic: string;
  purpose: string;
  channel: string;
  reason: string;
  timestamp: number;
}

const defaultData = {
  subject: 'Consent Update',
  name: 'Jordan',
  body: 'Your control center is ready.',
};

const channelOptions = [
  { label: 'Email', value: 'email' },
  { label: 'Push', value: 'push' },
  { label: 'In-App', value: 'in-app' },
];

const locales = ['en-US', 'es'];

const CCMOSandbox: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState('http://localhost:8080');
  const [subjectId, setSubjectId] = useState('user-1');
  const [topic, setTopic] = useState('product');
  const [purpose, setPurpose] = useState('onboarding');
  const [channel, setChannel] = useState('email');
  const [locale, setLocale] = useState('en-US');
  const [template, setTemplate] = useState('welcome');
  const [darkMode, setDarkMode] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [response, setResponse] = useState<NotificationResponse | null>(null);
  const [appeals, setAppeals] = useState<AppealEntry[]>([]);
  const [payloadBody, setPayloadBody] = useState(JSON.stringify(defaultData, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (path: string, init: RequestInit) => {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`${response.status} ${details}`);
      }
      return response;
    },
    [baseUrl],
  );

  const refreshAppeals = useCallback(async () => {
    try {
      const res = await request('/appeals', { method: 'GET' });
      const items = (await res.json()) as AppealEntry[];
      setAppeals(items);
    } catch (err) {
      console.error('Unable to load appeals', err);
    }
  }, [request]);

  useEffect(() => {
    void refreshAppeals();
  }, [refreshAppeals]);

  const handleSetConsent = async () => {
    setError(null);
    try {
      await request('/consents', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          topic,
          purpose,
          allowed,
          locales: [locale],
        }),
      });
      await refreshAppeals();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSend = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request('/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          topic,
          purpose,
          channel,
          locale,
          darkMode,
          template,
          data: JSON.parse(payloadBody || '{}'),
        }),
      });
      const body = (await res.json()) as NotificationResponse;
      setResponse(body);
      await refreshAppeals();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Consent-Compliant Messaging Orchestrator Sandbox
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Quickly experiment with consent configuration, locale-aware templating, and delivery enforcement policies.
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Service URL" fullWidth value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          <FormControlLabel
            control={<Checkbox checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} />}
            label="Dark mode variant"
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField label="Subject" fullWidth value={subjectId} onChange={(event) => setSubjectId(event.target.value)} />
          <TextField label="Topic" fullWidth value={topic} onChange={(event) => setTopic(event.target.value)} />
          <TextField label="Purpose" fullWidth value={purpose} onChange={(event) => setPurpose(event.target.value)} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="channel-label">Channel</InputLabel>
            <Select labelId="channel-label" label="Channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
              {channelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="locale-label">Locale</InputLabel>
            <Select labelId="locale-label" label="Locale" value={locale} onChange={(event) => setLocale(event.target.value)}>
              {locales.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Template" fullWidth value={template} onChange={(event) => setTemplate(event.target.value)} />
        </Stack>
        <TextField
          label="Template Data"
          value={payloadBody}
          onChange={(event) => setPayloadBody(event.target.value)}
          multiline
          minRows={4}
          fullWidth
          sx={{ mt: 2 }}
        />
        <FormControlLabel
          sx={{ mt: 2 }}
          control={<Checkbox checked={allowed} onChange={(event) => setAllowed(event.target.checked)} />}
          label="Consent granted for this locale"
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleSetConsent} disabled={isLoading}>
            Save Consent
          </Button>
          <Button variant="outlined" onClick={handleSend} disabled={isLoading}>
            {isLoading ? 'Sending…' : 'Send Notification'}
          </Button>
        </Stack>
        {error && (
          <Typography sx={{ mt: 2 }} color="error">
            {error}
          </Typography>
        )}
        {response && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Delivery Result</Typography>
            <Typography>Status: {response.status}</Typography>
            <Typography>Message: {response.message}</Typography>
            {response.body && (
              <Paper sx={{ p: 2, mt: 1, backgroundColor: 'grey.100' }}>
                <pre style={{ margin: 0 }}>{response.body}</pre>
              </Paper>
            )}
          </Box>
        )}
      </Paper>
      <Paper sx={{ p: 3 }} elevation={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Appeals Log</Typography>
          <Button variant="text" onClick={refreshAppeals}>
            Refresh
          </Button>
        </Stack>
        {appeals.length === 0 ? (
          <Typography color="text.secondary">No appeals recorded yet.</Typography>
        ) : (
          <Stack spacing={1}>
            {appeals.map((appeal) => (
              <Paper key={`${appeal.subjectId}-${appeal.timestamp}`} sx={{ p: 2 }} variant="outlined">
                <Typography variant="subtitle2">
                  {appeal.subjectId} – {appeal.topic}/{appeal.purpose}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Channel: {appeal.channel} · Reason: {appeal.reason} · Recorded at:{' '}
                  {new Date(appeal.timestamp * 1000).toLocaleString()}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default CCMOSandbox;
