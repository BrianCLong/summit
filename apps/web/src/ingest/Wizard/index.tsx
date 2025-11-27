import React, { useState } from 'react';
import { SourceStep } from './SourceStep';
import { MapStep } from './MapStep';
import { PoliciesStep } from './PoliciesStep';
import { PreviewStep } from './PreviewStep';
import { LoadStep } from './LoadStep';

type Step = 'source' | 'map' | 'policies' | 'preview' | 'load';

const IngestWizard = () => {
  const [step, setStep] = useState<Step>('source');
  const [file, setFile] = useState<File | null>(null);

  const renderStep = () => {
    switch (step) {
      case 'source':
        return <SourceStep onFileSelect={(file) => {
          setFile(file);
          setStep('map');
        }} />;
      case 'map':
        return <MapStep file={file} onNext={() => setStep('policies')} />;
      case 'policies':
        return <PoliciesStep onNext={() => setStep('preview')} />;
      case 'preview':
        return <PreviewStep file={file} onNext={() => setStep('load')} />;
      case 'load':
        return <LoadStep file={file} />;
      default:
        return <SourceStep onFileSelect={() => {}} />;
    }
  };

  return (
    <div>
      <h1>Ingest Wizard</h1>
      {renderStep()}
    </div>
  );
};

export default IngestWizard;
