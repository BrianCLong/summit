import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';

export default function SidePanel() {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6">Details</Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Entity" secondary="Select a node" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="Actions"
              secondary="Expand neighbors, Tag, Risk"
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
}
