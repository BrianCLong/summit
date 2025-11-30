# Role-Based UI Theming System

**Feature**: Role-Specific UI Customization and Theming Support
**Status**: ✅ Production Ready
**Version**: 1.0.0
**Date**: 2025-11-25

## Overview

The Role-Based Theming System provides dynamic UI customization based on user roles, allowing organizations to tailor the application appearance for different user types (Security Analysts, Compliance Officers, Executives, etc.) while giving individual users control over their preferences.

## Key Features

✅ **Role-Based Themes** - Automatic theme application based on user role
✅ **User Preferences** - Override automatic themes with manual selection
✅ **Dark Mode Support** - Light, dark, and system preference modes
✅ **Custom Overrides** - Fine-grained customization on top of base themes
✅ **Hot Reload** - Theme changes apply instantly without refresh
✅ **Material-UI Compatible** - Full MUI theme specification support
✅ **GraphQL API** - Complete CRUD operations via GraphQL
✅ **Real-Time Updates** - WebSocket subscriptions for theme changes
✅ **Theme Versioning** - Track theme changes with version numbers
✅ **Audit Trail** - Complete logging of all theme modifications

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│              React Frontend                     │
│  ┌────────────────────────────────────────┐    │
│  │  ThemeProvider (Context + MUI Theme)   │    │
│  │  - System dark mode detection          │    │
│  │  - Real-time theme subscription        │    │
│  │  - Theme caching                       │    │
│  └────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────┐    │
│  │  ThemeSettings Component               │    │
│  │  - Dark mode toggle                    │    │
│  │  - Theme selection                     │    │
│  │  - Auto-switch control                 │    │
│  └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                      │
                      ▼ GraphQL
┌─────────────────────────────────────────────────┐
│              Backend Services                   │
│  ┌────────────────────────────────────────┐    │
│  │  ThemeService                          │    │
│  │  - Theme CRUD operations               │    │
│  │  - Theme resolution logic              │    │
│  │  - Validation & merge                  │    │
│  └────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────┐    │
│  │  GraphQL Resolvers                     │    │
│  │  - Queries (get, list, validate)      │    │
│  │  - Mutations (create, update, delete)  │    │
│  │  - Subscriptions (theme updates)       │    │
│  └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                      │
                      ▼ PostgreSQL
┌─────────────────────────────────────────────────┐
│              Database                           │
│  - ui_themes                                    │
│  - user_theme_preferences                       │
│  - theme_components                             │
│  - theme_presets                                │
│  - theme_audit_log                              │
└─────────────────────────────────────────────────┘
```

### Theme Resolution Flow

```
User Request → Check user_theme_preferences
               │
               ├─ auto_switch_by_role = false?
               │  └─ Return user-selected theme
               │
               ├─ auto_switch_by_role = true?
               │  └─ Get role-based theme for user's role
               │
               └─ No preference found?
                  └─ Return default theme

Apply custom_overrides if present → Merge with base theme → Return effective theme
```

## Database Schema

### Tables

#### `ui_themes`
Stores theme definitions with Material-UI configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Unique theme identifier |
| display_name | VARCHAR(255) | Human-readable name |
| role | VARCHAR(100) | Target role (NULL = default) |
| tenant_id | VARCHAR(255) | Tenant isolation |
| theme_config | JSONB | MUI theme object |
| version | INTEGER | Theme version number |
| is_active | BOOLEAN | Active status |
| is_default | BOOLEAN | Default theme flag |

**Seed Data**: 5 pre-configured themes:
- System Default (light)
- Security Analyst (dark with red accents)
- Compliance Officer (formal light blue)
- Executive (elegant purple)
- Intelligence Analyst (balanced neutral)

#### `user_theme_preferences`
Per-user theme preferences and overrides.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | VARCHAR(255) | User identifier |
| tenant_id | VARCHAR(255) | Tenant identifier |
| theme_id | UUID | Selected theme (FK) |
| custom_overrides | JSONB | User customizations |
| auto_switch_by_role | BOOLEAN | Auto-apply role theme |
| dark_mode_preference | VARCHAR(20) | 'light', 'dark', 'system' |

#### `theme_components`
Reusable theme fragments for composition.

Categories: `color`, `typography`, `spacing`, `component`

#### `theme_presets`
Quick theme variations based on base themes.

#### `theme_audit_log`
Complete audit trail of theme changes.

### Functions

#### `get_effective_theme(user_id, tenant_id, user_role)`
Returns the effective theme configuration for a user considering:
1. User explicit selection (if auto-switch disabled)
2. Role-based theme
3. Default theme

#### `audit_theme_changes()`
Trigger function that logs all INSERT/UPDATE/DELETE operations on `ui_themes`.

## Backend API

### TypeScript Service

```typescript
// services/theming/theme-service.ts
class ThemeService {
  // Theme CRUD
  async createTheme(input: CreateThemeInput): Promise<UITheme>
  async getThemeById(id: string): Promise<UITheme | null>
  async listThemes(filters?: ThemeFilterInput): Promise<UITheme[]>
  async updateTheme(id: string, input: UpdateThemeInput): Promise<UITheme>
  async deleteTheme(id: string): Promise<boolean>

  // Theme Resolution
  async getEffectiveTheme(context: ThemeResolutionContext): Promise<EffectiveThemeResult>

  // User Preferences
  async getUserThemePreference(userId: string, tenantId: string): Promise<UserThemePreference | null>
  async updateUserThemePreference(userId: string, tenantId: string, input: UpdateUserThemePreferenceInput): Promise<UserThemePreference>

  // Validation & Utilities
  validateThemeConfig(config: ThemeConfig): ThemeValidationResult
  mergeThemeConfigs(base: ThemeConfig, override: ThemeConfig): ThemeConfig
  generateThemeDiff(oldConfig: ThemeConfig, newConfig: ThemeConfig): ThemeDiff
}
```

### GraphQL API

#### Queries

```graphql
# Get theme by ID
theme(id: ID!): UITheme

# List all themes
themes(filter: ThemeFilterInput): [UITheme!]!

# Get effective theme for current user
myEffectiveTheme(systemDarkMode: Boolean): EffectiveTheme!

# Get user preference
myThemePreference: UserThemePreference

# Validate theme config
validateThemeConfig(config: JSON!): ThemeValidationResult!
```

#### Mutations

```graphql
# Create theme (admin only)
createTheme(input: CreateThemeInput!): UITheme!

# Update theme (admin only)
updateTheme(id: ID!, input: UpdateThemeInput!): UITheme!

# Delete theme (admin only)
deleteTheme(id: ID!): Boolean!

# Update user preference
updateMyThemePreference(input: UpdateUserThemePreferenceInput!): UserThemePreference!

# Reset to defaults
resetMyThemePreference: UserThemePreference!
```

#### Subscriptions

```graphql
# Subscribe to theme updates
themeUpdated: EffectiveTheme!
```

## Frontend Integration

### Setup

```typescript
// App.tsx
import { ThemeProvider } from './theming/ThemeProvider';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <YourApp />
      </ThemeProvider>
    </ApolloProvider>
  );
}
```

### Using the Theme

```typescript
import { useAppTheme } from './theming/ThemeProvider';

function MyComponent() {
  const {
    theme,
    themeSource,
    themeName,
    darkMode,
    setDarkMode,
    customizeTheme,
    resetTheme
  } = useAppTheme();

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default }}>
      <Typography>Current theme: {themeName}</Typography>
      <Button onClick={() => setDarkMode('dark')}>
        Enable Dark Mode
      </Button>
    </Box>
  );
}
```

### Theme Settings Component

```typescript
import { ThemeSettings } from './components/settings/ThemeSettings';

function SettingsPage() {
  return <ThemeSettings />;
}
```

## Theme Configuration Format

Themes use Material-UI theme specification:

```json
{
  "palette": {
    "mode": "light",
    "primary": {
      "main": "#1976d2",
      "light": "#42a5f5",
      "dark": "#1565c0"
    },
    "secondary": {
      "main": "#9c27b0"
    },
    "background": {
      "default": "#fafafa",
      "paper": "#ffffff"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#666666"
    }
  },
  "typography": {
    "fontFamily": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
    "fontSize": 14,
    "h1": {
      "fontSize": "2.5rem",
      "fontWeight": 500
    }
  },
  "shape": {
    "borderRadius": 4
  },
  "spacing": 8
}
```

## Usage Examples

### Admin: Create a Custom Theme

```graphql
mutation CreateCustomTheme {
  createTheme(input: {
    name: "custom_dark"
    displayName: "Custom Dark Theme"
    description: "Dark theme with custom colors"
    role: "analyst"
    themeConfig: {
      palette: {
        mode: "dark"
        primary: { main: "#00bcd4" }
        secondary: { main: "#ff4081" }
        background: {
          default: "#121212"
          paper: "#1e1e1e"
        }
      }
    }
  }) {
    id
    name
    displayName
  }
}
```

### User: Update Preferences

```graphql
mutation UpdateMyPreferences {
  updateMyThemePreference(input: {
    darkModePreference: DARK
    autoSwitchByRole: false
    themeId: "uuid-of-preferred-theme"
  }) {
    id
    darkModePreference
  }
}
```

### Get Effective Theme

```graphql
query GetMyTheme {
  myEffectiveTheme(systemDarkMode: true) {
    theme
    source
    themeName
  }
}
```

## Performance Considerations

### Caching

- **Client-Side**: Apollo Client caches effective theme
- **Database**: Function `get_effective_theme()` uses efficient single query
- **Indexes**: Optimized for role and tenant lookups

### Hot Reload

Theme changes trigger GraphQL subscription:
```
Admin updates theme → PubSub event → All affected users notified → React re-renders with new theme
```

No page refresh required.

### Lazy Loading

Theme configurations are loaded on-demand, not preloaded.

## Security

### Authorization

- **Read themes**: All authenticated users
- **Create/Update/Delete themes**: Admin only (`@requireRole(role: ADMIN)`)
- **Update own preferences**: User owns their preferences

### Validation

```typescript
validateThemeConfig(config: ThemeConfig): ThemeValidationResult
```

Validates:
- Color format (hex, rgb, rgba)
- Contrast ratios (basic WCAG check)
- Value ranges (spacing, font sizes, border radius)
- JSON schema compliance

### Audit Trail

All theme modifications logged to `theme_audit_log`:
- Who changed what
- Old config vs new config
- Timestamp and IP address

## Testing

### Unit Tests

```typescript
describe('ThemeService', () => {
  it('should create theme with valid config', async () => {
    const theme = await themeService.createTheme({
      name: 'test_theme',
      displayName: 'Test Theme',
      themeConfig: validConfig
    }, 'admin-user');

    expect(theme).toBeDefined();
    expect(theme.name).toBe('test_theme');
  });

  it('should reject invalid theme config', async () => {
    await expect(
      themeService.createTheme({
        name: 'invalid',
        displayName: 'Invalid',
        themeConfig: invalidConfig
      }, 'admin-user')
    ).rejects.toThrow('Invalid theme configuration');
  });

  it('should resolve effective theme for user', async () => {
    const effective = await themeService.getEffectiveTheme({
      userId: 'user-123',
      tenantId: 'tenant-456',
      userRole: 'security_analyst'
    });

    expect(effective.source).toBe('role_based');
  });
});
```

### Integration Tests

```typescript
describe('Theme GraphQL API', () => {
  it('should get effective theme', async () => {
    const result = await executeQuery(GET_MY_EFFECTIVE_THEME, {}, context);
    expect(result.data.myEffectiveTheme).toBeDefined();
    expect(result.data.myEffectiveTheme.theme).toBeDefined();
  });

  it('should update user preferences', async () => {
    const result = await executeMutation(
      UPDATE_MY_THEME_PREFERENCE,
      { input: { darkModePreference: 'DARK' } },
      context
    );
    expect(result.data.updateMyThemePreference.darkModePreference).toBe('DARK');
  });
});
```

### E2E Tests

```typescript
test('user can change theme', async () => {
  await page.goto('/settings');
  await page.click('[data-testid="theme-settings"]');
  await page.click('[data-testid="dark-mode-toggle"]');

  // Verify theme changed
  const backgroundColor = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor;
  });
  expect(backgroundColor).toMatch(/rgb\(18, 18, 18\)/); // Dark background
});
```

## Migration Guide

### Existing Users

When deploying, run migration to create default preferences:

```sql
INSERT INTO user_theme_preferences (user_id, tenant_id, auto_switch_by_role, dark_mode_preference)
SELECT DISTINCT user_id, tenant_id, true, 'system'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_theme_preferences WHERE user_theme_preferences.user_id = users.user_id
);
```

### Database Migration

```bash
psql -d intelgraph -f server/db/migrations/postgres/2025-11-25_role_based_theming.sql
```

## Deployment Checklist

- [ ] Run database migration
- [ ] Verify seed data loaded (5 default themes)
- [ ] Configure GraphQL schema includes theming types
- [ ] Update frontend to wrap app with ThemeProvider
- [ ] Test theme switching in development
- [ ] Verify GraphQL subscriptions working
- [ ] Load test theme resolution performance
- [ ] Security audit for admin-only operations
- [ ] Documentation published
- [ ] Announce feature to users

## Known Limitations

1. **Theme Preview**: No live preview in admin UI (future enhancement)
2. **Theme Inheritance**: No theme inheritance/composition yet
3. **A/B Testing**: No built-in A/B testing for themes
4. **Analytics**: No usage analytics for theme preferences

## Future Enhancements

- [ ] Theme editor UI for admins with visual color picker
- [ ] Theme preview mode (test theme without saving)
- [ ] Theme marketplace (share themes across tenants)
- [ ] Theme analytics dashboard (popular themes, usage metrics)
- [ ] CSS variable export for non-MUI components
- [ ] Theme versioning with rollback capability
- [ ] Scheduled theme changes (e.g., holiday themes)
- [ ] Accessibility scoring for themes (WCAG compliance)

## Troubleshooting

### Theme Not Updating

1. Check GraphQL subscription is active
2. Verify user has valid preference record
3. Clear Apollo Client cache
4. Check browser console for errors

### Colors Not Displaying Correctly

1. Validate color format in theme config
2. Check browser CSS compatibility
3. Verify MUI version compatibility

### Performance Issues

1. Check database indexes on `ui_themes`
2. Monitor `get_effective_theme()` function performance
3. Enable Apollo Client caching
4. Consider Redis caching for high-traffic tenants

## Support

- **Documentation**: `/docs/features/role-based-theming.md`
- **API Docs**: GraphQL Playground at `/graphql`
- **Database Schema**: `server/db/migrations/postgres/2025-11-25_role_based_theming.sql`
- **Code**: `server/src/services/theming/`, `web/src/theming/`

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Production Ready ✅
