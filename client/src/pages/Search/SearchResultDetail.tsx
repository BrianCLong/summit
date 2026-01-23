import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function SearchResultDetail() {
  const { id } = useParams();

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h4">Search Result Detail Page</Typography>
        <Typography variant="h6">Result ID: {id}</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          This is a stub page for a detailed search result.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          (Not Implemented)
        </Typography>
      </CardContent>
    </Card>
  );
}
