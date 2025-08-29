import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { TemplatesAPI } from '../../services/api.js';

const TemplateModal = ({ open, onClose, onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [scope, setScope] = useState('org');

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scope]);

  const loadTemplates = async () => {
    try {
      const data = await TemplatesAPI.list({ scope });
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Start from Template</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={scope}
          exclusive
          onChange={(_, v) => v && setScope(v)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="org">Shared</ToggleButton>
          <ToggleButton value="personal">My Templates</ToggleButton>
        </ToggleButtonGroup>
        <List>
          {templates.map((t) => (
            <ListItem
              button
              key={t.id}
              onClick={() => {
                onSelect && onSelect(t);
                onClose();
              }}
            >
              <ListItemText
                primary={t.name}
                secondary={t.scope === 'org' ? 'Shared' : 'Personal'}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateModal;
