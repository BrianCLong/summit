import React from 'react'
import { TextField, Button, Box, CircularProgress } from '@mui/material'

interface CypherPreviewProps {
  cypher: string
  onChange: (cypher: string) => void
  onRun: (cypher: string) => void
  loading: boolean
}

export const CypherPreview: React.FC<CypherPreviewProps> = ({
  cypher,
  onChange,
  onRun,
  loading,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Cypher Query"
        multiline
        rows={6}
        value={cypher}
        onChange={e => onChange(e.target.value)}
        fullWidth
        InputProps={{
          style: { fontFamily: 'monospace' },
        }}
      />
      <Button
        variant="contained"
        color="secondary"
        onClick={() => onRun(cypher)}
        disabled={!cypher.trim() || loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        Run Query
      </Button>
    </Box>
  )
}
