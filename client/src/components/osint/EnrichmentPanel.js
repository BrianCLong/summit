import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';
import { gql, useMutation, useLazyQuery } from '@apollo/client';

const ENRICH_WIKI = gql`
  mutation Enrich($entityId: ID, $title: String!) {
    enrichEntityFromWikipedia(entityId: $entityId, title: $title) { id label }
  }
`;

const INGEST_RSS = gql`
  mutation Ingest($feedUrl: String!){ ingestRSS(feedUrl: $feedUrl) }
`;

const SOCIAL_QUERY = gql`
  mutation SocialQuery($provider: String!, $query: String!, $investigationId: ID!){ socialQuery(provider: $provider, query: $query, investigationId: $investigationId) }
`;

const GET_PROVENANCE = gql`
  query Prov($resourceType: String!, $resourceId: ID!) {
    provenance(resourceType: $resourceType, resourceId: $resourceId) { id source uri metadata createdAt }
  }
`;

export default function EnrichmentPanel({ entityId, entityLabel, investigationId }) {
  const [provider, setProvider] = useState('wikipedia');
  const [title, setTitle] = useState(entityLabel || '');
  const [feedUrl, setFeedUrl] = useState('');
  const [query, setQuery] = useState(entityLabel || '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const [enrichWiki] = useMutation(ENRICH_WIKI);
  const [ingestRSS] = useMutation(INGEST_RSS);
  const [socialQuery] = useMutation(SOCIAL_QUERY);
  const [loadProv, { data: provData, refetch: refetchProv }] = useLazyQuery(GET_PROVENANCE);

  useEffect(() => {
    if (entityId) loadProv({ variables: { resourceType: 'entity', resourceId: entityId } });
  }, [entityId]);

  const handleRun = async () => {
    try {
      setStatus('running');
      setMessage('');
      if (provider === 'wikipedia') {
        if (!title) throw new Error('Title required');
        await enrichWiki({ variables: { entityId, title } });
        setMessage('Wikipedia enrichment complete.');
        await loadProv({ variables: { resourceType: 'entity', resourceId: entityId } });
      } else if (provider === 'rss') {
        if (!feedUrl) throw new Error('Feed URL required');
        const res = await ingestRSS({ variables: { feedUrl } });
        setMessage(`Ingested ${res?.data?.ingestRSS || 0} RSS items.`);
      } else {
        if (!query) throw new Error('Query required');
        const host = provider === 'mastodon' ? window.prompt('Mastodon host (e.g., mastodon.social)', 'mastodon.social') : null;
        const res = await socialQuery({ variables: { provider, query, investigationId, host } });
        setMessage(`Queried ${provider}: ${res?.data?.socialQuery || 0} items processed.`);
      }
      setStatus('done');
      if (refetchProv) refetchProv();
    } catch (e) {
      setStatus('error');
      setMessage(e.message || 'Unknown error');
    }
  };

  return (
    <Paper sx={{ p: 1.5, minWidth: 360 }}>
      <Typography variant="subtitle2">Enrichment</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="provider-label">Provider</InputLabel>
          <Select labelId="provider-label" value={provider} label="Provider" onChange={e=>setProvider(e.target.value)}>
            <MenuItem value="wikipedia">Wikipedia</MenuItem>
            <MenuItem value="rss">RSS</MenuItem>
            <MenuItem value="reddit">Reddit</MenuItem>
            <MenuItem value="mastodon">Mastodon</MenuItem>
            <MenuItem value="bluesky">Bluesky</MenuItem>
            <MenuItem value="x">X</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {provider === 'wikipedia' && (
        <TextField size="small" label="Title" fullWidth sx={{ mt: 1 }} value={title} onChange={e=>setTitle(e.target.value)} />
      )}
      {provider === 'rss' && (
        <TextField size="small" label="Feed URL" fullWidth sx={{ mt: 1 }} value={feedUrl} onChange={e=>setFeedUrl(e.target.value)} />
      )}
      {['reddit','mastodon','bluesky','x'].includes(provider) && (
        <TextField size="small" label="Query" fullWidth sx={{ mt: 1 }} value={query} onChange={e=>setQuery(e.target.value)} />
      )}
      <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
        <Button size="small" variant="contained" onClick={handleRun}>Run</Button>
        <Chip size="small" label={status} color={status==='done'?'success':status==='error'?'error':status==='running'?'warning':'default'} />
      </Box>
      {message && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{message}</Typography>
      )}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption">Provenance</Typography>
      <List dense>
        {(provData?.provenance || []).map(p => (
          <ListItem key={p.id}>
            <ListItemText primary={`${p.source}: ${p.uri || ''}`} secondary={new Date(p.createdAt).toLocaleString()} />
          </ListItem>
        ))}
        {(!provData?.provenance || provData.provenance.length === 0) && (
          <ListItem><ListItemText primary="No provenance yet" /></ListItem>
        )}
      </List>
    </Paper>
  );
}
