import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import GraphQueryDebugger from '../features/graph-debug/GraphQueryDebugger';

const GraphQueryDebugPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Graph Query Debugger
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Translate GraphQL operations into Neo4j Cypher, review execution plans, and uncover optimization hints before running
          expensive graph workloads.
        </Typography>
      </Box>
      <GraphQueryDebugger />
    </Container>
  );
};

export default GraphQueryDebugPage;
