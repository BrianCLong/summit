import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Divider,
  Slider,
  Stack,
  Typography,
  Chip,
} from '@mui/material';

const clampSliderValue = (value, fallback) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : fallback;
  }
  return value;
};

const GraphStylePanel = ({
  nodeTypeColors,
  nodeSize,
  edgeColor,
  edgeWidth,
  onNodeColorChange,
  onNodeSizeChange,
  onEdgeColorChange,
  onEdgeWidthChange,
  onSave,
  onReset,
  isSaving = false,
  isDirty = false,
  lastSavedAt,
  status,
}) => {
  const formattedTimestamp = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString()
    : null;

  const statusLabel = (() => {
    if (status === 'loading') return 'Loading saved styles…';
    if (status === 'saving') return 'Saving changes…';
    if (status === 'failed') return 'Unable to sync preferences';
    return null;
  })();

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1">Graph Appearance</Typography>
          <Typography variant="body2" color="text.secondary">
            Customize default styling for nodes and edges. Saved preferences are
            shared across sessions.
          </Typography>
        </Box>

        <Divider light />

        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2">Node Size</Typography>
            <Chip
              label={`${nodeSize}px`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>
          <Slider
            value={nodeSize}
            min={16}
            max={160}
            step={2}
            onChange={(_, value) =>
              onNodeSizeChange(clampSliderValue(value, nodeSize))
            }
            aria-label="Node size"
            valueLabelDisplay="auto"
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Node Type Colors
          </Typography>
          <Stack spacing={1}>
            {Object.entries(nodeTypeColors).map(([type, color]) => (
              <Stack
                key={type}
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography sx={{ textTransform: 'capitalize' }}>
                  {type}
                </Typography>
                <input
                  type="color"
                  value={color}
                  onChange={(event) =>
                    onNodeColorChange(type, event.target.value)
                  }
                  aria-label={`${type} color`}
                  style={{
                    width: 48,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Edge Style
          </Typography>
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography>Default Color</Typography>
              <input
                type="color"
                value={edgeColor}
                onChange={(event) => onEdgeColorChange(event.target.value)}
                aria-label="Edge color"
                style={{
                  width: 48,
                  height: 28,
                  border: 'none',
                  background: 'transparent',
                }}
              />
            </Stack>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mt: 1 }}
            >
              <Typography>Width</Typography>
              <Chip label={`${edgeWidth}px`} size="small" variant="outlined" />
            </Stack>
            <Slider
              value={edgeWidth}
              min={1}
              max={16}
              step={1}
              onChange={(_, value) =>
                onEdgeWidthChange(clampSliderValue(value, edgeWidth))
              }
              aria-label="Edge width"
              valueLabelDisplay="auto"
            />
          </Stack>
        </Box>

        <Divider light />

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={onSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button
            variant="text"
            color="inherit"
            onClick={onReset}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
          {isDirty && !isSaving && (
            <Typography variant="body2" color="warning.main">
              Unsaved changes
            </Typography>
          )}
        </Stack>

        {(formattedTimestamp || statusLabel) && (
          <Typography variant="caption" color="text.secondary">
            {statusLabel || `Last saved ${formattedTimestamp}`}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

GraphStylePanel.propTypes = {
  nodeTypeColors: PropTypes.objectOf(PropTypes.string).isRequired,
  nodeSize: PropTypes.number.isRequired,
  edgeColor: PropTypes.string.isRequired,
  edgeWidth: PropTypes.number.isRequired,
  onNodeColorChange: PropTypes.func.isRequired,
  onNodeSizeChange: PropTypes.func.isRequired,
  onEdgeColorChange: PropTypes.func.isRequired,
  onEdgeWidthChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  isDirty: PropTypes.bool,
  lastSavedAt: PropTypes.string,
  status: PropTypes.string,
};

export default GraphStylePanel;
