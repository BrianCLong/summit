import React from 'react';
import { Card, CardContent, Typography, Checkbox, FormControlLabel } from '@mui/material';

export default function FacetPanel() {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2">Facets</Typography>
        <FormControlLabel control={<Checkbox />} label="Status: Open" />
        <FormControlLabel control={<Checkbox />} label="Status: Closed" />
      </CardContent>
    </Card>
  );
}

