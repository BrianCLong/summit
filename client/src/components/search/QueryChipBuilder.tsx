import React, { useState, useCallback } from 'react';
import {
  Box,
  Chip,
  TextField,
  Autocomplete,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import { Add, Clear, FilterList, Save, Share } from '@mui/icons-material';

export interface QueryChip {
  id: string;
  field: string;
  operator: string;
  value: string;
  type: 'filter' | 'term' | 'range' | 'exists';
}

interface QueryChipBuilderProps {
  chips: QueryChip[];
  onChipsChange: (chips: QueryChip[]) => void;
  onSave?: (name: string) => void;
  onShare?: () => void;
}

const FIELDS = [
  { label: 'Title', value: 'title' },
  { label: 'Content', value: 'content' },
  { label: 'Author', value: 'author' },
  { label: 'Type', value: 'type' },
  { label: 'Created', value: 'createdAt' },
  { label: 'Tags', value: 'tags' },
  { label: 'Status', value: 'status' },
];

const OPERATORS = {
  text: ['contains', 'equals', 'starts with', 'ends with'],
  date: ['after', 'before', 'between'],
  number: ['equals', 'greater than', 'less than', 'between'],
  select: ['equals', 'in', 'not in'],
};

export function QueryChipBuilder({
  chips,
  onChipsChange,
  onSave,
  onShare,
}: QueryChipBuilderProps) {
  const [newChip, setNewChip] = useState<Partial<QueryChip>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const addChip = useCallback(() => {
    if (!newChip.field || !newChip.operator || !newChip.value) return;

    const chip: QueryChip = {
      id: `chip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      field: newChip.field!,
      operator: newChip.operator!,
      value: newChip.value!,
      type: 'filter',
    };

    onChipsChange([...chips, chip]);
    setNewChip({});
  }, [chips, newChip, onChipsChange]);

  const removeChip = useCallback(
    (chipId: string) => {
      onChipsChange(chips.filter((chip) => chip.id !== chipId));
    },
    [chips, onChipsChange],
  );

  const parseKeyboardDSL = useCallback(
    (input: string) => {
      // Simple DSL parser: field:value OR field>value OR field<value
      const dslPattern = /(\w+)([:\<\>])([^\s]+)/g;
      const matches = Array.from(input.matchAll(dslPattern));

      const newChips = matches.map((match) => ({
        id: `dsl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        field: match[1],
        operator:
          match[2] === ':'
            ? 'equals'
            : match[2] === '>'
              ? 'greater than'
              : 'less than',
        value: match[3],
        type: 'filter' as const,
      }));

      if (newChips.length > 0) {
        onChipsChange([...chips, ...newChips]);
      }
    },
    [chips, onChipsChange],
  );

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterList color="primary" />
        <Typography variant="subtitle2">Query Builder</Typography>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {onSave && (
            <Tooltip title="Save search">
              <IconButton size="small" onClick={() => setSaveDialogOpen(true)}>
                <Save />
              </IconButton>
            </Tooltip>
          )}

          {onShare && (
            <Tooltip title="Share search">
              <IconButton size="small" onClick={onShare}>
                <Share />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Clear all filters">
            <IconButton size="small" onClick={() => onChipsChange([])}>
              <Clear />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              label={`${chip.field} ${chip.operator} ${chip.value}`}
              onDelete={() => removeChip(chip.id)}
              color="primary"
              variant="outlined"
              size="small"
            />
          ))}
        </Box>
      )}

      {/* Quick DSL input */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Quick search: type:document status:active author:john (or use builder below)"
          fullWidth
          size="small"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              parseKeyboardDSL(target.value);
              target.value = '';
            }
          }}
          helperText="Press Enter to parse. Format: field:value, field>value, field<value"
        />
      </Box>

      {/* Manual chip builder */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <Autocomplete
          size="small"
          sx={{ minWidth: 120 }}
          options={FIELDS}
          value={FIELDS.find((f) => f.value === newChip.field) || null}
          onChange={(_, option) =>
            setNewChip((prev) => ({ ...prev, field: option?.value }))
          }
          renderInput={(params) => <TextField {...params} label="Field" />}
        />

        <Autocomplete
          size="small"
          sx={{ minWidth: 100 }}
          options={OPERATORS.text} // Simplified - would be dynamic based on field type
          value={newChip.operator || null}
          onChange={(_, value) =>
            setNewChip((prev) => ({ ...prev, operator: value || '' }))
          }
          renderInput={(params) => <TextField {...params} label="Operator" />}
        />

        <TextField
          size="small"
          label="Value"
          value={newChip.value || ''}
          onChange={(e) =>
            setNewChip((prev) => ({ ...prev, value: e.target.value }))
          }
          onKeyDown={(e) => e.key === 'Enter' && addChip()}
          sx={{ minWidth: 120 }}
        />

        <Tooltip title="Add filter">
          <IconButton
            color="primary"
            onClick={addChip}
            disabled={!newChip.field || !newChip.operator || !newChip.value}
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Box>

      {chips.length > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          {chips.length} active filter{chips.length !== 1 ? 's' : ''}
        </Typography>
      )}
    </Paper>
  );
}
