import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useI18n, Locale } from '../../hooks/useI18n';

interface LocaleSelectorProps {
  variant?: 'button' | 'menu';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function LocaleSelector({
  variant = 'button',
  showLabel = true,
  size = 'medium',
}: LocaleSelectorProps) {
  const { locale, setLocale, availableLocales, t } = useI18n();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    handleClose();
  };

  const currentLocaleConfig = availableLocales.find((l) => l.code === locale);

  // Group locales by region
  const groupedLocales = {
    'Western Europe': availableLocales.filter((l) =>
      ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'pt-PT', 'nl-NL'].includes(l.code)
    ),
    'Northern Europe': availableLocales.filter((l) =>
      ['da-DK', 'no-NO', 'sv-SE', 'fi-FI', 'is-IS'].includes(l.code)
    ),
    'Central Europe': availableLocales.filter((l) =>
      ['pl-PL', 'cs-CZ', 'sk-SK', 'hu-HU'].includes(l.code)
    ),
    'Eastern & Southern Europe': availableLocales.filter((l) =>
      ['ro-RO', 'bg-BG', 'hr-HR', 'sl-SI', 'et-EE', 'lv-LV', 'lt-LT', 'mt-MT', 'tr-TR', 'el-GR', 'mk-MK', 'al-AL', 'me-ME'].includes(l.code)
    ),
  };

  return (
    <Box>
      <Button
        onClick={handleClick}
        startIcon={<LanguageIcon />}
        size={size}
        variant={variant === 'button' ? 'outlined' : 'text'}
        sx={{
          textTransform: 'none',
          minWidth: showLabel ? 120 : 'auto',
        }}
      >
        {currentLocaleConfig && (
          <>
            <span style={{ fontSize: '1.2em', marginRight: 8 }}>
              {currentLocaleConfig.flag}
            </span>
            {showLabel && (
              <Typography variant="body2" component="span">
                {currentLocaleConfig.name}
              </Typography>
            )}
          </>
        )}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 480,
            width: 280,
          },
        }}
      >
        {Object.entries(groupedLocales).map(([region, locales], groupIndex) => (
          <Box key={region}>
            {groupIndex > 0 && <Divider />}
            <MenuItem disabled sx={{ opacity: 1, fontWeight: 'bold', fontSize: '0.75rem' }}>
              {region}
            </MenuItem>
            {locales.map((localeOption) => (
              <MenuItem
                key={localeOption.code}
                onClick={() => handleLocaleChange(localeOption.code)}
                selected={localeOption.code === locale}
                sx={{ pl: 3 }}
              >
                <ListItemIcon sx={{ minWidth: 36, fontSize: '1.5em' }}>
                  {localeOption.flag}
                </ListItemIcon>
                <ListItemText
                  primary={localeOption.name}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: localeOption.code === locale ? 'bold' : 'normal',
                  }}
                />
              </MenuItem>
            ))}
          </Box>
        ))}
      </Menu>
    </Box>
  );
}
