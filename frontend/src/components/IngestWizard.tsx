import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STEPS: Array<'source' | 'mapping' | 'validation' | 'review'> = [
  'source',
  'mapping',
  'validation',
  'review',
];

const IngestWizard = () => {
  const { t } = useTranslation('common');
  const [activeStep, setActiveStep] = useState(0);

  const stepName = useMemo(() => STEPS[activeStep], [activeStep]);

  const goToPrevious = () => {
    setActiveStep((step) => Math.max(0, step - 1));
  };

  const goToNext = () => {
    setActiveStep((step) => Math.min(STEPS.length - 1, step + 1));
  };

  return (
    <section aria-labelledby="ingest-title" className="card ingest-wizard">
      <header className="card-header">
        <h2 id="ingest-title">{t('ingest.title')}</h2>
        <p className="card-subtitle">{t('ingest.subtitle')}</p>
      </header>
      <ol className="wizard-steps">
        {STEPS.map((step, index) => (
          <li className={index === activeStep ? 'active' : ''} key={step}>
            <span className="step-index">{index + 1}</span>
            <div className="step-content">
              <h3>{t(`ingest.steps.${step}.title`)}</h3>
              <p>{t(`ingest.steps.${step}.description`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div aria-live="polite" className="wizard-footer">
        <p className="wizard-progress">
          {t('ingest.progress', {
            step: activeStep + 1,
            total: STEPS.length,
            stepName: t(`ingest.steps.${stepName}.title`),
          })}
        </p>
        <div className="wizard-actions">
          <button className="secondary-button" disabled={activeStep === 0} onClick={goToPrevious} type="button">
            {t('ingest.actions.back')}
          </button>
          {activeStep < STEPS.length - 1 ? (
            <button className="primary-button" onClick={goToNext} type="button">
              {t('ingest.actions.next')}
            </button>
          ) : (
            <button className="primary-button" type="button">
              {t('ingest.actions.finish')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default IngestWizard;
