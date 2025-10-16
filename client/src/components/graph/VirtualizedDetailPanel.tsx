import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import { MoreVert, OpenInNew } from '@mui/icons-material';

interface GraphEntity {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  score?: number;
}

interface VirtualizedDetailPanelProps {
  entities: GraphEntity[];
  height: number;
  onEntitySelect: (entity: GraphEntity) => void;
  onEntityAction: (entity: GraphEntity, action: string) => void;
}

const ITEM_HEIGHT = 72;

function EntityItem({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    entities: GraphEntity[];
    onSelect: (entity: GraphEntity) => void;
    onAction: (entity: GraphEntity, action: string) => void;
  };
}) {
  const entity = data.entities[index];

  return (
    <div style={style}>
      <ListItem
        button
        onClick={() => data.onSelect(entity)}
        sx={{ px: 2, py: 1 }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {entity.label}
              </Typography>
              <Chip
                size="small"
                label={entity.type}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 18 }}
              />
              {entity.score && (
                <Chip
                  size="small"
                  label={`${Math.round(entity.score * 100)}%`}
                  color="secondary"
                  sx={{ fontSize: '0.7rem', height: 18 }}
                />
              )}
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary" noWrap>
              {Object.entries(entity.properties)
                .slice(0, 2)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' • ')}
            </Typography>
          }
        />

        <ListItemSecondaryAction>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              data.onAction(entity, 'open');
            }}
          >
            <OpenInNew fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              data.onAction(entity, 'menu');
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>

      {index < data.entities.length - 1 && <Divider />}
    </div>
  );
}

export function VirtualizedDetailPanel({
  entities,
  height,
  onEntitySelect,
  onEntityAction,
}: VirtualizedDetailPanelProps) {
  const itemData = useMemo(
    () => ({
      entities,
      onSelect: onEntitySelect,
      onAction: onEntityAction,
    }),
    [entities, onEntitySelect, onEntityAction],
  );

  return (
    <Paper
      elevation={1}
      sx={{ height, display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          Entity Details
          <Chip size="small" label={entities.length} sx={{ ml: 1 }} />
        </Typography>
      </Box>

      {entities.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            Select entities to view details
          </Typography>
        </Box>
      ) : (
        <List
          height={height - 64} // Account for header
          itemCount={entities.length}
          itemSize={ITEM_HEIGHT}
          itemData={itemData}
          overscanCount={5} // Pre-render 5 items above/below viewport
        >
          {EntityItem}
        </List>
      )}

      {entities.length > 100 && (
        <Box sx={{ p: 1, bgcolor: 'grey.50', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Virtualized • {entities.length} entities
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
