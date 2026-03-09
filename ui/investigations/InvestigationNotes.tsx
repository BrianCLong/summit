/**
 * Summit War Room — Investigation Notes
 *
 * Freeform note-taking for the active investigation.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export const InvestigationNotes: React.FC = () => {
  const [notes, setNotes] = useState('');

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Investigation Notes
      </Typography>
      <TextField
        multiline
        fullWidth
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write investigation notes, analyst observations, and key findings here..."
        sx={{
          flex: 1,
          '& .MuiInputBase-root': { alignItems: 'flex-start', height: '100%' },
          '& .MuiInputBase-input': { fontSize: 13 },
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button size="small" variant="contained">
          Save Notes
        </Button>
      </Box>
    </Box>
  );
};
