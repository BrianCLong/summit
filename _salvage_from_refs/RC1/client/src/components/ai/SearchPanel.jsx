import React, { useMemo, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_ENTITIES } from '../../graphql/ai.gql.js';
import { Box, Button, Chip, Grid, MenuItem, Select, TextField, Typography, List, ListItem, ListItemText, Divider, Switch, FormControlLabel } from '@mui/material';
import { gql, useLazyQuery as useLazyQuery2 } from '@apollo/client';

const SEARCH_HYBRID = gql`
  query SearchEntitiesHybrid($q: String!, $filters: JSON, $limit: Int) {
    searchEntitiesHybrid(q: $q, filters: $filters, limit: $limit) {
      id
      type
      label
      description
      properties
      investigationId
    }
  }
`;

function highlight(text, q) {
  if (!text) return text;
  try {
    const parts = q.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return text;
    const re = new RegExp(`(${parts.map(p => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'ig');
    const tokens = String(text).split(re);
    return tokens.map((t, i) => re.test(t) ? <mark key={i}>{t}</mark> : <span key={i}>{t}</span>);
  } catch { return text; }
}

export default function SearchPanel() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [investigationId, setInvestigationId] = useState('');
  const [hybrid, setHybrid] = useState(true);

  const [runSearch, { data, loading, error }] = useLazyQuery(SEARCH_ENTITIES, { fetchPolicy: 'no-cache' });
  const [runHybrid, { data: dataH, loading: loadingH, error: errorH }] = useLazyQuery2(SEARCH_HYBRID, { fetchPolicy: 'no-cache' });

  const onSearch = () => {
    const filters = {};
    if (type) filters.type = type;
    if (investigationId) filters.investigationId = investigationId;
    if (hybrid) runHybrid({ variables: { q, filters, limit: 25 } });
    else runSearch({ variables: { q, filters, limit: 25 } });
  };

  const results = useMemo(() => hybrid ? (dataH?.searchEntitiesHybrid || []) : (data?.searchEntities || []), [hybrid, data, dataH]);

  return (
    <Box sx={{ p: 2, width: 380 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Search</Typography>
      <Grid container spacing={1} sx={{ mb: 1 }}>
        <Grid item xs={12}>
          <TextField label="Query" fullWidth value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') onSearch(); }} />
        </Grid>
        <Grid item xs={6}>
          <Select value={type} onChange={(e)=>setType(e.target.value)} displayEmpty fullWidth>
            <MenuItem value=""><em>Any Type</em></MenuItem>
            {['PERSON','ORGANIZATION','LOCATION','DEVICE','EMAIL','PHONE','IP_ADDRESS','DOMAIN','URL','FILE','DOCUMENT','ACCOUNT','TRANSACTION','EVENT','OTHER'].map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={6}>
          <TextField label="Investigation ID" fullWidth value={investigationId} onChange={(e)=>setInvestigationId(e.target.value)} />
        </Grid>
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormControlLabel control={<Switch checked={hybrid} onChange={(e)=>setHybrid(e.target.checked)} />} label="Hybrid (pgvector)" />
          <Button variant="contained" onClick={onSearch} disabled={!q || loading || loadingH}>Search</Button>
        </Grid>
      </Grid>

      {(error || errorH) && <Typography color="error" sx={{ mb: 1 }}>{(error || errorH).message}</Typography>}
      {(loading || loadingH) && <Typography color="text.secondary">Searching…</Typography>}

      <List dense>
        {results.map((e) => (
          <React.Fragment key={e.id}>
            <ListItem alignItems="flex-start">
              <ListItemText
                primary={<>
                  <Typography component="span" variant="subtitle2">{highlight(e.label, q)} </Typography>
                  {e.type && <Chip size="small" label={e.type} sx={{ ml: 1 }} />}
                </>}
                secondary={<Typography component="span" variant="body2" color="text.secondary">{highlight(e.description || '', q)}</Typography>}
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
        {results.length === 0 && !(loading || loadingH) && (
          <Typography color="text.secondary">No results</Typography>
        )}
      </List>
    </Box>
  );
}

