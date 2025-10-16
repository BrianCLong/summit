import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';

export default function APIDocs() {
  const src = useMemo(() => {
    const origin = window.location.origin;
    // In dev, server runs on 4000, UI on 3000.
    const serverOrigin = origin.includes(':3000')
      ? origin.replace(':3000', ':4000')
      : origin;
    return `${serverOrigin}/docs/openapi`;
  }, []);

  return (
    <Box sx={{ height: 'calc(100vh - 96px)' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        API Documentation
      </Typography>
      <Box sx={{ border: '1px solid #ddd', borderRadius: 1, height: '100%' }}>
        <iframe
          title="OpenAPI Docs"
          src={src}
          style={{ width: '100%', height: '100%', border: '0' }}
        />
      </Box>
    </Box>
  );
}
