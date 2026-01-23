import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function HuntDetail() {
  const { id } = useParams();

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h4">Hunt Detail Page</Typography>
        <Typography variant="h6">Hunt ID: {id}</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          This is a stub page for hunt details.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          (Not Implemented)
        </Typography>
      </CardContent>
    </Card>
  );
}
