# Mobile CI/CD Infrastructure

Automated build, test, and deployment pipelines for IntelGraph mobile applications.

## Overview

Our CI/CD pipeline uses GitHub Actions to automate:
- **Linting & Testing**: Code quality checks on every PR
- **Building**: Platform-specific builds for iOS, Android, PWA, Electron
- **Testing**: Internal testing tracks for validation
- **Deployment**: Automated releases to app stores

## Workflows

### iOS Pipeline (`github-actions-ios.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main`
- Release published

**Jobs:**
1. **lint-and-test**: Lints, type-checks, and runs tests
2. **build**: Builds IPA for iOS
3. **deploy-testflight**: Uploads to TestFlight (main branch)
4. **deploy-app-store**: Submits to App Store (releases)

**Required Secrets:**
- `CERTIFICATES_P12`: iOS signing certificate (base64)
- `CERTIFICATES_PASSWORD`: Certificate password
- `PROVISIONING_PROFILE`: Provisioning profile (base64)
- `APPLE_ID`: Apple ID email
- `APPLE_ID_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Team ID
- `SENTRY_AUTH_TOKEN`: Sentry authentication token

### Android Pipeline (`github-actions-android.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main`
- Release published

**Jobs:**
1. **lint-and-test**: Lints, type-checks, and runs tests
2. **build**: Builds AAB and APK
3. **deploy-internal**: Uploads to Internal Testing (main branch)
4. **deploy-production**: Uploads to Production (releases)

**Required Secrets:**
- `ANDROID_KEYSTORE_BASE64`: Keystore file (base64)
- `ANDROID_KEY_ALIAS`: Keystore alias
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password
- `ANDROID_KEY_PASSWORD`: Key password
- `PLAY_STORE_CREDENTIALS`: Google Play service account JSON (base64)
- `SENTRY_AUTH_TOKEN`: Sentry authentication token

### PWA Pipeline (`github-actions-pwa.yml`)

**Triggers:**
- Push to `main`
- Pull requests to `main`

**Jobs:**
1. **lint-and-test**: Lints, type-checks, and runs tests
2. **build**: Builds PWA
3. **deploy**: Deploys to Vercel/Netlify

**Required Secrets:**
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_PROJECT_ID`: Project ID
- `VERCEL_ORG_ID`: Organization ID

### Electron Pipeline (`github-actions-electron.yml`)

**Triggers:**
- Push to `main`
- Release published

**Jobs:**
1. **build-windows**: Builds for Windows
2. **build-mac**: Builds for macOS
3. **build-linux**: Builds for Linux
4. **release**: Creates GitHub release with artifacts

**Required Secrets:**
- `CSC_LINK`: Code signing certificate
- `CSC_KEY_PASSWORD`: Certificate password
- `APPLE_ID`: Apple ID (for notarization)
- `APPLE_ID_PASSWORD`: App-specific password
- `GH_TOKEN`: GitHub token for releases

## Setup Instructions

### 1. iOS Certificates

**Export Certificate:**
```bash
# Open Keychain Access
# Find "iPhone Distribution" certificate
# Right-click > Export
# Save as .p12 file

# Convert to base64
base64 -i certificate.p12 -o certificate.txt

# Copy contents to GitHub secret CERTIFICATES_P12
```

**Export Provisioning Profile:**
```bash
# Download from developer.apple.com
# Certificates, IDs & Profiles > Profiles

# Convert to base64
base64 -i profile.mobileprovision -o profile.txt

# Copy contents to GitHub secret PROVISIONING_PROFILE
```

**Create App-Specific Password:**
1. Go to appleid.apple.com
2. Sign in
3. Security > App-Specific Passwords
4. Generate new password
5. Copy to GitHub secret `APPLE_ID_PASSWORD`

### 2. Android Keystore

**Create Keystore:**
```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore release.keystore \
  -alias release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Convert to base64
base64 -i release.keystore -o keystore.txt

# Copy contents to GitHub secret ANDROID_KEYSTORE_BASE64
```

**Google Play Service Account:**
1. Go to Google Play Console
2. Setup > API access
3. Create new service account
4. Grant permissions
5. Download JSON key

```bash
# Convert to base64
base64 -i service-account.json -o service-account.txt

# Copy contents to GitHub secret PLAY_STORE_CREDENTIALS
```

### 3. Sentry Integration

**Get Auth Token:**
1. Go to sentry.io
2. Settings > Account > API > Auth Tokens
3. Create new token with `project:releases` scope
4. Copy to GitHub secret `SENTRY_AUTH_TOKEN`

### 4. Vercel Deployment

**Get Tokens:**
```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Get tokens from .vercel/project.json
```

Copy to GitHub secrets:
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

Get token from Vercel dashboard:
- Settings > Tokens > Create Token
- Copy to `VERCEL_TOKEN`

## Deployment Flow

### Development

```
PR → Lint & Test → Build → Review → Merge
```

### Staging (main branch)

```
main → Lint & Test → Build → Internal Testing
```

### Production (releases)

```
Release → Lint & Test → Build → Production Deploy
```

## Testing Tracks

### iOS

1. **Internal Testing (TestFlight)**: Automatic from main
2. **External Testing (TestFlight)**: Manual promotion
3. **App Store**: Release tag

### Android

1. **Internal Testing**: Automatic from main
2. **Closed Testing**: Manual promotion
3. **Open Testing**: Manual promotion
4. **Production**: Release tag with staged rollout (10% → 100%)

## Monitoring

### Build Status

Check GitHub Actions tab for build status:
- ✅ Green: Build successful
- ❌ Red: Build failed
- 🟡 Yellow: Build in progress

### Release Notes

Auto-generated from commits:
- `feat:` → New features
- `fix:` → Bug fixes
- `docs:` → Documentation
- `perf:` → Performance improvements

### Sentry Integration

Releases are automatically tracked in Sentry:
- Source maps uploaded
- Commits associated
- Release finalized

## Troubleshooting

### iOS Build Fails

**Certificate Issues:**
```bash
# Check certificate validity
security find-identity -v -p codesigning

# Verify provisioning profile
security cms -D -i profile.mobileprovision
```

**Solution:**
- Regenerate certificate
- Update provisioning profile
- Update GitHub secrets

### Android Build Fails

**Keystore Issues:**
```bash
# Verify keystore
keytool -list -v -keystore release.keystore
```

**Solution:**
- Verify keystore password
- Check key alias
- Update GitHub secrets

### Deployment Fails

**Check logs:**
- GitHub Actions > Failed job > Logs
- Identify error message
- Fix and retry

**Common issues:**
- Expired credentials
- Invalid secrets
- Network timeouts
- Version conflicts

## Best Practices

1. **Test locally** before pushing
2. **Use semantic versioning**: v1.2.3
3. **Write clear commit messages**: Conventional Commits
4. **Monitor build status**: Enable notifications
5. **Review logs**: Check for warnings
6. **Update dependencies**: Keep up-to-date
7. **Rotate secrets**: Periodically update credentials
8. **Document changes**: Update CHANGELOG.md

## Support

For CI/CD issues:
- Slack: #mobile-ci-cd
- Email: devops@intelgraph.com
- GitHub Issues: Tag with `ci/cd`
