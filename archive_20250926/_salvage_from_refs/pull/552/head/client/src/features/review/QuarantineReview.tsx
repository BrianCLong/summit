import React from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, List, ListItem, ListItemText, Stack } from '@mui/material';
import ScoreBand from '../../components/badges/ScoreBand';

const QUERY = gql`
  query QuarantinedMedia {
    quarantinedMedia { id deepfakeBand deepfakeScore }
  }
`;

const MUTATION = gql`
  mutation Review($id: ID!, $decision: String!) {
    reviewMedia(mediaId: $id, decision: $decision) { id decision }
  }
`;

export default function QuarantineReview() {
  const { data, refetch } = useQuery(QUERY);
  const [review] = useMutation(MUTATION, { onCompleted: () => refetch() });
  const items = data?.quarantinedMedia || [];
  return (
    <List>
      {items.map((m: any) => (
        <ListItem key={m.id} secondaryAction={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => review({ variables: { id: m.id, decision: 'APPROVE' } })}>Approve</Button>
            <Button color="error" onClick={() => review({ variables: { id: m.id, decision: 'REJECT' } })}>Reject</Button>
          </Stack>
        }>
          <ListItemText primary={`Media ${m.id}`} secondary={<ScoreBand band={m.deepfakeBand || 'low'} />} />
        </ListItem>
      ))}
    </List>
  );
}
