import React from 'react'
import { Drawer, List, ListItem, ListItemText, Chip } from '@mui/material'

interface ExplainItem {
  model: string
  reason: string
}

interface ExplainRouteDrawerProps {
  open: boolean
  onClose: () => void
  explain: ExplainItem[]
}

export function ExplainRouteDrawer({
  open,
  onClose,
  explain,
}: ExplainRouteDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div style={{ width: 420, padding: 16 }}>
        <h3>Explain Route</h3>
        <List>
          {explain?.map((e, i) => (
            <ListItem key={i}>
              <ListItemText primary={e.model} secondary={e.reason} />
              <Chip size="small" label={e.reason} />
            </ListItem>
          ))}
        </List>
      </div>
    </Drawer>
  )
}
