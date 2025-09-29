import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import { gql, useMutation } from '@apollo/client';

const ADD_KEY = gql`mutation AddKey($provider:String!, $key:String!, $expiresAt:DateTime){ addApiKey(provider:$provider, key:$key, expiresAt:$expiresAt) }`;
const ROTATE_KEY = gql`mutation RotateKey($provider:String!, $newKey:String!, $expiresAt:DateTime){ rotateApiKey(provider:$provider, newKey:$newKey, expiresAt:$expiresAt) }`;

export default function AdminTokens() {
  const [provider, setProvider] = useState('mastodon');
  const [key, setKey] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [msg, setMsg] = useState('');
  const [addKey] = useMutation(ADD_KEY);
  const [rotateKey] = useMutation(ROTATE_KEY);

  const handleAdd = async () => {
    setMsg('');
    await addKey({ variables: { provider, key, expiresAt: expiresAt || null } });
    setMsg('Key added.');
  };
  const handleRotate = async () => {
    setMsg('');
    await rotateKey({ variables: { provider, newKey: key, expiresAt: expiresAt || null } });
    setMsg('Key rotated.');
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Provider Tokens</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
        <FormControl size="small">
          <InputLabel id="provider">Provider</InputLabel>
          <Select labelId="provider" value={provider} label="Provider" onChange={e=>setProvider(e.target.value)}>
            <MenuItem value="mastodon">Mastodon</MenuItem>
            <MenuItem value="x">X</MenuItem>
            <MenuItem value="bluesky">Bluesky</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" label="Token" value={key} onChange={e=>setKey(e.target.value)} sx={{ minWidth: 360 }} />
        <TextField size="small" type="datetime-local" label="Expires" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} />
        <Button variant="contained" onClick={handleAdd}>Add</Button>
        <Button variant="outlined" onClick={handleRotate}>Rotate</Button>
      </Box>
      {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}
    </Paper>
  );
}
