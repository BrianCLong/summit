# @intelgraph/i18n

Comprehensive internationalization (i18n) system for the Summit/IntelGraph platform.

## Features

- 🌍 **40+ Languages** - Support for NATO member countries, major world languages, and RTL languages
- 🔄 **RTL Support** - Built-in right-to-left language support (Arabic, Hebrew, Farsi, Urdu)
- ⚡ **i18next Integration** - Powered by i18next with ICU message format
- ⚛️ **React Integration** - Custom hooks and provider components
- 🎯 **Type-Safe** - Full TypeScript support with type definitions
- 📦 **Lazy Loading** - Load translations on-demand for better performance
- 🔍 **String Extraction** - CLI tools to extract hardcoded strings
- ✅ **Translation Validation** - QA tools to ensure translation quality
- 📊 **Coverage Reports** - Track translation completeness
- 💱 **Formatting** - Locale-aware date, number, and currency formatting

## Installation

```bash
pnpm add @intelgraph/i18n
```

## Quick Start

### 1. Wrap your app with I18nProvider

```tsx
import { I18nProvider } from '@intelgraph/i18n';

function App() {
  return (
    <I18nProvider defaultLocale="en-US" fallbackLocale="en-US">
      <YourApp />
    </I18nProvider>
  );
}
```

### 2. Use the i18n hook in components

```tsx
import { useI18n } from '@intelgraph/i18n';

function MyComponent() {
  const { t, locale, setLocale, formatDate, isRTL } = useI18n();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('common.welcome')}</h1>
      <p>{t('common.welcomeBack', { name: 'John' })}</p>
      <p>{formatDate(new Date())}</p>
    </div>
  );
}
```

### 3. Add language switcher

```tsx
import { LanguageSwitcher } from '@intelgraph/i18n';

function Header() {
  return (
    <header>
      <LanguageSwitcher
        variant="dropdown"
        showFlags
        showNames
        groupByRegion
      />
    </header>
  );
}
```

## Supported Languages

### LTR (Left-to-Right) Languages

**NATO Member Countries:**
- English (US, UK)
- French, German, Spanish, Italian, Portuguese, Dutch
- Danish, Norwegian, Swedish, Finnish, Icelandic
- Polish, Czech, Slovak, Hungarian
- Romanian, Bulgarian, Croatian, Slovenian
- Estonian, Latvian, Lithuanian, Maltese
- Turkish, Greek, Macedonian, Albanian, Montenegrin

**Asian Languages:**
- Chinese (Simplified, Traditional)
- Japanese
- Korean

### RTL (Right-to-Left) Languages

- Arabic (Saudi Arabia, Egypt)
- Hebrew (Israel)
- Persian/Farsi (Iran)
- Urdu (Pakistan)

## API Reference

### useI18n Hook

```tsx
const {
  locale,           // Current locale code
  setLocale,        // Change locale
  t,                // Translation function
  formatDate,       // Format dates
  formatNumber,     // Format numbers
  formatCurrency,   // Format currency
  formatRelativeTime, // Format relative time
  isRTL,            // Is current locale RTL?
  direction,        // 'ltr' or 'rtl'
  availableLocales, // List of all locales
  isLoading,        // Loading state
  changeLanguage,   // Alias for setLocale
} = useI18n();
```

### Translation Function

```tsx
// Simple translation
t('common.save') // "Save"

// With parameters
t('common.welcomeBack', { name: 'Alice' }) // "Welcome back, Alice!"

// With pluralization
t('common.item', { count: 1 }) // "1 item"
t('common.item', { count: 5 }) // "5 items"

// With context
t('button.submit', {}, { context: 'form' })

// With default value
t('custom.key', {}, { defaultValue: 'Default text' })
```

### Components

#### I18nProvider

```tsx
<I18nProvider
  defaultLocale="en-US"
  fallbackLocale="en-US"
  debug={false}
>
  {children}
</I18nProvider>
```

#### LanguageSwitcher

```tsx
<LanguageSwitcher
  variant="dropdown" // 'dropdown' | 'menu' | 'flags' | 'minimal'
  showFlags={true}
  showNames={true}
  groupByRegion={false}
/>
```

#### Convenience Components

```tsx
<FlagSelector />              // Just current flag
<CompactLanguageSelector />   // Dropdown without regions
<FullLanguageSelector />      // Dropdown with regional grouping
```

## Translation Files

### Structure

```
locales/
├── en-US/
│   ├── common.json
│   ├── auth.json
│   ├── navigation.json
│   └── dashboard.json
├── es-ES/
│   ├── common.json
│   └── ...
└── ar-SA/
    ├── common.json
    └── ...
```

### Namespaces

- `common` - Common UI elements (buttons, labels, messages)
- `auth` - Authentication and user management
- `navigation` - Navigation menus and breadcrumbs
- `dashboard` - Dashboard-specific strings
- `errors` - Error messages
- (Create custom namespaces as needed)

### Example Translation File

```json
{
  "welcome": "Welcome to IntelGraph",
  "welcomeBack": "Welcome back, {name}!",
  "save": "Save",
  "cancel": "Cancel",
  "item_one": "{count} item",
  "item_other": "{count} items",
  "nested": {
    "key": "Nested value"
  }
}
```

## CLI Tools

### String Extraction

Extract hardcoded strings from source code:

```bash
pnpm extract --help

# Extract strings from src directory
pnpm extract ./src

# Preview extraction without writing
pnpm extract ./src --dry-run

# Custom output and namespace
pnpm extract ./src --output ./locales/extracted --namespace ui
```

### Translation Validation

Validate translation completeness and correctness:

```bash
pnpm validate --help

# Validate all translations
pnpm validate

# Verbose output with details
pnpm validate --verbose

# Generate JSON report
pnpm validate --report validation-report.json

# Custom locales directory
pnpm validate --locales ./locales --base en-US
```

### Translation Coverage

Generate coverage report:

```bash
pnpm coverage
```

## Formatting Utilities

### Date Formatting

```tsx
const { formatDate } = useI18n();

formatDate(new Date());
// en-US: "11/21/2025"
// es-ES: "21/11/2025"
// de-DE: "21.11.2025"

formatDate(new Date(), {
  dateStyle: 'full'
});
// en-US: "Friday, November 21, 2025"
// es-ES: "viernes, 21 de noviembre de 2025"
```

### Number Formatting

```tsx
const { formatNumber } = useI18n();

formatNumber(1234567.89);
// en-US: "1,234,567.89"
// de-DE: "1.234.567,89"
// fr-FR: "1 234 567,89"
```

### Currency Formatting

```tsx
const { formatCurrency } = useI18n();

formatCurrency(1234.56, 'EUR');
// en-US: "€1,234.56"
// es-ES: "1.234,56 €"
// de-DE: "1.234,56 €"
```

### Relative Time Formatting

```tsx
const { formatRelativeTime } = useI18n();

formatRelativeTime(new Date(Date.now() - 3600000));
// en-US: "1 hour ago"
// es-ES: "hace 1 hora"
```

## RTL Language Support

The system automatically handles RTL languages:

```tsx
const { isRTL, direction } = useI18n();

// Apply direction to root element
<div dir={direction}>
  {/* Content automatically mirrors for RTL */}
</div>

// Conditional styling
<div style={{
  textAlign: isRTL ? 'right' : 'left',
  paddingRight: isRTL ? '1rem' : 0,
  paddingLeft: isRTL ? 0 : '1rem',
}}>
```

CSS automatically mirrors for RTL:
- `margin-left` → `margin-right`
- `padding-left` → `padding-right`
- `left` → `right`
- `border-radius` values flip
- Flexbox direction reverses

## Best Practices

### 1. Always Use Translation Keys

❌ **Bad:**
```tsx
<button>Save</button>
```

✅ **Good:**
```tsx
<button>{t('common.save')}</button>
```

### 2. Organize Keys Logically

Use namespaced, descriptive keys:

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "email": "Email",
      "password": "Password"
    }
  }
}
```

### 3. Parameterize Dynamic Content

❌ **Bad:**
```tsx
t('welcome') + ' ' + userName
```

✅ **Good:**
```tsx
t('welcomeBack', { name: userName })
```

### 4. Handle Pluralization

❌ **Bad:**
```tsx
`${count} item${count !== 1 ? 's' : ''}`
```

✅ **Good:**
```tsx
t('common.item', { count })
```

### 5. Preserve Technical Terms

Don't translate:
- Entity IDs and identifiers
- API endpoints
- Code/file names
- Technical constants

### 6. Test with Long Translations

Ensure your UI doesn't break with longer German/Finnish translations.

### 7. Test RTL Languages

Always test with an RTL language (Arabic, Hebrew) to ensure proper layout.

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Type Checking

```bash
pnpm typecheck
```

## Migration Guide

### From Legacy i18n System

If migrating from the legacy client i18n system:

1. **Install package:**
   ```bash
   pnpm add @intelgraph/i18n
   ```

2. **Replace imports:**
   ```tsx
   // Old
   import { useI18n } from '../hooks/useI18n';

   // New
   import { useI18n } from '@intelgraph/i18n';
   ```

3. **Update provider:**
   ```tsx
   // Old
   <LocaleProvider>

   // New
   <I18nProvider defaultLocale="en-US">
   ```

4. **API is mostly compatible:**
   - `t()` works the same
   - `locale`, `setLocale` work the same
   - `formatDate`, `formatNumber`, `formatCurrency` work the same
   - New: `formatRelativeTime`, `isRTL`, `direction`

## Troubleshooting

### Translations not loading

1. Check that translation files exist in `locales/{locale}/{namespace}.json`
2. Verify file is valid JSON
3. Check browser console for import errors

### Missing translation key

- Console warning shows: `Translation key "x.y.z" not found`
- The key itself is returned as fallback
- Falls back to English if available

### RTL layout issues

- Ensure `dir` attribute is set on root element
- Check CSS doesn't use absolute positioning
- Use logical CSS properties (`margin-inline-start` vs `margin-left`)

## Contributing

### Adding a New Language

1. Create directory: `locales/{locale-code}/`
2. Copy base locale files: `cp -r locales/en-US/* locales/{locale-code}/`
3. Translate all strings
4. Add locale to `LOCALE_CONFIGS` in `src/config/locales.ts`
5. Test thoroughly

### Adding a New Namespace

1. Create `locales/en-US/{namespace}.json`
2. Add namespace to i18next config
3. Create translations for all locales
4. Document usage

## License

Proprietary - IntelGraph Team

## Support

For questions or issues:
- Check this README
- Review existing translations for examples
- File an issue in the repository
