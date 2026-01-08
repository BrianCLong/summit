import React, { useState } from 'react'
import { TextField, Button, Box } from '@mui/material'

interface QueryInputProps {
  onPreview: (prompt: string) => void
}

export const QueryInput: React.FC<QueryInputProps> = ({ onPreview }) => {
  const [input, setInput] = useState('')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Natural Language Query"
        multiline
        rows={4}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="e.g., Find all people who work for 'Acme Corp'"
        fullWidth
      />
      <Button
        variant="contained"
        onClick={() => onPreview(input)}
        disabled={!input.trim()}
      >
        Generate Cypher
      </Button>
    </Box>
  )
}
