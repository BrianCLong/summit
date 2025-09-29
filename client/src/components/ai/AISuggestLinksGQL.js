import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { SUGGEST_LINKS, AI_SUGGESTIONS_SUB } from '../../graphql/ai.gql.js';
import { Box, CircularProgress, List, ListItem, ListItemText, Typography } from '@mui/material';

export default function AISuggestLinksGQL({ entityId, limit = 5 }) {
  const [items, setItems] = useState([]);
  const { data, loading, error } = useQuery(SUGGEST_LINKS, {
    variables: { entityId, limit },
    skip: !entityId,
    fetchPolicy: 'cache-first',
  });
  const { data: subData } = useSubscription(AI_SUGGESTIONS_SUB, {
    variables: { entityId },
    skip: !entityId,
    onError: () => {},
  });

  useEffect(() => {
    const initial = data?.suggestLinks || [];
    setItems(initial);
  }, [data]);

  useEffect(() => {
    if (subData?.aiSuggestions) {
      // Merge or replace on stream; replace for now
      setItems(subData.aiSuggestions);
    }
  }, [subData]);

  if (!entityId) {
    return <Typography color="text.secondary">Select an entity to see AI suggestions.</Typography>;
  }
  if (loading && items.length === 0) return <CircularProgress size={20} />;
  if (error) return <Typography color="error">{error.message}</Typography>;

  return (
    <Box>
      {items.length === 0 ? (
        <Typography color="text.secondary">No suggestions found.</Typography>
      ) : (
        <List dense>
          {items.map((s, idx) => (
            <ListItem key={`${s.to}-${idx}`}>
              <ListItemText primary={`${s.from} → ${s.to}`} secondary={`score: ${s.score.toFixed(3)}${s.reason ? ` — ${s.reason}` : ''}`} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
