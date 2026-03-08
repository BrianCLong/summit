"use strict";
/**
 * Theme Settings Component
 * User interface for managing theme preferences
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeSettings = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
const theme_queries_1 = require("../../theming/theme-queries");
const ThemeProvider_1 = require("../../theming/ThemeProvider");
const ThemeSettings = () => {
    const { darkMode, setDarkMode, themeSource, themeName, resetTheme } = (0, ThemeProvider_1.useAppTheme)();
    const { data: preferenceData } = (0, client_1.useQuery)(theme_queries_1.GET_MY_THEME_PREFERENCE);
    const { data: themesData } = (0, client_1.useQuery)(theme_queries_1.LIST_THEMES, {
        variables: { filter: { isActive: true } },
    });
    const [updatePreference] = (0, client_1.useMutation)(theme_queries_1.UPDATE_MY_THEME_PREFERENCE);
    const preference = preferenceData?.myThemePreference;
    const themes = themesData?.themes || [];
    const handleDarkModeChange = (event) => {
        setDarkMode(event.target.value);
    };
    const handleAutoSwitchChange = (event) => {
        updatePreference({
            variables: {
                input: {
                    autoSwitchByRole: event.target.checked,
                },
            },
        });
    };
    const handleThemeSelect = (themeId) => {
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
    return (<material_1.Card>
      <material_1.CardHeader title="Theme Preferences" subheader="Customize the appearance of the application"/>
      <material_1.CardContent>
        {/* Current Theme Info */}
        <material_1.Box sx={{ mb: 3 }}>
          <material_1.Typography variant="body2" color="text.secondary">
            Current Theme
          </material_1.Typography>
          <material_1.Typography variant="h6">
            {themeName || 'Default'}{' '}
            <material_1.Chip label={themeSource.replace('_', ' ')} size="small" sx={{ ml: 1 }}/>
          </material_1.Typography>
        </material_1.Box>

        {/* Dark Mode Preference */}
        <material_1.FormControl component="fieldset" sx={{ mb: 3 }}>
          <material_1.FormLabel component="legend">Dark Mode</material_1.FormLabel>
          <material_1.RadioGroup value={darkMode} onChange={handleDarkModeChange}>
            <material_1.FormControlLabel value="light" control={<material_1.Radio />} label="Light"/>
            <material_1.FormControlLabel value="dark" control={<material_1.Radio />} label="Dark"/>
            <material_1.FormControlLabel value="system" control={<material_1.Radio />} label="System Preference"/>
          </material_1.RadioGroup>
        </material_1.FormControl>

        {/* Auto Switch by Role */}
        <material_1.FormControlLabel control={<material_1.Switch checked={preference?.autoSwitchByRole !== false} onChange={handleAutoSwitchChange}/>} label="Automatically apply role-based theme" sx={{ mb: 3 }}/>

        {/* Theme Selection */}
        {!preference?.autoSwitchByRole && (<material_1.Box>
            <material_1.Typography variant="subtitle2" gutterBottom>
              Select Theme
            </material_1.Typography>
            {themes.map((theme) => (<material_1.Card key={theme.id} variant="outlined" sx={{
                    mb: 1,
                    cursor: 'pointer',
                    border: preference?.theme?.id === theme.id
                        ? 2
                        : 1,
                    borderColor: preference?.theme?.id === theme.id
                        ? 'primary.main'
                        : 'divider',
                }} onClick={() => handleThemeSelect(theme.id)}>
                <material_1.CardContent>
                  <material_1.Typography variant="h6">{theme.displayName}</material_1.Typography>
                  {theme.description && (<material_1.Typography variant="body2" color="text.secondary">
                      {theme.description}
                    </material_1.Typography>)}
                  {theme.role && (<material_1.Chip label={`For ${theme.role}`} size="small" sx={{ mt: 1 }}/>)}
                </material_1.CardContent>
              </material_1.Card>))}
          </material_1.Box>)}

        {/* Reset Button */}
        <material_1.Box sx={{ mt: 3 }}>
          <material_1.Button variant="outlined" onClick={handleReset}>
            Reset to Defaults
          </material_1.Button>
        </material_1.Box>
      </material_1.CardContent>
    </material_1.Card>);
};
exports.ThemeSettings = ThemeSettings;
