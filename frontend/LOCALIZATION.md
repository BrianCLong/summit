# Localization Guide

This frontend uses [`i18next`](https://www.i18next.com/) with `react-i18next` and browser language detection. Translations live in `src/locales/<language>/common.json` and are loaded eagerly at startup.

## Adding a New Language

1. **Create a translation file**
   - Duplicate `src/locales/en/common.json` into a new folder such as `src/locales/fr/common.json`.
   - Translate each string while keeping the JSON keys intact.

2. **Register the language**
   - Open `src/i18n.ts` and add your language code to the `resources` map and the `supportedLngs` array.
   - If the language reads right-to-left, also append the language code to the `RTL_LANGUAGES` set.

3. **Expose it in the UI**
   - Update `src/components/LanguageSwitcher.tsx` with an entry for the new language so users can select it. Reference the localized label via `language.<name>` in the translation file.

4. **Verify content**
   - Run `npm run dev` from the `frontend` directory and confirm that the interface renders your translations.
   - Execute the automated tests to ensure coverage: `npm test` for unit tests and `npm run test:e2e` for Playwright end-to-end checks.

## Translation Tips

- Interpolated placeholders such as `{{step}}` must remain intact in translated strings so runtime values appear correctly.
- Keep punctuation and capitalization stylistically consistent with the target locale.
- When updating UI text, ensure the corresponding keys are updated across every translation file to avoid fallback to English.

## RTL Considerations

The app automatically updates the document direction when a supported RTL language (codes listed in `RTL_LANGUAGES`) is selected. Review new layouts under RTL to confirm the content remains legible and aligned.
