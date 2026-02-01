import { useState, useEffect } from 'react';
import { Box, TextField, List, ListItem, ListItemButton, ListItemText, Typography, Paper, CircularProgress } from '@mui/material';
import { transformIndex, Transform } from '../../lib/search/transformIndex';

export const TransformSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Transform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransforms = async () => {
      try {
        const response = await fetch('/api/transforms');
        if (!response.ok) {
          throw new Error('Failed to fetch transforms');
        }
        const data = await response.json();
        const transforms = data.transforms || [];
        transformIndex.setTransforms(transforms);
        setResults(transforms);
      } catch (err) {
        console.error(err);
        setError('Error loading transforms');
      } finally {
        setLoading(false);
      }
    };

    fetchTransforms();
  }, []);

  useEffect(() => {
    setResults(transformIndex.search(query));
  }, [query]);

  if (loading) {
     return <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>;
  }

  if (error) {
      return <Box p={2}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Run Transforms
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search transforms..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
        autoFocus
        slotProps={{ htmlInput: { 'data-testid': 'transform-search-input' } }}
      />
      <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List data-testid="transform-list">
          {results.map((transform) => (
            <ListItem key={transform.id} disablePadding>
              <ListItemButton>
                <ListItemText
                  primary={transform.name}
                  secondary={transform.description}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {results.length === 0 && (
             <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
               No transforms found.
             </Typography>
          )}
        </List>
      </Paper>
    </Box>
  );
};
