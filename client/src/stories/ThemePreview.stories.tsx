import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import { useTenantTheme } from '../theme/ThemeProvider.jsx';

const PaletteSwatches: React.FC = () => {
  const { theme, mode } = useTenantTheme();
  const tokens = mode === 'dark' ? theme.dark : theme.light;

  const palette = [
    { label: 'Primary', key: 'primary', textColor: tokens.primaryContrast },
    { label: 'Secondary', key: 'secondary', textColor: tokens.primaryContrast },
    { label: 'Accent', key: 'accent', textColor: tokens.primaryContrast },
    { label: 'Background', key: 'background', textColor: tokens.text },
    { label: 'Surface', key: 'surface', textColor: tokens.text },
    { label: 'Surface Muted', key: 'surfaceMuted', textColor: tokens.text },
    { label: 'Success', key: 'success', textColor: tokens.primaryContrast },
    { label: 'Warning', key: 'warning', textColor: tokens.primaryContrast },
    { label: 'Danger', key: 'danger', textColor: tokens.primaryContrast },
  ];

  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {palette.map((swatch) => (
        <Grid item xs={12} sm={6} md={4} key={swatch.key}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: tokens[swatch.key as keyof typeof tokens],
              color: swatch.textColor,
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              {swatch.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {tokens[swatch.key as keyof typeof tokens]}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              CSS: var(--color-{swatch.key.replace(/([A-Z])/g, '-$1').toLowerCase()})
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

const ComponentShowcase: React.FC = () => {
  const { theme, mode } = useTenantTheme();
  const tokens = mode === 'dark' ? theme.dark : theme.light;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        display: 'grid',
        gap: 3,
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
            {theme.name}
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 480 }}>
            This tenant theme uses {tokens.fontBody.split(',')[0].replace(/'/g, '')} for body text and{' '}
            {tokens.fontHeading.split(',')[0].replace(/'/g, '')} for headings. Buttons, inputs, and badges below use
            live CSS variables.
          </Typography>
        </Stack>
        <Avatar sx={{ bgcolor: 'var(--color-primary)', width: 64, height: 64, fontWeight: 700 }}>IG</Avatar>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Button variant="contained" sx={{ bgcolor: 'var(--color-primary)' }}>
          Primary Action
        </Button>
        <Button variant="outlined" sx={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>
          Secondary
        </Button>
        <Chip label="Tenant" color="primary" sx={{ bgcolor: 'var(--color-accent)', color: 'var(--color-primary-contrast)' }} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Search investigations"
          placeholder="Type to filter"
          fullWidth
          InputProps={{
            sx: {
              borderRadius: 'var(--radius-md)',
            },
          }}
        />
        <TextField
          label="Status"
          select
          SelectProps={{ native: true }}
          fullWidth
          InputProps={{
            sx: {
              borderRadius: 'var(--radius-md)',
            },
          }}
        >
          <option value="active">Active</option>
          <option value="review">Review</option>
          <option value="archived">Archived</option>
        </TextField>
      </Stack>
    </Paper>
  );
};

const ThemePreview: React.FC = () => (
  <Stack spacing={4} sx={{ color: 'var(--color-text)' }}>
    <Box>
      <Typography variant="overline" sx={{ letterSpacing: '0.18em', opacity: 0.7 }}>
        Tenant theming
      </Typography>
      <Typography variant="h3" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
        Palette tokens
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 520, mt: 1 }}>
        Live preview of CSS variables delivered by the theming engine. Switch the global toolbar to inspect dark mode and
        ensure contrast remains accessible.
      </Typography>
      <PaletteSwatches />
    </Box>

    <Box>
      <Typography variant="h3" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
        Components
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 520, mt: 1 }}>
        Buttons, form inputs, badges, and layout primitives inherit the active theme and remain WCAG AA compliant across
        modes.
      </Typography>
      <ComponentShowcase />
    </Box>
  </Stack>
);

const meta: Meta<typeof ThemePreview> = {
  title: 'Design System/Tenant Theme',
  component: ThemePreview,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof ThemePreview>;

export const Overview: Story = {
  render: () => <ThemePreview />,
};
