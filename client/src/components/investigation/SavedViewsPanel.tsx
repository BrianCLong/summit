import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Button,
} from '@mui/material';

interface SavedView {
  id: string;
  name: string;
}

interface Props {
  views: SavedView[];
  onSelect?: (id: string) => void;
}

const SavedViewsPanel: React.FC<Props> = ({ views, onSelect }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Saved Views
    </Typography>
    <List>
      {views.map((v) => (
        <ListItem disablePadding key={v.id}>
          <ListItemButton onClick={() => onSelect?.(v.id)}>
            {v.name}
          </ListItemButton>
        </ListItem>
      ))}
    </List>
    <Button variant="outlined" size="small">
      Save Current View
    </Button>
  </Box>
);

export default SavedViewsPanel;
