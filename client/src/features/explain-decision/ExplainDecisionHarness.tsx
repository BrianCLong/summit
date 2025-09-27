import { MockedProvider } from '@apollo/client/testing';
import type { ReactNode } from 'react';
import { ExplainDecision, type ExplainDecisionProps } from './ExplainDecision';
import { createExplainDecisionMocks } from './ExplainDecision.mocks';

export type ExplainDecisionHarnessProps = {
  paragraphId?: string;
  children?: ReactNode;
} & Pick<ExplainDecisionProps, 'initialLayers'>;

export const ExplainDecisionHarness = ({
  paragraphId,
  initialLayers,
  children,
}: ExplainDecisionHarnessProps) => {
  const mocks = createExplainDecisionMocks({ paragraphId });

  return (
    <MockedProvider mocks={mocks}>
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl">
          <ExplainDecision paragraphId={paragraphId ?? mocks[0].request.variables?.paragraphId ?? ''} initialLayers={initialLayers} />
        </div>
        {children}
      </div>
    </MockedProvider>
  );
};

export default ExplainDecisionHarness;
