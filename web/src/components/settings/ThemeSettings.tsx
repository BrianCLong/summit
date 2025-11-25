/**
 * Theme Settings Component
 * User interface for managing theme preferences
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_MY_THEME_PREFERENCE,
  LIST_THEMES,
  UPDATE_MY_THEME_PREFERENCE,
} from '../../theming/theme-queries';
import { useAppTheme } from '../../theming/ThemeProvider';

export const ThemeSettings: React.FC = () => {
  const { darkMode, setDarkMode, themeSource, themeName, resetTheme } =
    useAppTheme();

  const { data: preferenceData } = useQuery(GET_MY_THEME_PREFERENCE);
  const { data: themesData } = useQuery(LIST_THEMES, {
    variables: { filter: { isActive: true } },
  });

  const [updatePreference] = useMutation(UPDATE_MY_THEME_PREFERENCE);

  const preference = preferenceData?.myThemePreference;
  const themes = themesData?.themes || [];

  const handleDarkModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDarkMode(event.target.value as 'light' | 'dark' | 'system');
  };

  const handleAutoSwitchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updatePreference({
      variables: {
        input: {
          autoSwitchByRole: event.target.checked,
        },
      },
    });
  };

  const handleThemeSelect = (themeId: string) => {
    updatePreference({
      variables: {
        input: {
          themeId,
          autoSwitchByRole: false,
        },
      },
    });
  };

  const handleReset = () => {
    resetTheme();
  };

  return (
    <Card>
      <CardHeader
        title="Theme Preferences"
        subheader="Customize the appearance of the application"
      />
      <CardContent>
        {/* Current Theme Info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Current Theme
          </Typography>
          <Typography variant="h6">
            {themeName || 'Default'}{' '}
            <Chip
              label={themeSource.replace('_', ' ')}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>

        {/* Dark Mode Preference */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Dark Mode</FormLabel>
          <RadioGroup value={darkMode} onChange={handleDarkModeChange}>
            <FormControlLabel
              value="light"
              control={<Radio />}
              label="Light"
            />
            <FormControlLabel value="dark" control={<Radio />} label="Dark" />
            <FormControlLabel
              value="system"
              control={<Radio />}
              label="System Preference"
            />
          </RadioGroup>
        </FormControl>

        {/* Auto Switch by Role */}
        <FormControlLabel
          control={
            <Switch
              checked={preference?.autoSwitchByRole !== false}
              onChange={handleAutoSwitchChange}
            />
          }
          label="Automatically apply role-based theme"
          sx={{ mb: 3 }}
        />

        {/* Theme Selection */}
        {!preference?.autoSwitchByRole && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Select Theme
            </Typography>
            {themes.map((theme: any) => (
              <Card
                key={theme.id}
                variant="outlined"
                sx={{
                  mb: 1,
                  cursor: 'pointer',
                  border:
                    preference?.theme?.id === theme.id
                      ? 2
                      : 1,
                  borderColor:
                    preference?.theme?.id === theme.id
                      ? 'primary.main'
                      : 'divider',
                }}
                onClick={() => handleThemeSelect(theme.id)}
              >
                <CardContent>
                  <Typography variant="h6">{theme.displayName}</Typography>
                  {theme.description && (
                    <Typography variant="body2" color="text.secondary">
                      {theme.description}
                    </Typography>
                  )}
                  {theme.role && (
                    <Chip
                      label={`For ${theme.role}`}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Reset Button */}
        <Box sx={{ mt: 3 }}>
          <Button variant="outlined" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
