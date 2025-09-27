import React from 'react';
import { List, ListItem, ListItemText } from '@mui/material';

export default function ChainOfCustody({ entries = [] as { actor: string; action: string; at: string }[] }) {
  return (
    <List dense aria-label="Chain of custody">
      {entries.map((e, i) => (
        <ListItem key={i} divider>
          <ListItemText primary={`${e.actor} — ${e.action}`} secondary={new Date(e.at).toLocaleString()} />
        </ListItem>
      ))}
    </List>
  );
}

