import React from 'react';
import { Modal, Box, Typography, IconButton, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const hotkeys = [
  {
    combo: 'Ctrl + Shift + A',
    description: 'Add selected item to Case (OSINT Studio, Alerts, Health)',
  },
  { combo: 'Ctrl + 1', description: 'Navigate to Dashboard' },
  { combo: 'Ctrl + 2', description: 'Navigate to Social Network' },
  { combo: 'Ctrl + 3', description: 'Navigate to Behavioral Analytics' },
  { combo: 'Alt + 1', description: 'Navigate to Cases' },
  { combo: 'Alt + 2', description: 'Navigate to Reports' },
  { combo: 'Shift + 1', description: 'Navigate to Admin Observability' },
  // Add more hotkeys as they are implemented
];

function HotkeysOverlay({ open, handleClose }) {
  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="hotkeys-modal-title"
      aria-describedby="hotkeys-modal-description"
    >
      <Box sx={style}>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography id="hotkeys-modal-title" variant="h6" component="h2" gutterBottom>
          Keyboard Shortcuts
        </Typography>
        <List>
          {hotkeys.map((hotkey, index) => (
            <ListItem key={index}>
              <ListItemText primary={hotkey.combo} secondary={hotkey.description} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Modal>
  );
}

export default HotkeysOverlay;
