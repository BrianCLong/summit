import React, { useState } from 'react';
import { TextField, Button, Box, CircularProgress, Typography } from '@mui/material';

interface QueryInputProps {
  onPreview: (prompt: string) => void;
  loading?: boolean;
}

export const QueryInput: React.FC<QueryInputProps> = ({ onPreview, loading = false }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && input.trim() && !loading) {
      e.preventDefault();
      onPreview(input);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Natural Language Query"
        multiline
        rows={4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., Find all people who work for 'Acme Corp'"
        fullWidth
        disabled={loading}
        helperText={
          <Typography variant="caption" color="textSecondary">
            Press Ctrl+Enter to generate
          </Typography>
        }
      />
      <Button
        variant="contained"
        onClick={() => onPreview(input)}
        disabled={!input.trim() || loading}
        aria-busy={loading}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Cypher'}
      </Button>
    </Box>
  );
};
