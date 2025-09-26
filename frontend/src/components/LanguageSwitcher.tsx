import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', key: 'english' },
  { code: 'es', key: 'spanish' },
  { code: 'ar', key: 'arabic' },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation('common');
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value;
    if (language !== currentLanguage) {
      void i18n.changeLanguage(language);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('i18nextLng', language);
      }
    }
  };

  return (
    <label className="language-switcher">
      <span className="language-switcher__label">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        className="language-switcher__select"
        data-testid="language-select"
        onChange={handleChange}
        value={currentLanguage}
      >
        {LANGUAGES.map(({ code, key }) => (
          <option key={code} value={code}>
            {t(`language.${key}`)}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
