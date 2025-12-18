'use client';
import React from 'react';
import {
  Button,
  Box
} from '@mui/material';
import { RocketLaunch } from '@mui/icons-material';

interface ActionsPanelProps {
  onOpenCommandPalette: () => void;
}

export default function ActionsPanel({ onOpenCommandPalette }: ActionsPanelProps) {
  return (
    <Box>
        <Button
          variant="contained"
          className="w-full"
          onClick={onOpenCommandPalette}
          startIcon={<RocketLaunch />}
        >
          Open Command Palette (⌘K)
        </Button>
    </Box>
  );
}
