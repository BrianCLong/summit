import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Button, Typography, IconButton, Tooltip, Box } from '@mui/material';
import { Delete, SelectAll } from '@mui/icons-material';

const getSummaryLabel = (nodeCount, edgeCount) => {
  if (!nodeCount && !edgeCount) {
    return 'No elements selected';
  }

  const nodeLabel = `${nodeCount} node${nodeCount === 1 ? '' : 's'}`;
  const edgeLabel = `${edgeCount} edge${edgeCount === 1 ? '' : 's'}`;

  if (nodeCount && edgeCount) {
    return `${nodeLabel} and ${edgeLabel} selected`;
  }

  return `${nodeCount ? nodeLabel : edgeLabel} selected`;
};

const BulkSelectionToolbar = ({
  nodeCount,
  edgeCount,
  onDelete,
  onClear,
  onToggleSelectionMode,
  selectionMode,
  disabled,
  loading,
}) => {
  const summaryLabel = getSummaryLabel(nodeCount, edgeCount);
  const nothingSelected = !nodeCount && !edgeCount;

  return (
    <Paper
      elevation={6}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        maxWidth: 520,
      }}
      role="status"
      aria-live="polite"
      aria-label="Bulk selection status"
    >
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2">{summaryLabel}</Typography>
        <Typography variant="caption" color="text.secondary">
          Use bulk selection mode to choose multiple nodes or edges.
        </Typography>
      </Box>
      <Tooltip title={selectionMode ? 'Disable bulk selection mode' : 'Enable bulk selection mode'}>
        <IconButton
          color={selectionMode ? 'primary' : 'default'}
          onClick={onToggleSelectionMode}
          aria-pressed={selectionMode}
          aria-label={
            selectionMode ? 'Disable bulk selection mode' : 'Enable bulk selection mode'
          }
          size="large"
        >
          <SelectAll />
        </IconButton>
      </Tooltip>
      <Button
        variant="outlined"
        onClick={onClear}
        disabled={disabled || nothingSelected}
        aria-label="Clear selected nodes and edges"
      >
        Clear
      </Button>
      <Button
        variant="contained"
        color="error"
        startIcon={<Delete />}
        onClick={onDelete}
        disabled={disabled || nothingSelected}
        aria-label="Delete selected nodes and edges"
      >
        {loading ? 'Deleting…' : 'Delete'}
      </Button>
    </Paper>
  );
};

BulkSelectionToolbar.propTypes = {
  nodeCount: PropTypes.number,
  edgeCount: PropTypes.number,
  onDelete: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onToggleSelectionMode: PropTypes.func.isRequired,
  selectionMode: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
};

BulkSelectionToolbar.defaultProps = {
  nodeCount: 0,
  edgeCount: 0,
  selectionMode: false,
  disabled: false,
  loading: false,
};

export default BulkSelectionToolbar;
