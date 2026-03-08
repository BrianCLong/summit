"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleSelector = LocaleSelector;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const useI18n_1 = require("../../hooks/useI18n");
function LocaleSelector({ variant = 'outlined', size = 'small', showLabel = true, }) {
    const { locale, setLocale, availableLocales, t } = (0, useI18n_1.useI18n)();
    return (<material_1.FormControl variant={variant} size={size} sx={{ minWidth: 200 }}>
      {showLabel && <material_1.InputLabel>Language</material_1.InputLabel>}
      <material_1.Select value={locale} onChange={(e) => setLocale(e.target.value)} label={showLabel ? 'Language' : undefined} renderValue={(value) => {
            const selected = availableLocales.find((l) => l.code === value);
            return (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{selected?.flag}</span>
              <material_1.Typography variant="body2">{selected?.name}</material_1.Typography>
            </material_1.Box>);
        }}>
        {availableLocales.map((localeOption) => (<material_1.MenuItem key={localeOption.code} value={localeOption.code}>
            <material_1.ListItemIcon sx={{ minWidth: 36 }}>
              <span style={{ fontSize: '1.2em' }}>{localeOption.flag}</span>
            </material_1.ListItemIcon>
            <material_1.ListItemText>
              <material_1.Typography variant="body2">{localeOption.name}</material_1.Typography>
            </material_1.ListItemText>
          </material_1.MenuItem>))}
      </material_1.Select>
    </material_1.FormControl>);
}
