import React from 'react';
import { List, ListItem, ListItemText, Skeleton } from '@mui/material';
import { useSafeQuery } from '../../../hooks/useSafeQuery.ts';

export default function ResultList() {
  const { data, loading } = useSafeQuery<{ id: string; title: string }[]>({
    queryKey: 'search_results',
    mock: Array.from({ length: 10 }).map((_, i) => ({ id: `r${i}`, title: `Result ${i}` })),
  });
  if (loading) return <Skeleton variant="rounded" height={200} />;
  return (
    <List>
      {(data || []).map((r) => (
        <ListItem key={r.id} button>
          <ListItemText primary={r.title} />
        </ListItem>
      ))}
    </List>
  );
}

