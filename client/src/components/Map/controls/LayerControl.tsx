/**
 * Layer Control Component for managing map layers
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Slider,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Layers as LayersIcon,
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  type: 'base' | 'overlay';
}

export interface LayerControlProps {
  layers: LayerConfig[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  position?: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
}

/**
 * Layer control panel for managing map layers
 */
export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onLayerToggle,
  onOpacityChange,
  position = 'topright',
}) => {
  const [open, setOpen] = useState(true);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  const positionStyles: Record<string, React.CSSProperties> = {
    topright: { position: 'absolute', top: 10, right: 10, zIndex: 1000 },
    topleft: { position: 'absolute', top: 10, left: 10, zIndex: 1000 },
    bottomright: { position: 'absolute', bottom: 10, right: 10, zIndex: 1000 },
    bottomleft: { position: 'absolute', bottom: 10, left: 10, zIndex: 1000 },
  };

  const toggleLayerExpanded = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        ...positionStyles[position],
        minWidth: 250,
        maxWidth: 350,
      }}
    >
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e0e0e0',
          cursor: 'pointer',
        }}
        onClick={() => setOpen(!open)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LayersIcon fontSize="small" />
          <Typography variant="subtitle2">Layers</Typography>
        </Box>
        <IconButton size="small">
          {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {layers.map((layer) => (
            <Box key={layer.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <Switch
                    edge="end"
                    checked={layer.visible}
                    onChange={(e) => onLayerToggle(layer.id, e.target.checked)}
                    size="small"
                  />
                }
              >
                <ListItemButton
                  onClick={() => toggleLayerExpanded(layer.id)}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {layer.visible ? (
                      <Visibility fontSize="small" />
                    ) : (
                      <VisibilityOff fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={layer.name}
                    secondary={layer.type}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {expandedLayers.has(layer.id) ? (
                    <ExpandLess fontSize="small" />
                  ) : (
                    <ExpandMore fontSize="small" />
                  )}
                </ListItemButton>
              </ListItem>

              <Collapse in={expandedLayers.has(layer.id)}>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Opacity
                  </Typography>
                  <Slider
                    value={layer.opacity}
                    onChange={(_, value) =>
                      onOpacityChange(layer.id, value as number)
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                    size="small"
                  />
                </Box>
              </Collapse>
            </Box>
          ))}
        </List>
      </Collapse>
    </Paper>
  );
};
