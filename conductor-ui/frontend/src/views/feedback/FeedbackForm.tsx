// conductor-ui/frontend/src/views/feedback/FeedbackForm.tsx
import React, { useState } from 'react';

// Mock API
const submitFeedback = async (feedback: {
  message: string;
  category: string;
}): Promise<{ id: string }> => {
  console.log('Submitting feedback:', feedback);
  await new Promise((res) => setTimeout(res, 800));
  return { id: `fb-${Math.random()}` };
};

export const FeedbackForm = () => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('bug');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({ message, category });
      setIsSubmitted(true);
      setMessage('');
    } catch (error) {
      console.error('Failed to submit feedback', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Submit Feedback</h1>
      {isSubmitted ? (
        <p>Thank you for your feedback! We appreciate your input.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="feedback-message">Message:</label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            ></textarea>
          </div>
          <div>
            <label htmlFor="feedback-category">Category:</label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="general">General Feedback</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}
    </div>
  );
};
