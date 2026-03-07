import React from 'react';
import { useParams } from 'react-router-dom';
import { AnswerCard } from '@/components/AnswerCard';

export default function DebugAnswerPage() {
  const params = useParams();
  const answerId = params.answerId ?? 'answer-demo-1';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-lg font-semibold">Evidence Trail Peek (Debug)</h1>
        <AnswerCard
          answerId={answerId}
          title={`Synthesized Answer ${answerId}`}
          summary="Summary from the assistant for verification. Use the evidence overlay to validate claims."
        />
      </div>
    </div>
  );
}
