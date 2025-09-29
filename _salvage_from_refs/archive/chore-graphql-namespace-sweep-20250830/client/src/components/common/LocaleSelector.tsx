import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from '@mui/material';
import { useI18n, Locale } from '../../hooks/useI18n.js';

interface LocaleSelectorProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export function LocaleSelector({ 
  variant = 'outlined', 
  size = 'small',
  showLabel = true 
}: LocaleSelectorProps) {
  const { locale, setLocale, availableLocales, t } = useI18n();

  return (
    <FormControl variant={variant} size={size} sx={{ minWidth: 200 }}>
      {showLabel && <InputLabel>Language</InputLabel>}
      <Select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        label={showLabel ? 'Language' : undefined}
        renderValue={(value) => {
          const selected = availableLocales.find(l => l.code === value);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{selected?.flag}</span>
              <Typography variant="body2">{selected?.name}</Typography>
            </Box>
          );
        }}
      >
        {availableLocales.map((localeOption) => (
          <MenuItem key={localeOption.code} value={localeOption.code}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <span style={{ fontSize: '1.2em' }}>{localeOption.flag}</span>
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">
                {localeOption.name}
              </Typography>
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}