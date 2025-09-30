import { Box, Typography } from ' @mui/material';
import { stageGoto } from '../../lib/mc/bridge';

export default function Thumbnails({ deck, active }) {
  if (!deck?.slides?.length) return null;
  return (
    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
      {deck.slides.map((s, i) => (
        <Box
          key={i}
          onClick={() => stageGoto(i)}
          sx={{
            minWidth: 140,
            borderRadius: 1,
            p: 1,
            border: '1px solid',
            borderColor: i === active ? 'primary.main' : 'divider',
            bgcolor: i === active ? 'primary.main' : 'background.paper',
            color: i === active ? 'primary.contrastText' : 'text.primary',
            cursor: 'pointer',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            {String(i + 1).padStart(2, '0')} — {s.title || 'Slide'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {(s.content || s.md || '').substring(0, 60)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}