import React from 'react';
import { Box, Container } from '@mui/material';
import DataProfilingTool from '../../components/ingestion/DataProfilingTool';

export default function DataProfilingPage(): JSX.Element {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <DataProfilingTool />
      </Box>
    </Container>
  );
}
