# Mobile Deployment Guide

Complete guide for deploying IntelGraph mobile and cross-platform applications.

## Table of Contents

1. [Overview](#overview)
2. [React Native iOS](#react-native-ios)
3. [React Native Android](#react-native-android)
4. [Progressive Web App](#progressive-web-app)
5. [Electron Desktop](#electron-desktop)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [App Store Optimization](#app-store-optimization)
8. [Monitoring & Analytics](#monitoring--analytics)

## Overview

IntelGraph uses different deployment strategies for each platform:

- **iOS**: TestFlight → App Store
- **Android**: Internal Testing → Production
- **PWA**: Vercel/Netlify continuous deployment
- **Electron**: GitHub Releases with auto-update

## React Native iOS

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Xcode** 14.0 or later
3. **CocoaPods** 1.11.0 or later
4. **App Store Connect** access

### Certificates & Provisioning

1. **Development Certificate**:
   ```bash
   # Open Xcode
   # Xcode > Preferences > Accounts
   # Add Apple ID > Manage Certificates > + > Apple Development
   ```

2. **Distribution Certificate**:
   ```bash
   # Xcode > Preferences > Accounts > Manage Certificates
   # + > Apple Distribution
   ```

3. **App ID**:
   - Go to developer.apple.com
   - Certificates, IDs & Profiles > Identifiers
   - Create App ID: com.intelgraph.mobile

4. **Provisioning Profiles**:
   - Create Development profile
   - Create Distribution profile
   - Download and install

### Build Configuration

1. **Update Version**:
   ```bash
   cd ios
   # Edit Info.plist
   # CFBundleShortVersionString: 1.0.0
   # CFBundleVersion: 1
   ```

2. **Configure Signing**:
   - Open project in Xcode
   - Select target > Signing & Capabilities
   - Enable "Automatically manage signing"
   - Select team

### Build for TestFlight

```bash
# Clean build
cd ios
rm -rf build/
pod install

# Archive
xcodebuild -workspace IntelGraph.xcworkspace \
  -scheme IntelGraph \
  -configuration Release \
  -archivePath build/IntelGraph.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/IntelGraph.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ExportOptions.plist
```

### Upload to App Store Connect

**Option 1: Xcode**
- Xcode > Window > Organizer
- Select archive > Distribute App
- Follow wizard

**Option 2: Command Line**
```bash
xcrun altool --upload-app \
  -f build/IntelGraph.ipa \
  -t ios \
  -u your.email@example.com \
  -p app-specific-password
```

**Option 3: Fastlane**
```bash
fastlane ios beta
```

### TestFlight Distribution

1. Go to App Store Connect
2. My Apps > IntelGraph > TestFlight
3. Select build
4. Add test information
5. Submit for review
6. Add testers

### App Store Submission

1. **Prepare Metadata**:
   - App name
   - Subtitle
   - Description
   - Keywords
   - Screenshots (all sizes)
   - App icon
   - Privacy policy URL
   - Support URL

2. **Submit for Review**:
   - App Store Connect > My Apps > IntelGraph
   - + Version > 1.0.0
   - Fill in all required information
   - Select build
   - Submit for review

3. **Review Process**:
   - Typically 1-3 days
   - May require additional information
   - Address any issues promptly

### Post-Release

1. **Monitor Crash Reports**:
   - Xcode > Window > Organizer > Crashes
   - App Store Connect > Analytics

2. **Respond to Reviews**:
   - App Store Connect > Ratings and Reviews

3. **Release Updates**:
   - Increment version number
   - Build and upload new version
   - Submit for review

## React Native Android

### Prerequisites

1. **Google Play Developer Account** ($25 one-time)
2. **Android Studio** Arctic Fox or later
3. **JDK** 11 or later
4. **Keystore** for signing

### Generate Keystore

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore intelgraph-release.keystore \
  -alias intelgraph \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Configure Signing

1. **Store Keystore Securely**:
   ```bash
   mkdir -p ~/.android/
   mv intelgraph-release.keystore ~/.android/
   ```

2. **Create gradle.properties**:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=~/.android/intelgraph-release.keystore
   MYAPP_UPLOAD_KEY_ALIAS=intelgraph
   MYAPP_UPLOAD_STORE_PASSWORD=****
   MYAPP_UPLOAD_KEY_PASSWORD=****
   ```

3. **Update android/app/build.gradle**:
   ```gradle
   android {
     signingConfigs {
       release {
         if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
           storeFile file(MYAPP_UPLOAD_STORE_FILE)
           storePassword MYAPP_UPLOAD_STORE_PASSWORD
           keyAlias MYAPP_UPLOAD_KEY_ALIAS
           keyPassword MYAPP_UPLOAD_KEY_PASSWORD
         }
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
       }
     }
   }
   ```

### Build AAB (Android App Bundle)

```bash
cd android
./gradlew clean
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Upload to Google Play Console

1. **Create App**:
   - Go to play.google.com/console
   - Create app
   - Fill in app details

2. **Upload AAB**:
   - Release > Production > Create new release
   - Upload app-release.aab
   - Add release notes

3. **Complete Store Listing**:
   - App name
   - Short description
   - Full description
   - Screenshots (phone, tablet, TV)
   - App icon
   - Feature graphic
   - Privacy policy

4. **Content Rating**:
   - Complete questionnaire
   - Get rating

5. **App Content**:
   - Privacy policy
   - Target audience
   - App category

6. **Pricing & Distribution**:
   - Select countries
   - Set pricing (free/paid)

### Internal Testing

1. **Create Internal Test Track**:
   - Release > Internal testing
   - Create release
   - Upload AAB

2. **Add Testers**:
   - Add email addresses or lists
   - Share opt-in URL

### Beta Testing (Open/Closed)

1. **Closed Testing**:
   - Release > Closed testing
   - Create release
   - Add testers

2. **Open Testing**:
   - Release > Open testing
   - Create release
   - Available to anyone with link

### Production Release

1. **Submit for Review**:
   - Release > Production
   - Create release from testing track
   - Review and roll out

2. **Staged Rollout**:
   - Start with 5-10%
   - Monitor for issues
   - Increase gradually to 100%

### Post-Release

1. **Monitor Vitals**:
   - Play Console > Quality > Android vitals
   - Check crash rate, ANR rate

2. **Respond to Reviews**:
   - Play Console > Reviews

3. **Release Updates**:
   - Increment version code and name
   - Build and upload new AAB

## Progressive Web App

### Build

```bash
cd apps/mobile-interface
pnpm build

# Output: .next/ (Next.js build)
# Service Worker: public/sw.js
```

### Deployment Options

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or connect GitHub repo for automatic deploys
```

#### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=.next
```

#### Option 3: Self-Hosted

```bash
# Build
pnpm build

# Start production server
pnpm start

# Or use process manager
pm2 start npm --name "intelgraph-pwa" -- start
```

### PWA Configuration

1. **manifest.json**:
   ```json
   {
     "name": "IntelGraph Mobile",
     "short_name": "IntelGraph",
     "start_url": "/",
     "display": "standalone",
     "theme_color": "#2563eb",
     "background_color": "#ffffff",
     "icons": [...]
   }
   ```

2. **Service Worker**:
   - Automatically generated by next-pwa
   - Custom strategies in sw-custom.js

3. **App Icons**:
   - Generate all sizes: 72x72 to 512x512
   - Include maskable icons for Android

### SSL Certificate

**Required for PWA features!**

```bash
# Let's Encrypt (free)
certbot --nginx -d app.intelgraph.com

# Or use hosting provider's SSL (Vercel, Netlify)
```

### Testing PWA

1. **Lighthouse**:
   ```bash
   lighthouse https://app.intelgraph.com \
     --view \
     --preset=desktop
   ```

2. **PWA Checklist**:
   - ✅ HTTPS
   - ✅ Service Worker
   - ✅ manifest.json
   - ✅ Installable
   - ✅ Offline support
   - ✅ Score 90+ in Lighthouse

### PWA Updates

1. **Update Service Worker**:
   - Modify sw-custom.js
   - Rebuild app
   - Deploy

2. **Notify Users**:
   - Show update banner
   - Prompt to reload
   - Skip waiting and activate

## Electron Desktop

### Build Configuration

1. **Update Version**:
   ```json
   // package.json
   {
     "version": "1.0.0"
   }
   ```

2. **Configure electron-builder**:
   ```json
   {
     "build": {
       "appId": "com.intelgraph.desktop",
       "productName": "IntelGraph",
       "directories": {
         "output": "release/${version}"
       }
     }
   }
   ```

### Build for Platforms

```bash
cd apps/desktop-electron

# Windows
pnpm build:win

# macOS
pnpm build:mac

# Linux
pnpm build:linux

# All platforms
pnpm build
```

### Code Signing

#### macOS

1. **Get Developer ID Certificate**:
   - Apple Developer > Certificates
   - Create Developer ID Application certificate

2. **Sign App**:
   ```bash
   export CSC_LINK=/path/to/certificate.p12
   export CSC_KEY_PASSWORD=certificate_password
   pnpm build:mac
   ```

3. **Notarize**:
   ```bash
   export APPLE_ID=your@email.com
   export APPLE_ID_PASSWORD=app-specific-password
   export APPLE_TEAM_ID=team_id
   pnpm build:mac
   ```

#### Windows

```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=certificate_password
pnpm build:win
```

### Distribution

#### GitHub Releases

```bash
# Build and publish
pnpm electron:build --publish always

# Manually upload
# Go to github.com/intelgraph/summit/releases
# Create release
# Upload artifacts
```

#### Direct Download

Host installers on your server:
- Windows: IntelGraph-Setup-1.0.0.exe
- macOS: IntelGraph-1.0.0.dmg
- Linux: IntelGraph-1.0.0.AppImage

### Auto-Updates

1. **Configure Update Server**:
   ```json
   {
     "publish": {
       "provider": "github",
       "owner": "intelgraph",
       "repo": "summit"
     }
   }
   ```

2. **Test Updates**:
   - Install version 1.0.0
   - Release version 1.0.1
   - App should detect and prompt for update

## CI/CD Pipeline

### GitHub Actions

See `.github/workflows/mobile-*.yml` for CI/CD configs.

### Environment Variables

Required secrets:
- `APPLE_ID`
- `APPLE_ID_PASSWORD`
- `APPLE_TEAM_ID`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `SENTRY_DSN`
- `FIREBASE_CONFIG`

### Automated Builds

- **PR**: Builds and tests
- **main**: Builds and uploads to internal testing
- **tags**: Builds and publishes to production

## App Store Optimization

### Keywords

- intelligence
- analysis
- investigation
- security
- data
- visualization
- graph
- network

### Screenshots

Required sizes:
- iPhone: 6.7", 6.5", 5.5"
- iPad: 12.9", 11"
- Android: Phone, 7", 10"

### Descriptions

**Short (80 chars)**:
"Advanced intelligence analysis platform for investigators"

**Full**:
Feature-rich description highlighting:
- Core functionality
- Key features
- Use cases
- Benefits

## Monitoring & Analytics

### Crash Reporting

- **Sentry**: Real-time error tracking
- **Firebase Crashlytics**: Native crash reports

### Analytics

- **Firebase Analytics**: User behavior
- **Google Analytics**: Web/PWA analytics
- **Mixpanel**: Advanced product analytics

### Performance Monitoring

- **Firebase Performance**: App performance
- **Lighthouse CI**: PWA performance
- **New Relic**: Backend performance

## Troubleshooting

### iOS Build Fails

```bash
# Clean Xcode build
cd ios
rm -rf build/ Pods/ ~/Library/Developer/Xcode/DerivedData/
pod deintegrate && pod install
```

### Android Build Fails

```bash
# Clean Gradle
cd android
./gradlew clean
rm -rf .gradle/
./gradlew bundleRelease
```

### PWA Not Installing

- Check HTTPS
- Verify manifest.json
- Check service worker registration
- Clear browser cache

### Electron Auto-Update Not Working

- Verify code signing
- Check GitHub releases
- Test with --verbose flag

## Support

For deployment issues:
- Slack: #mobile-deployment
- Email: devops@intelgraph.com
- GitHub: https://github.com/intelgraph/summit/issues
