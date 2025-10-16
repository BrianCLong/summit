import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { Drawer, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SIMILAR_QUERY = gql`
  query SimilarEntities($entityId: ID!, $topK: Int!) {
    similarEntities(entityId: $entityId, topK: $topK) {
      id
      score
    }
  }
`;

interface Props {
  entityId?: string;
  open: boolean;
  onClose: () => void;
  topK?: number;
}

export default function EntityDrawer({
  entityId,
  open,
  onClose,
  topK = 20,
}: Props) {
  const navigate = useNavigate();
  const { data, loading } = useQuery(SIMILAR_QUERY, {
    variables: { entityId: entityId as string, topK },
    skip: !open || !entityId,
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <List sx={{ width: 360, p: 2 }}>
        <ListItem>
          <ListItemText primary="Similar Entities" />
        </ListItem>
        {loading && (
          <ListItem>
            <ListItemText primary="Loading..." />
          </ListItem>
        )}
        {data?.similarEntities?.map((n: { id: string; score: number }) => (
          <ListItem
            key={n.id}
            button
            onClick={() => {
              navigate(`/entities/${n.id}`);
              onClose();
            }}
          >
            <ListItemText
              primary={n.id}
              secondary={`${(n.score * 100).toFixed(1)}%`}
            />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
