# Summit I18n System - Comprehensive Guide

> **Version**: 2.0
> **Last Updated**: 2025-11-21
> **Status**: ✅ Ready for Production

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Developer Guide](#developer-guide)
5. [Translation Management](#translation-management)
6. [RTL Language Support](#rtl-language-support)
7. [Best Practices](#best-practices)
8. [QA and Validation](#qa-and-validation)
9. [Performance](#performance)
10. [Troubleshooting](#troubleshooting)
11. [Migration Guide](#migration-guide)

---

## Overview

The Summit/IntelGraph platform now includes a comprehensive internationalization (i18n) system supporting 40+ languages with full RTL support.

### Key Features

- **40+ Languages**: NATO member countries, major world languages, RTL languages
- **RTL Support**: Full right-to-left language support (Arabic, Hebrew, Farsi, Urdu)
- **Type-Safe**: Full TypeScript support with strict typing
- **Framework**: Powered by i18next with ICU message format
- **React Integration**: Custom hooks and provider components
- **Lazy Loading**: On-demand translation loading for performance
- **QA Tools**: Automated validation and coverage reporting
- **String Extraction**: CLI tools to extract hardcoded strings
- **Context-Aware**: Support for pluralization, gender, and context

### Supported Languages

#### LTR (Left-to-Right)

**NATO Countries** (33 languages):
- 🇺🇸 English (US), 🇬🇧 English (UK)
- 🇫🇷 French, 🇩🇪 German, 🇪🇸 Spanish, 🇮🇹 Italian, 🇵🇹 Portuguese, 🇳🇱 Dutch
- 🇩🇰 Danish, 🇳🇴 Norwegian, 🇸🇪 Swedish, 🇫🇮 Finnish, 🇮🇸 Icelandic
- 🇵🇱 Polish, 🇨🇿 Czech, 🇸🇰 Slovak, 🇭🇺 Hungarian
- And 16 more...

**Asian Languages**:
- 🇨🇳 Chinese (Simplified), 🇹🇼 Chinese (Traditional)
- 🇯🇵 Japanese, 🇰🇷 Korean

#### RTL (Right-to-Left)

- 🇸🇦 Arabic (Saudi Arabia), 🇪🇬 Arabic (Egypt)
- 🇮🇱 Hebrew, 🇮🇷 Persian/Farsi, 🇵🇰 Urdu

---

## Architecture

### Package Structure

```
@intelgraph/i18n/
├── src/
│   ├── config/
│   │   ├── i18next.ts         # i18next configuration
│   │   └── locales.ts         # Locale definitions
│   ├── hooks/
│   │   └── useI18n.ts         # React hook
│   ├── components/
│   │   ├── I18nProvider.tsx   # Provider component
│   │   └── LanguageSwitcher.tsx # Language selector UI
│   ├── utils/
│   │   └── validation.ts      # Translation validation
│   └── types/
│       └── index.ts           # TypeScript types
├── locales/
│   ├── en-US/                 # Base locale
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── navigation.json
│   │   └── dashboard.json
│   ├── es-ES/                 # Spanish
│   ├── ar-SA/                 # Arabic (RTL)
│   └── .../                   # 37 more locales
├── scripts/
│   ├── extract-strings.js     # String extraction CLI
│   └── validate-translations.js # Validation CLI
└── README.md
```

### Data Flow

```
User Action (change language)
    ↓
useI18n hook
    ↓
i18next changeLanguage()
    ↓
Load translation bundle (lazy)
    ↓
Update React context
    ↓
Components re-render with new translations
    ↓
Update HTML dir/lang attributes (RTL support)
```

### Storage

1. **localStorage**: `i18nextLng` - User's language preference
2. **HTML attributes**: `<html lang="en-US" dir="ltr">` - Accessibility & RTL
3. **User Profile** (future): GraphQL mutation to persist to database

---

## Quick Start

### 1. Installation

```bash
cd summit
pnpm add @intelgraph/i18n
```

### 2. App Setup

```tsx
// apps/web/src/main.tsx
import { I18nProvider } from '@intelgraph/i18n';
import App from './App';

function Root() {
  return (
    <I18nProvider defaultLocale="en-US" fallbackLocale="en-US">
      <App />
    </I18nProvider>
  );
}
```

### 3. Use in Components

```tsx
// src/components/Dashboard.tsx
import { useI18n } from '@intelgraph/i18n';

function Dashboard() {
  const { t, locale, setLocale, formatDate, isRTL } = useI18n();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.stats.activeInvestigations')}: {count}</p>
      <p>{formatDate(new Date())}</p>
    </div>
  );
}
```

### 4. Add Language Switcher

```tsx
// src/components/Header.tsx
import { LanguageSwitcher } from '@intelgraph/i18n';

function Header() {
  return (
    <header>
      <nav>{/* ... */}</nav>
      <LanguageSwitcher variant="dropdown" showFlags showNames groupByRegion />
    </header>
  );
}
```

---

## Developer Guide

### Translation Keys

Use namespaced, hierarchical keys:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "welcome": "Welcome to IntelGraph",
    "welcomeBack": "Welcome back, {name}!"
  },
  "dashboard": {
    "title": "Dashboard",
    "stats": {
      "activeInvestigations": "Active Investigations",
      "totalEntities": "Total Entities"
    }
  }
}
```

### Translation Function

```tsx
const { t } = useI18n();

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
t('custom.key', {}, { defaultValue: 'Fallback text' })
```

### Pluralization

Use ICU message format for complex pluralization:

```json
{
  "item_one": "{count} item",
  "item_other": "{count} items",

  "file_zero": "No files",
  "file_one": "One file",
  "file_two": "Two files",
  "file_few": "{count} files",
  "file_many": "{count} files",
  "file_other": "{count} files"
}
```

Arabic has 6 plural forms (zero, one, two, few, many, other)!

### Formatting Utilities

```tsx
const { formatDate, formatNumber, formatCurrency, formatRelativeTime } = useI18n();

// Dates
formatDate(new Date());
// en-US: "11/21/2025"
// de-DE: "21.11.2025"
// ja-JP: "2025/11/21"

formatDate(new Date(), { dateStyle: 'full' });
// en-US: "Thursday, November 21, 2025"
// es-ES: "jueves, 21 de noviembre de 2025"

// Numbers
formatNumber(1234567.89);
// en-US: "1,234,567.89"
// de-DE: "1.234.567,89"
// fr-FR: "1 234 567,89"

// Currency
formatCurrency(1234.56, 'EUR');
// en-US: "€1,234.56"
// de-DE: "1.234,56 €"
// fr-FR: "1 234,56 €"

// Relative time
formatRelativeTime(new Date(Date.now() - 3600000));
// en-US: "1 hour ago"
// es-ES: "hace 1 hora"
// de-DE: "vor 1 Stunde"
```

### Creating New Translations

1. **Add to base locale** (`locales/en-US/<namespace>.json`)
2. **Use in code**: `t('namespace:key')`
3. **Translate to other locales**: Copy and translate
4. **Validate**: Run `pnpm validate` to check completeness

---

## Translation Management

### Adding a New Language

```bash
# 1. Create locale directory
mkdir -p packages/i18n/locales/fr-FR

# 2. Copy base locale files
cp packages/i18n/locales/en-US/*.json packages/i18n/locales/fr-FR/

# 3. Translate all strings in fr-FR/*.json

# 4. Validate
cd packages/i18n
pnpm validate --locales ./locales --base en-US
```

### String Extraction

Extract hardcoded strings from source code:

```bash
cd packages/i18n

# Preview extraction (dry run)
node scripts/extract-strings.js ../../apps/web/src --dry-run

# Extract to file
node scripts/extract-strings.js ../../apps/web/src \
  --output ./extracted \
  --namespace extracted

# Review extracted/extracted.json and organize keys
```

### Translation Validation

Check translation completeness and correctness:

```bash
cd packages/i18n

# Validate all translations
pnpm validate

# Verbose output with detailed issues
pnpm validate --verbose

# Generate JSON report
pnpm validate --report validation-report.json

# Custom options
pnpm validate --locales ./locales --base en-US
```

### Quality Checks

The validation tool checks for:

- ✅ **Missing keys**: Keys in base locale but not in target
- ✅ **Empty values**: Translation strings that are empty
- ✅ **Invalid interpolations**: Mismatched `{variables}`
- ✅ **Possibly untranslated**: Same value as base locale
- ✅ **Extra keys**: Keys in target but not in base
- ✅ **ICU format errors**: Invalid plural/select syntax

### Translation Workflow

```
Developer writes feature
    ↓
Uses t('key') for all strings
    ↓
Adds English translations to en-US/*.json
    ↓
Commits code
    ↓
CI validates translations
    ↓
Translators translate to other locales
    ↓
Run pnpm validate before commit
    ↓
CI validates again
    ↓
Merge
```

---

## RTL Language Support

### Automatic RTL Handling

The system automatically handles RTL when an RTL locale is selected:

```tsx
const { isRTL, direction } = useI18n();

// HTML attributes are automatically updated
// <html lang="ar-SA" dir="rtl">

// Apply to containers
<div dir={direction}>
  {/* Content automatically mirrors */}
</div>
```

### CSS Considerations

**Automatic Mirroring** (works automatically):
- `margin-left` ↔ `margin-right`
- `padding-left` ↔ `padding-right`
- `left` ↔ `right`
- `border-radius` values flip
- Flexbox direction reverses

**Use Logical Properties** (recommended):

```css
/* ❌ Don't use directional properties */
margin-left: 1rem;
padding-right: 0.5rem;

/* ✅ Use logical properties */
margin-inline-start: 1rem;
padding-inline-end: 0.5rem;
```

### RTL Testing Checklist

- [ ] Text aligns to the right
- [ ] Icons flip (e.g., arrows)
- [ ] Layouts mirror correctly
- [ ] Scrollbars appear on the left
- [ ] Modals and dropdowns open from right
- [ ] Forms flow right-to-left
- [ ] Navigation menus reverse
- [ ] Breadcrumbs reverse direction

### RTL Exceptions

Some elements should NOT mirror:
- Numbers (always LTR)
- Dates (usually LTR)
- Code blocks
- URLs
- Email addresses
- Entity IDs

Use `dir="ltr"` to override:

```tsx
<code dir="ltr">const x = 42;</code>
<span dir="ltr">{entityId}</span>
```

---

## Best Practices

### 1. Always Use Translation Keys

❌ **Bad:**
```tsx
<button>Save</button>
<h1>Dashboard</h1>
```

✅ **Good:**
```tsx
<button>{t('common.save')}</button>
<h1>{t('dashboard.title')}</h1>
```

### 2. Organize Keys Logically

Use namespaces and hierarchies:

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "email": "Email",
      "password": "Password",
      "submit": "Sign In"
    },
    "mfa": {
      "title": "Two-Factor Authentication",
      "code": "Verification Code"
    }
  }
}
```

### 3. Parameterize Dynamic Content

❌ **Bad:**
```tsx
{t('welcome')} {userName}
{count} {t('items')}
```

✅ **Good:**
```tsx
{t('welcomeBack', { name: userName })}
{t('item', { count })}
```

### 4. Handle Pluralization Properly

❌ **Bad:**
```tsx
{count} {count === 1 ? 'item' : 'items'}
```

✅ **Good:**
```tsx
{t('item', { count })}
```

### 5. Don't Translate Technical Terms

**Never translate:**
- Entity IDs, UUIDs
- API endpoints (`/api/v1/entities`)
- Technical constants (`HTTP_200_OK`)
- Code identifiers (`entityService`)
- File paths
- URLs

**Do translate:**
- UI labels
- Error messages
- Help text
- User-facing content

### 6. Provide Context for Translators

Use descriptive keys and add comments:

```json
{
  "button": {
    "submit": "Submit",           // Generic submit button
    "submit_form": "Submit Form", // Form-specific
    "submit_search": "Search"     // Search-specific
  }
}
```

### 7. Test with Long Translations

German and Finnish translations can be 30-40% longer than English. Ensure your UI doesn't break:

```tsx
// Test with long strings
const longText = "Aufmerksamkeitsverwaltungssystem";

// Use text truncation
<div className="truncate">{t('key')}</div>

// Or flexible layouts
<div className="flex flex-wrap">{t('key')}</div>
```

### 8. Keep Keys Stable

Don't change translation keys after deployment - it breaks existing translations:

```json
// ❌ Don't rename keys
{
  "oldKey": "Value"  →  "newKey": "Value"
}

// ✅ Add new keys if needed
{
  "oldKey": "Value",   // Keep for backward compat
  "newKey": "Value"    // Add new
}
```

---

## QA and Validation

### Automated Validation

```bash
# Run in CI/CD pipeline
pnpm validate --report validation-report.json

# Fail CI if coverage < 90%
if [ $(jq '.summary.coverage' report.json) < 90 ]; then
  echo "Translation coverage below 90%"
  exit 1
fi
```

### Manual QA Checklist

**Before Release:**

- [ ] Run `pnpm validate` - no errors
- [ ] Test with RTL language (Arabic, Hebrew)
- [ ] Test with Asian language (Chinese, Japanese)
- [ ] Test with long language (German, Finnish)
- [ ] Check layouts don't break
- [ ] Verify date/number formatting
- [ ] Test language switcher
- [ ] Verify translations load
- [ ] Check for hardcoded strings
- [ ] Test offline (cached translations)

### Translation Coverage Goals

- **Required for Release**: 90% coverage for primary languages
- **Primary Languages**: en-US, en-GB, es-ES, fr-FR, de-DE, ar-SA
- **Secondary Languages**: 70% coverage acceptable
- **New Features**: 100% coverage in en-US before merge

---

## Performance

### Lazy Loading

Translations are loaded on-demand:

```tsx
// ✅ Only loads when locale is selected
i18n.changeLanguage('fr-FR');
// → Fetches /locales/fr-FR/*.json

// ✅ Cached after first load
i18n.changeLanguage('fr-FR'); // Instant (cached)
```

### Bundle Size

- Base i18n infrastructure: ~3KB gzipped
- Each locale file: ~5-15KB (uncompressed JSON)
- Total initial load: ~3KB (no locales loaded upfront)

### Optimization Tips

1. **Use namespaces**: Only load needed namespaces
2. **Preload common locales**: Prefetch likely locales
3. **Cache translations**: Store in localStorage
4. **Compress locales**: Use gzip/brotli on server
5. **CDN**: Serve locale files from CDN

```tsx
// Preload likely locale
useEffect(() => {
  const browserLang = navigator.language;
  if (browserLang !== locale) {
    loadTranslationBundle(browserLang as Locale, 'common');
  }
}, []);
```

---

## Troubleshooting

### Translations Not Loading

**Symptom**: UI shows translation keys instead of translated text

**Solutions**:
1. Check file exists: `locales/{locale}/{namespace}.json`
2. Verify JSON is valid (use JSON validator)
3. Check browser console for import errors
4. Clear browser cache and reload

### Missing Translation Key

**Symptom**: Console warning: `Translation key "x.y.z" not found`

**Solutions**:
1. Add key to `locales/en-US/{namespace}.json`
2. Run `pnpm validate` to find missing keys
3. Check key spelling and namespace

### RTL Layout Broken

**Symptom**: Layout doesn't mirror correctly for RTL languages

**Solutions**:
1. Ensure `dir` attribute is set: `<div dir={direction}>`
2. Use logical CSS properties
3. Check for hardcoded `left`/`right` values
4. Test with `document.documentElement.dir = 'rtl'`

### Language Not Persisting

**Symptom**: Language resets on page reload

**Solutions**:
1. Check localStorage is accessible
2. Verify `i18nextLng` key is set
3. Check browser privacy settings
4. Ensure i18nextLanguageDetector is configured

### Performance Issues

**Symptom**: Slow language switching

**Solutions**:
1. Enable caching: Translation bundles are cached
2. Reduce translation file size
3. Use code splitting for large namespaces
4. Preload common locales

---

## Migration Guide

### From Legacy Client I18n

The new system is largely compatible with the legacy system:

#### Step 1: Install Package

```bash
pnpm add @intelgraph/i18n
```

#### Step 2: Update Imports

```tsx
// Old
import { useI18n } from '../hooks/useI18n';
import LocaleSelector from '../components/i18n/LocaleSelector';

// New
import { useI18n, LanguageSwitcher } from '@intelgraph/i18n';
```

#### Step 3: Update Provider

```tsx
// Old
<LocaleProvider>
  <App />
</LocaleProvider>

// New
<I18nProvider defaultLocale="en-US" fallbackLocale="en-US">
  <App />
</I18nProvider>
```

#### Step 4: Update Components

Most code works without changes:

```tsx
// ✅ Still works
const { t, locale, setLocale, formatDate } = useI18n();

// ✅ New features
const { isRTL, direction, formatRelativeTime } = useI18n();
```

#### Step 5: Migrate Locale Files

```bash
# Copy existing locales
cp -r client/src/locales/* packages/i18n/locales/

# Validate
cd packages/i18n
pnpm validate
```

#### Step 6: Test

- [ ] All translations load correctly
- [ ] Language switching works
- [ ] Formatting functions work
- [ ] No console errors

---

## GraphQL Integration

### User Language Preference

Store user's language preference in database:

```graphql
# Schema
type User {
  id: ID!
  email: String!
  preferences: UserPreferences!
}

type UserPreferences {
  locale: String!
  theme: String
  timezone: String
}

# Mutation
mutation UpdateUserLocale($userId: ID!, $locale: String!) {
  updateUserPreferences(
    userId: $userId
    preferences: { locale: $locale }
  ) {
    id
    preferences {
      locale
    }
  }
}

# Query
query GetUserPreferences($userId: ID!) {
  user(id: $userId) {
    preferences {
      locale
    }
  }
}
```

### Implementation

```tsx
import { useMutation, useQuery } from '@apollo/client';
import { useI18n } from '@intelgraph/i18n';

function App() {
  const { setLocale } = useI18n();

  // Load user preference
  const { data } = useQuery(GET_USER_PREFERENCES);

  useEffect(() => {
    if (data?.user?.preferences?.locale) {
      setLocale(data.user.preferences.locale);
    }
  }, [data]);

  // Save preference
  const [updateLocale] = useMutation(UPDATE_USER_LOCALE);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    updateLocale({
      variables: {
        userId: currentUserId,
        locale: newLocale
      }
    });
  };

  return <LanguageSwitcher />;
}
```

---

## Summary

You now have a comprehensive, production-ready i18n system for Summit/IntelGraph platform:

- ✅ 40+ languages with full RTL support
- ✅ Type-safe TypeScript integration
- ✅ React hooks and components
- ✅ Translation validation and QA tools
- ✅ Performance optimized with lazy loading
- ✅ Migration path from legacy system

**Next Steps:**

1. Install dependencies: `pnpm install`
2. Add translations to your features
3. Set up validation in CI/CD
4. Add language preferences to GraphQL
5. Test thoroughly with multiple locales

For questions or issues, refer to the [package README](../packages/i18n/README.md) or file an issue.

---

**Happy Internationalizing! 🌍**
