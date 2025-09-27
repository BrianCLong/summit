import React from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, List, ListItem, ListItemText, Stack } from '@mui/material';
import ScoreBand from '../../components/badges/ScoreBand';

const QUERY = gql`
  query Suggestions {
    erSuggestions { pairId aId bId score band }
  }
`;

const MERGE = gql`
  mutation Merge($id: ID!) { erMerge(pairId: $id) { mergeId } }
`;

const REVERT = gql`
  mutation Revert($id: ID!) { erRevert(mergeId: $id) { reverted } }
`;

export default function ResolutionWorkbench() {
  const { data } = useQuery(QUERY);
  const [merge] = useMutation(MERGE);
  const [revert] = useMutation(REVERT);
  const items = data?.erSuggestions || [];
  return (
    <List>
      {items.map((s: any) => (
        <ListItem key={s.pairId} secondaryAction={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => merge({ variables: { id: s.pairId } })}>Merge</Button>
            <Button color="warning" onClick={() => revert({ variables: { id: s.pairId } })}>Revert</Button>
          </Stack>
        }>
          <ListItemText primary={`${s.aId} ↔ ${s.bId}`} secondary={<ScoreBand band={s.band} />} />
        </ListItem>
      ))}
    </List>
  );
}
