# Summit Internationalization (i18n) Guide

## Overview

Summit has been internationalized to support multiple languages across all frontends and the copilot AI system. This guide explains how the i18n system works and how to add new languages or translate new content.

## Architecture

### Frontend i18n

The i18n infrastructure is built on React hooks and dynamic imports, supporting 33 NATO member country locales.

**Key Components:**
- `client/src/hooks/useI18n.ts` - Core i18n hook with locale management
- `client/src/components/i18n/LocaleSelector.tsx` - UI component for language selection
- `client/src/locales/*.json` - Message catalogs for each language

### Supported Locales

The system currently supports 33 locales covering all NATO member countries:

- **Western Europe**: en-US, en-GB, fr-FR, de-DE, es-ES, it-IT, pt-PT, nl-NL
- **Northern Europe**: da-DK, no-NO, sv-SE, fi-FI, is-IS
- **Central Europe**: pl-PL, cs-CZ, sk-SK, hu-HU
- **Eastern & Southern Europe**: ro-RO, bg-BG, hr-HR, sl-SI, et-EE, lv-LV, lt-LT, mt-MT, tr-TR, el-GR, mk-MK, al-AL, me-ME

### Current Translations

Fully implemented translations:
- **English (en-US)** - Complete
- **Spanish (es-ES)** - Complete

All other locales fall back to English until translations are added.

## Using i18n in Components

### Basic Usage

```tsx
import { useI18n } from '../../hooks/useI18n';

function MyComponent() {
  const { t, locale, setLocale, formatDate, formatNumber } = useI18n();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('dashboard.stats.activeInvestigations')}</p>
      <p>{formatDate(new Date())}</p>
      <p>{formatNumber(1234567.89)}</p>
    </div>
  );
}
```

### Translation with Parameters

```tsx
// Message catalog:
{
  "dashboard.entitiesPlural": "{count} entities"
}

// Component:
<p>{t('dashboard.entitiesPlural', { count: 42 })}</p>
// Output: "42 entities"
```

### Loading State

The `useI18n` hook returns an `isLoading` flag that's true while locale files are being loaded:

```tsx
const { t, isLoading } = useI18n();

if (isLoading) {
  return <div>{t('common.loading')}</div>;
}
```

### Adding the Locale Selector

```tsx
import LocaleSelector from '../i18n/LocaleSelector';

function Header() {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <LocaleSelector variant="button" size="small" showLabel={true} />
      {/* other header content */}
    </Box>
  );
}
```

## Message Catalog Structure

Message catalogs are organized into logical namespaces:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "save": "Save"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "investigations": "Investigations"
  },
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out"
  },
  "dashboard": {
    "title": "Dashboard",
    "stats": {
      "activeInvestigations": "Active Investigations"
    }
  }
}
```

## Adding a New Language

### 1. Create Message Catalog

Create a new file: `client/src/locales/{locale-code}.json`

Example for French (fr-FR):

```bash
cp client/src/locales/en-US.json client/src/locales/fr-FR.json
```

### 2. Translate Messages

Edit the new file and translate all strings:

```json
{
  "common": {
    "loading": "Chargement...",
    "error": "Erreur",
    "save": "Enregistrer"
  },
  ...
}
```

### 3. Test

The locale is automatically available in the LocaleSelector once the file exists. No code changes needed!

## Copilot Localization

The AI Copilot responds in the user's selected language while preserving:
- Evidence and citation structure
- Entity names and identifiers
- Technical metadata

### Implementation

Copilot responses are localized via:
1. **Template localization** - Response templates are stored in message catalogs
2. **Locale-aware prompt shaping** - The backend receives the user's locale preference
3. **Dynamic response generation** - Responses adapt based on locale while keeping structured data intact

Example:

```tsx
// Helper function generates localized responses
function getLocalizedResponses(t) {
  return {
    'analyze network': [
      t('copilot.responses.networkAnalysis.title'),
      '',
      t('copilot.responses.networkAnalysis.keyFindings'),
      '• ' + t('copilot.responses.networkAnalysis.detected', { count: 3 }),
      // Entity names and data remain unchanged
      '• High: TechCorp Inc (financial irregularities)',
    ],
  };
}
```

## User Preference Storage

User locale preferences are stored in:
1. **LocalStorage** (client-side) - `localStorage.getItem('locale')`
2. **User Profile** (server-side) - `user.preferences.locale`

### GraphQL Integration

Update user locale preference:

```graphql
mutation UpdateLocale {
  updateUserPreferences(
    userId: "user-123"
    preferences: { locale: "es-ES" }
  ) {
    id
    preferences
  }
}
```

## Locale Detection

On first load, the system detects locale in this order:
1. User's saved preference (localStorage)
2. Browser language setting
3. Falls back to `en-US`

## Date and Number Formatting

The `useI18n` hook provides locale-aware formatting:

```tsx
const { formatDate, formatNumber, formatCurrency, locale } = useI18n();

// Dates
formatDate(new Date());
// en-US: "01/15/2025"
// es-ES: "15/01/2025"
// de-DE: "15.01.2025"

// Numbers
formatNumber(1234567.89);
// en-US: "1,234,567.89"
// de-DE: "1.234.567,89"
// fr-FR: "1 234 567,89"

// Currency
formatCurrency(1234.56, 'EUR');
// en-US: "€1,234.56"
// es-ES: "1.234,56 €"
// de-DE: "1.234,56 €"
```

## Components Updated with i18n

✅ **Fully Localized:**
- `LoginPage` - Authentication flow
- `Dashboard` - Main dashboard with stats and investigations
- `IntelligentCopilot` - AI assistant with localized responses
- `LocaleSelector` - Language picker component

🚧 **To Be Localized:**
- Conductor UI
- Docs Site
- Additional app frontends

## Best Practices

### 1. Always Use Translation Keys

❌ **Bad:**
```tsx
<Button>Sign In</Button>
```

✅ **Good:**
```tsx
<Button>{t('auth.signIn')}</Button>
```

### 2. Use Namespaces

Organize translations logically:
- `common.*` - Shared UI elements
- `errors.*` - Error messages
- `{feature}.*` - Feature-specific strings

### 3. Parameterize Dynamic Content

❌ **Bad:**
```tsx
t('message') + userName + t('suffix')
```

✅ **Good:**
```json
{
  "greeting": "Welcome, {name}!"
}
```
```tsx
t('greeting', { name: userName })
```

### 4. Keep Keys Descriptive

❌ **Bad:**
```json
{
  "btn1": "Save",
  "msg": "Success"
}
```

✅ **Good:**
```json
{
  "common.save": "Save",
  "notifications.success": "Success"
}
```

### 5. Preserve Technical Terms

Don't translate:
- Entity IDs
- Technical identifiers
- API endpoints
- Code/file names
- Citations and evidence references

## Testing

### Manual Testing

1. Open the application
2. Click the LocaleSelector (flag icon)
3. Select a different language
4. Verify:
   - All UI text updates immediately
   - No English strings remain visible
   - Layout doesn't break with longer text
   - Dates and numbers format correctly

### Automated Testing

```tsx
import { render } from '@testing-library/react';
import { useI18n } from './hooks/useI18n';

test('component renders in Spanish', async () => {
  const { t, setLocale } = useI18n();
  setLocale('es-ES');
  await waitFor(() => !isLoading);

  const { getByText } = render(<MyComponent />);
  expect(getByText('Panel de Control')).toBeInTheDocument();
});
```

## Performance

### Lazy Loading

Locale files are loaded on-demand and cached:
- Only requested locales are fetched
- Loaded translations are cached in memory
- No performance impact after initial load

### Bundle Size

Each locale file is ~5-15KB. The base i18n infrastructure adds ~3KB to the bundle.

## Troubleshooting

### Missing Translation

If a key is not found:
1. Console warning is shown: `Translation key "x.y.z" not found`
2. The key itself is returned as fallback
3. Falls back to English if available

### Locale Not Loading

Check:
1. File exists: `client/src/locales/{locale}.json`
2. File is valid JSON
3. Console for import errors

### LocaleSelector Not Updating

- Ensure `useI18n` is called in the component
- Check that locale state is properly lifted
- Verify localStorage is accessible

## Adding i18n to New Components

1. **Import the hook:**
   ```tsx
   import { useI18n } from '../../hooks/useI18n';
   ```

2. **Use in component:**
   ```tsx
   const { t } = useI18n();
   ```

3. **Add strings to catalogs:**
   ```json
   {
     "myFeature": {
       "title": "My Feature",
       "description": "Feature description"
     }
   }
   ```

4. **Use translations:**
   ```tsx
   <h1>{t('myFeature.title')}</h1>
   ```

## Future Enhancements

Planned improvements:
- [ ] Right-to-left (RTL) language support (Arabic, Hebrew)
- [ ] Pluralization rules for complex languages
- [ ] Translation management platform integration
- [ ] Automated translation quality checks
- [ ] Context hints for translators
- [ ] String interpolation with HTML support
- [ ] Translation coverage reports

## Support

For questions or issues:
- File an issue in the repository
- Check existing translations for examples
- Review component implementations in `client/src/components/`

## License

All translations maintain the same license as the Summit project.
