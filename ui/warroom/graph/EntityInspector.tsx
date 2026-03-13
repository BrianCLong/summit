/**
 * Summit War Room — Entity Inspector
 *
 * Detailed entity view with properties, relationships,
 * evidence links, and timeline events.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useWarRoomStore } from '../store';

export const EntityInspector: React.FC = () => {
  const selectedEntityId = useWarRoomStore((s) => s.selectedEntityId);
  const entities = useWarRoomStore((s) => s.entities);
  const relationships = useWarRoomStore((s) => s.relationships);
  const evidence = useWarRoomStore((s) => s.evidence);
  const timelineEvents = useWarRoomStore((s) => s.timelineEvents);
  const [tab, setTab] = React.useState(0);

  const entity = entities.find((e) => e.id === selectedEntityId);

  if (!entity) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select an entity to inspect.
        </Typography>
      </Box>
    );
  }

  const rels = relationships.filter((r) => r.source === entity.id || r.target === entity.id);
  const linkedEvidence = evidence.filter((e) => e.linkedEntities.includes(entity.id));
  const events = timelineEvents.filter((e) => e.entityIds.includes(entity.id));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4">{entity.label}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
          <Chip label={entity.type} size="small" color="primary" />
          <Chip label={entity.confidence} size="small" variant="outlined" />
          <Chip label={`${entity.sources.length} sources`} size="small" variant="outlined" />
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Properties" />
        <Tab label={`Relations (${rels.length})`} />
        <Tab label={`Evidence (${linkedEvidence.length})`} />
        <Tab label={`Events (${events.length})`} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {tab === 0 && (
          <List dense disablePadding>
            {Object.entries(entity.properties).map(([key, val]) => (
              <ListItem key={key} disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary={key}
                  secondary={String(val)}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {tab === 1 && (
          <List dense disablePadding>
            {rels.map((rel) => {
              const otherId = rel.source === entity.id ? rel.target : rel.source;
              const other = entities.find((e) => e.id === otherId);
              return (
                <ListItem key={rel.id} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={`${rel.type} → ${other?.label ?? otherId}`}
                    secondary={`confidence: ${rel.confidence} | weight: ${rel.weight}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}

        {tab === 2 && (
          <List dense disablePadding>
            {linkedEvidence.map((ev) => (
              <ListItem key={ev.id} disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary={ev.title}
                  secondary={`${ev.type} | reliability: ${ev.reliability}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {tab === 3 && (
          <List dense disablePadding>
            {events
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map((event) => (
                <ListItem key={event.id} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={event.title}
                    secondary={new Date(event.timestamp).toLocaleString()}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
          </List>
        )}
      </Box>
    </Box>
  );
};
