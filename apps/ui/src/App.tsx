import React from 'react';
import { CssBaseline, Button, TextField, Box, Typography, Paper, Chip } from '@mui/material';
import CytoscapeComponent from 'react-cytoscapejs';
import $ from 'jquery';

type IndexRecord = {
  id: string;
  name: string;
  type: 'plugin' | 'developer' | 'partner' | 'integration' | 'event';
  category?: string;
  expertise?: string[];
  platform?: string;
};

export default function App() {
  const cyRef = React.useRef<any>(null);
  const [query, setQuery] = React.useState('');
  const [records, setRecords] = React.useState<IndexRecord[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (cyRef.current) {
      $(cyRef.current).on('mousedown', () => {
        /* enhance drag */
      });
    }
  }, []);

  React.useEffect(() => {
    fetch('/.repoos/index/platform-index.json')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Unable to load ecosystem index (${res.status})`);
        }
        return res.json();
      })
      .then((data) => setRecords((data.records ?? []) as IndexRecord[]))
      .catch((error: Error) => {
        setLoadError(error.message);
      });
  }, []);

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return records.slice(0, 6);
    }
    return records
      .filter((record) => JSON.stringify(record).toLowerCase().includes(normalized))
      .slice(0, 10);
  }, [records, query]);

  return (
    <>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
        <TextField aria-label='search' placeholder='Search cases' size='small' />
        <Button sx={{ ml: 1 }}>Open Case</Button>
      </Box>
      <div style={{ height: 320 }}>
        <CytoscapeComponent
          cy={(cy) => {
            cyRef.current = cy;
          }}
          elements={[
            { data: { id: 'a' } },
            { data: { id: 'b' } },
            { data: { id: 'ab', source: 'a', target: 'b' } },
          ]}
        />
      </div>

      <Paper sx={{ m: 2, p: 2 }} elevation={1}>
        <Typography variant='h6'>Developer Portal Ecosystem Search</Typography>
        <Typography variant='body2' sx={{ mb: 2 }}>
          Search plugins, developers, partners, integrations, and ecosystem events from the Summit Platform Index.
        </Typography>
        <TextField
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Try: observability, graph-analytics, slack'
          size='small'
        />
        {loadError ? (
          <Typography color='error' sx={{ mt: 1 }}>
            {loadError}
          </Typography>
        ) : (
          <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
            {filtered.map((record) => (
              <Paper key={record.id} variant='outlined' sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 600 }}>{record.name}</Typography>
                <Chip size='small' label={record.type} sx={{ mr: 1, mt: 0.5 }} />
                {record.category && <Chip size='small' label={record.category} sx={{ mr: 1, mt: 0.5 }} />}
                {record.platform && <Chip size='small' label={record.platform} sx={{ mt: 0.5 }} />}
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <div id='timeline'>
        <div className='brush' />
      </div>
      <Button sx={{ m: 2 }}>Save View</Button>
    </>
  );
}
