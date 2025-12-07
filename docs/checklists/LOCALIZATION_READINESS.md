# Localization Readiness Checklist

Use this checklist to verify if a feature or component is ready for global deployment.

## 1. Text & Content

- [ ] **No Hardcoded Strings**: All user-facing text uses `t('namespace:key')`.
- [ ] **Concatenation Free**: No string concatenation for sentences (e.g., `t('hello') + ' ' + name`). Used interpolation `{name}` instead.
- [ ] **Pluralization**: Used `count` parameter and plural keys (one/other/etc.) for variable quantities.
- [ ] **Context**: Added `context` to keys where the English word is ambiguous (e.g., "Right" -> Direction vs Correct).
- [ ] **Punctuation**: Punctuation is inside the translation string, not appended in code.

## 2. Formatting

- [ ] **Dates & Times**: Used `formatDate()` or `Intl.DateTimeFormat`, not `.toString()` or custom formatting.
- [ ] **Numbers**: Used `formatNumber()` for decimals and separators.
- [ ] **Currencies**: Used `formatCurrency()` handling symbol placement and decimals correctly.
- [ ] **Lists**: Used `Intl.ListFormat` for comma-separated lists (e.g., "A, B, and C").

## 3. Layout & Styling

- [ ] **Flexible Widths**: Containers can expand if text is 50% longer (e.g., German). No fixed `width` on text containers.
- [ ] **No Word Breaking**: Avoided forced word breaks that might be invalid in other languages.
- [ ] **Logical Properties**: Used `margin-inline-start/end` instead of `left/right` for spacing.
- [ ] **Text Alignment**: Text alignment mirrors in RTL (or is explicitly set if numbers/code).

## 4. Images & Icons

- [ ] **Culturally Neutral**: Icons and images are appropriate for all target regions.
- [ ] **No Embedded Text**: Text in images is avoided; if necessary, it is overlaid with HTML text.
- [ ] **Directional Icons**: Arrows and navigational icons flip in RTL (handled by CSS or separate assets).

## 5. Regional Behavior

- [ ] **Input Fields**: Name fields support unicode and varying orders (Last Name first).
- [ ] **Addresses**: Address forms adapt fields based on selected country.
- [ ] **Validation**: Phone/Postal code validation is region-aware (e.g., using `libphonenumber`).

## 6. Testing

- [ ] **Pseudo-localization**: Tested with pseudo-loc check (e.g., `en-XA`) to spot hardcoded strings.
- [ ] **RTL Test**: Switched to Arabic/Hebrew to verify layout mirroring.
- [ ] **Truncation**: Verified that long strings do not break the UI layout.
