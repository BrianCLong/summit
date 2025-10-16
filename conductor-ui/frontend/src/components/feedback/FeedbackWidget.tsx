// conductor-ui/frontend/src/components/feedback/FeedbackWidget.tsx
import React, { useState } from 'react';

// Mock API
const submitFeedback = async (feedback: string): Promise<{ id: string }> => {
  console.log('Submitting feedback:', feedback);
  await new Promise((res) => setTimeout(res, 500));
  return { id: `fb-${Math.random()}` };
};

export const FeedbackWidget = () => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback) return;
    setIsSubmitting(true);
    await submitFeedback(feedback);
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFeedback('');
  };

  return (
    <div className="feedback-widget">
      {isSubmitted ? (
        <p>Thank you for your feedback!</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Have feedback? Let us know!"
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
};
