"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LocaleSelector;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useI18n_1 = require("../../hooks/useI18n");
function LocaleSelector({ variant = 'button', showLabel = true, size = 'medium', }) {
    const { locale, setLocale, availableLocales, t } = (0, useI18n_1.useI18n)();
    const [anchorEl, setAnchorEl] = (0, react_1.useState)(null);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleLocaleChange = (newLocale) => {
        setLocale(newLocale);
        handleClose();
    };
    const currentLocaleConfig = availableLocales.find((l) => l.code === locale);
    // Group locales by region
    const groupedLocales = {
        'Western Europe': availableLocales.filter((l) => ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'pt-PT', 'nl-NL'].includes(l.code)),
        'Northern Europe': availableLocales.filter((l) => ['da-DK', 'no-NO', 'sv-SE', 'fi-FI', 'is-IS'].includes(l.code)),
        'Central Europe': availableLocales.filter((l) => ['pl-PL', 'cs-CZ', 'sk-SK', 'hu-HU'].includes(l.code)),
        'Eastern & Southern Europe': availableLocales.filter((l) => ['ro-RO', 'bg-BG', 'hr-HR', 'sl-SI', 'et-EE', 'lv-LV', 'lt-LT', 'mt-MT', 'tr-TR', 'el-GR', 'mk-MK', 'al-AL', 'me-ME'].includes(l.code)),
    };
    return (<material_1.Box>
      <material_1.Button onClick={handleClick} startIcon={<icons_material_1.Language />} size={size} variant={variant === 'button' ? 'outlined' : 'text'} sx={{
            textTransform: 'none',
            minWidth: showLabel ? 120 : 'auto',
        }}>
        {currentLocaleConfig && (<>
            <span style={{ fontSize: '1.2em', marginRight: 8 }}>
              {currentLocaleConfig.flag}
            </span>
            {showLabel && (<material_1.Typography variant="body2" component="span">
                {currentLocaleConfig.name}
              </material_1.Typography>)}
          </>)}
      </material_1.Button>

      <material_1.Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} PaperProps={{
            sx: {
                maxHeight: 480,
                width: 280,
            },
        }}>
        {Object.entries(groupedLocales).map(([region, locales], groupIndex) => (<material_1.Box key={region}>
            {groupIndex > 0 && <material_1.Divider />}
            <material_1.MenuItem disabled sx={{ opacity: 1, fontWeight: 'bold', fontSize: '0.75rem' }}>
              {region}
            </material_1.MenuItem>
            {locales.map((localeOption) => (<material_1.MenuItem key={localeOption.code} onClick={() => handleLocaleChange(localeOption.code)} selected={localeOption.code === locale} sx={{ pl: 3 }}>
                <material_1.ListItemIcon sx={{ minWidth: 36, fontSize: '1.5em' }}>
                  {localeOption.flag}
                </material_1.ListItemIcon>
                <material_1.ListItemText primary={localeOption.name} primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: localeOption.code === locale ? 'bold' : 'normal',
                }}/>
              </material_1.MenuItem>))}
          </material_1.Box>))}
      </material_1.Menu>
    </material_1.Box>);
}
