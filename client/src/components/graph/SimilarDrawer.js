import React from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { Drawer, List, ListItem, ListItemText, Button } from '@mui/material';

const Q = gql`
  query ($id: ID!, $k: Int!) {
    similarEntities(entityId: $id, topK: $k) {
      id
      score
    }
  }
`;

export default function SimilarDrawer({ open, onClose, entityId, cy }) {
  const [run, { data, loading }] = useLazyQuery(Q);
  React.useEffect(() => {
    if (open && entityId) run({ variables: { id: entityId, k: 20 } });
  }, [open, entityId]);
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
        {data &&
          data.similarEntities.map((s) => (
            <ListItem
              key={s.id}
              button
              onClick={() => {
                const n = cy.$(`node[id = "${s.id}"]`);
                if (n.nonempty && n.nonempty()) {
                  cy.animate({ center: { eles: n }, duration: 200 });
                }
              }}
            >
              <ListItemText
                primary={s.id}
                secondary={`Score ${(s.score * 100).toFixed(1)}%`}
              />
            </ListItem>
          ))}
        <Button onClick={onClose}>Close</Button>
      </List>
    </Drawer>
  );
}
