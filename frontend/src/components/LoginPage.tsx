import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation('common');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section aria-labelledby="login-title" className="card login-card">
      <h2 id="login-title">{t('login.title')}</h2>
      <p className="card-subtitle">{t('login.subtitle')}</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="login-email">
          {t('login.emailLabel')}
        </label>
        <input
          autoComplete="email"
          className="form-input"
          id="login-email"
          placeholder={t('login.emailPlaceholder')}
          type="email"
        />
        <label className="form-label" htmlFor="login-password">
          {t('login.passwordLabel')}
        </label>
        <input
          autoComplete="current-password"
          className="form-input"
          id="login-password"
          placeholder={t('login.passwordPlaceholder')}
          type="password"
        />
        <div className="form-options">
          <label className="checkbox">
            <input type="checkbox" />
            <span>{t('login.rememberMe')}</span>
          </label>
          <a className="link" href="#">
            {t('login.forgotPassword')}
          </a>
        </div>
        <button className="primary-button" type="submit">
          {t('login.signIn')}
        </button>
      </form>
    </section>
  );
};

export default LoginPage;
