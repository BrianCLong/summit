import React from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Box, Button, List, ListItem, Typography } from "@mui/material";

const ENTITY_REVISIONS = gql`
  query EntityRevisions($entityId: ID!) {
    entityRevisions(entityId: $entityId) {
      id
      version
      actorId
      createdAt
      diff
    }
  }
`;

const REVERT_ENTITY = gql`
  mutation RevertEntity($id: ID!, $revisionId: ID!) {
    revertEntity(id: $id, revisionId: $revisionId) {
      id
      label
      description
      properties
      updatedAt
    }
  }
`;

function EntityChangeLog({ entityId }) {
  const { data, loading } = useQuery(ENTITY_REVISIONS, {
    variables: { entityId },
    skip: !entityId,
  });
  const [revertEntity] = useMutation(REVERT_ENTITY);

  if (!entityId) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Change History
      </Typography>
      {loading && <Typography variant="body2">Loading...</Typography>}
      <List dense>
        {data?.entityRevisions.map((rev) => (
          <ListItem
            key={rev.id}
            secondaryAction={
              <Button
                onClick={() =>
                  revertEntity({
                    variables: { id: entityId, revisionId: rev.id },
                  })
                }
              >
                Revert
              </Button>
            }
          >
            <Typography variant="body2">
              v{rev.version} — {new Date(rev.createdAt).toLocaleString()}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default EntityChangeLog;
