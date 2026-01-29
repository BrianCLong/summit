import React from 'react';
import { Card, CardContent, Typography, Box, Stack, IconButton } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { ArrowBack } from '@mui/icons-material';

interface SearchResult {
  id: string;
  title: string;
  type: string;
  snippet: string;
  score: number;
  timestamp: string;
}

export default function SearchResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useSafeQuery<SearchResult>({
    queryKey: `search_result_${id}`,
    mock: {
      id: id || 'result1',
      title: 'Sample Search Result',
      type: 'entity',
      snippet: 'This is a sample search result snippet...',
      score: 0.95,
      timestamp: new Date().toISOString(),
    },
    deps: [id],
  });

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/search')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5">Search Result</Typography>
      </Stack>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {data?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Type: {data?.type}
          </Typography>
          <Typography variant="body1" sx={{ my: 2 }}>
            {data?.snippet}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Relevance Score: {((data?.score || 0) * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Found: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
