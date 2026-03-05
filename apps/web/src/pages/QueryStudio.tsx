// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React, { useState } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { QueryInput } from '../components/QueryInput';
import { CypherPreview } from '../components/CypherPreview';
import { ResultView } from '../components/ResultView';
import { SavedQueriesList } from '../components/SavedQueriesList';

export const QueryStudio: React.FC = () => {
  const [cypher, setCypher] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleRunQuery = async (query: string) => {
      setLoading(true);
      try {
          // Mock fetch for now
          const res = await fetch('/api/query-studio/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cypher: query })
          });
          const data = await res.json();
          setResults(data);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handlePreview = async (prompt: string) => {
      setPreviewLoading(true);
      try {
          // Mock fetch
          const res = await fetch('/api/query-studio/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt })
          });
          const data = await res.json();
          if (data.cypher) {
              setCypher(data.cypher);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setPreviewLoading(false);
      }
  };

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>
        Query Studio
      </Typography>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2 }}>
                <QueryInput onPreview={handlePreview} loading={previewLoading} />
            </Paper>
            <Paper sx={{ p: 2, flex: 1 }}>
                <SavedQueriesList onSelect={setCypher} />
            </Paper>
        </Grid>

        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2 }}>
                <CypherPreview cypher={cypher} onChange={setCypher} onRun={handleRunQuery} loading={loading} />
            </Paper>
            <Paper sx={{ p: 2, flex: 1, overflow: 'hidden' }}>
                <ResultView results={results} />
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QueryStudio;
