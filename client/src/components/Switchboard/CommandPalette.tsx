'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCommandSelect: (command: string) => void;
}

export default function CommandPalette({ open, onClose, onCommandSelect }: CommandPaletteProps) {
  const [commandInput, setCommandInput] = useState('');

  const commands = [
    'Start meeting',
    'Message Scribe',
    'Open Graph View',
    '/call maestro',
    '/present deck',
    '/join room',
    '/status api',
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.toLowerCase().includes(commandInput.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogContent className="p-0">
        <TextField
          fullWidth
          placeholder="/call maestro | /present deck | /join room | /status api"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          className="p-4"
        />
        <List>
          {filteredCommands.map((cmd, index) => (
            <ListItemButton key={index} onClick={() => onCommandSelect(cmd)}>
              <Typography>{cmd}</Typography>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
