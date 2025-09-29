import { Dialog, TextField, List, ListItem, ListItemText, Box, Typography } from '@mui/material';
import { useEffect, useState, useRef } from 'react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        if (!o) {
          // If opening, focus the input after a short delay
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutput(null);
    setError(null);

    const [justfile, target, ...argsArray] = command.split(' ');
    const args = argsArray.join(' ');

    try {
      const response = await fetch('http://localhost:3001/api/run-just-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ justfile, target, args }),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.stdout || data.stderr || 'Command executed successfully.');
      } else {
        setError(data.stderr || data.error || 'Failed to execute command.');
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Command Palette
        </Typography>
        <form onSubmit={handleCommandSubmit}>
          <TextField
            inputRef={inputRef}
            fullWidth
            variant="outlined"
            placeholder="Enter just command (e.g., Justfile.orchestra dash-refresh)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            sx={{ mb: 2 }}
          />
        </form>
        {output && (
          <Box
            sx={{
              bgcolor: '#eee',
              p: 1,
              borderRadius: 1,
              mt: 1,
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            <Typography variant="body2">Output:</Typography>
            <Typography variant="body2" component="pre">
              {output}
            </Typography>
          </Box>
        )}
        {error && (
          <Box
            sx={{
              bgcolor: '#fdd',
              p: 1,
              borderRadius: 1,
              mt: 1,
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            <Typography variant="body2" color="error">
              Error:
            </Typography>
            <Typography variant="body2" component="pre" color="error">
              {error}
            </Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
