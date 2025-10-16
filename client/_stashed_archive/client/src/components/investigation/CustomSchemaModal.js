import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { gql, useMutation } from '@apollo/client';

const UPDATE_INVESTIGATION = gql`
  mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
    updateInvestigation(id: $id, input: $input) {
      id
      customSchema
    }
  }
`;

export default function CustomSchemaModal({
  open,
  onClose,
  investigationId,
  initialSchema = [],
}) {
  const [fields, setFields] = useState(initialSchema);
  const [save] = useMutation(UPDATE_INVESTIGATION);

  const addField = () =>
    setFields([...fields, { name: '', type: 'string', options: [] }]);
  const updateField = (index, key, value) => {
    const next = [...fields];
    next[index] = { ...next[index], [key]: value };
    setFields(next);
  };
  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };
  const handleSave = async () => {
    await save({
      variables: { id: investigationId, input: { customSchema: fields } },
    });
    onClose(fields);
  };
  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Custom Metadata Schema</DialogTitle>
      <DialogContent>
        {fields.map((field, idx) => (
          <Box
            key={idx}
            sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}
          >
            <TextField
              label="Field Name"
              value={field.name}
              onChange={(e) => updateField(idx, 'name', e.target.value)}
              size="small"
            />
            <TextField
              select
              label="Type"
              value={field.type}
              onChange={(e) => updateField(idx, 'type', e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="string">string</MenuItem>
              <MenuItem value="number">number</MenuItem>
              <MenuItem value="enum">enum</MenuItem>
            </TextField>
            {field.type === 'enum' && (
              <TextField
                label="Options"
                value={field.options.join(',')}
                onChange={(e) =>
                  updateField(
                    idx,
                    'options',
                    e.target.value.split(',').map((v) => v.trim()),
                  )
                }
                size="small"
              />
            )}
            <IconButton
              onClick={() => removeField(idx)}
              size="small"
              aria-label="remove-field"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<Add />} onClick={addField}>
          Add Field
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
