import React, { useCallback, useState } from 'react';
import { Alert, Container, Stack, Typography } from '@mui/material';
import { GraphQueryBuilder } from '@/components/search/QueryChipBuilder';
import type { GraphQuery } from '@/types/graphQuery';

export default function GraphQueryBuilderPage() {
  const [query, setQuery] = useState<GraphQuery>({ nodes: [], edges: [] });
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const handleSave = useCallback((name: string, currentQuery: GraphQuery) => {
    setLastSaved(name);
    console.info('Saved graph query', name, currentQuery);
  }, []);

  const handleShare = useCallback((currentQuery: GraphQuery) => {
    const payload = JSON.stringify(currentQuery, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(payload).catch(() => {
        console.warn('Unable to copy graph query to clipboard');
      });
    }
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1">
            Graph Query Builder
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Assemble graph patterns visually by connecting entity and relationship conditions.
            The builder validates your query in real time using the GraphQL API so you can
            confidently execute complex graph searches.
          </Typography>
        </Stack>

        {lastSaved && (
          <Alert severity="success" onClose={() => setLastSaved(null)}>
            Saved query <strong>{lastSaved}</strong> locally. You can now reuse it in your
            investigations.
          </Alert>
        )}

        <GraphQueryBuilder
          query={query}
          onQueryChange={setQuery}
          onSave={handleSave}
          onShare={handleShare}
        />
      </Stack>
    </Container>
  );
}
