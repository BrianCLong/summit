import { Box, Dialog } from '@mui/material';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ p: 3 }}>Command palette</Box>
    </Dialog>
  );
}
