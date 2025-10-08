import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/components/feedback/FeedbackWidget.tsx
import { useState } from 'react';
// Mock API
const submitFeedback = async (feedback) => {
    console.log('Submitting feedback:', feedback);
    await new Promise(res => setTimeout(res, 500));
    return { id: `fb-${Math.random()}` };
};
export const FeedbackWidget = () => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback)
            return;
        setIsSubmitting(true);
        await submitFeedback(feedback);
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFeedback('');
    };
    return (_jsx("div", { className: "feedback-widget", children: isSubmitted ? (_jsx("p", { children: "Thank you for your feedback!" })) : (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx("textarea", { value: feedback, onChange: e => setFeedback(e.target.value), placeholder: "Have feedback? Let us know!", required: true }), _jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Sending...' : 'Send' })] })) }));
};
