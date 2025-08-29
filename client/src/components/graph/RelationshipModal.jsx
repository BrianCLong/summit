import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Slider,
  Box,
} from '@mui/material';
import { gql, useLazyQuery } from '@apollo/client';

const GET_REL_TYPES = gql`
  query {
    relationshipTypes {
      name
      category
      description
    }
  }
`;

export default function RelationshipModal({
  open,
  onClose,
  onConfirm,
  initialLabel = '',
  initialType = 'RELATED_TO',
}) {
  const [type, setType] = useState(initialType);
  const [label, setLabel] = useState(initialLabel || initialType);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [confidence, setConfidence] = useState(0.5);
  const [loadTypes, { data }] = useLazyQuery(GET_REL_TYPES);

  useEffect(() => {
    if (open) loadTypes();
  }, [open]);

  const types = (data?.relationshipTypes || []).map((t) => t.name);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Relationship</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={types}
          value={type}
          onChange={(e, v) => {
            setType(v || 'RELATED_TO');
            if (!label) setLabel(v || 'RELATED_TO');
          }}
          renderInput={(p) => <TextField {...p} label="Type" size="small" sx={{ mt: 1 }} />}
        />
        <TextField
          label="Label"
          size="small"
          fullWidth
          sx={{ mt: 2 }}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField
            label="Valid From"
            type="date"
            size="small"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
          <TextField
            label="Valid To"
            type="date"
            size="small"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={confidence}
            onChange={(e, v) => setConfidence(v)}
            valueLabelDisplay="on"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() =>
            onConfirm({
              type,
              label,
              validFrom: validFrom || null,
              validTo: validTo || null,
              confidence,
            })
          }
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
