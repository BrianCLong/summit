import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/feedback/FeedbackForm.tsx
import { useState } from 'react';
// Mock API
const submitFeedback = async (feedback) => {
    console.log('Submitting feedback:', feedback);
    await new Promise(res => setTimeout(res, 800));
    return { id: `fb-${Math.random()}` };
};
export const FeedbackForm = () => {
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('bug');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message)
            return;
        setIsSubmitting(true);
        try {
            await submitFeedback({ message, category });
            setIsSubmitted(true);
            setMessage('');
        }
        catch (error) {
            console.error('Failed to submit feedback', error);
            alert('Error submitting feedback. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Submit Feedback" }), isSubmitted ? (_jsx("p", { children: "Thank you for your feedback! We appreciate your input." })) : (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "feedback-message", children: "Message:" }), _jsx("textarea", { id: "feedback-message", value: message, onChange: e => setMessage(e.target.value), rows: 5, required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "feedback-category", children: "Category:" }), _jsxs("select", { id: "feedback-category", value: category, onChange: e => setCategory(e.target.value), children: [_jsx("option", { value: "bug", children: "Bug Report" }), _jsx("option", { value: "feature", children: "Feature Request" }), _jsx("option", { value: "general", children: "General Feedback" })] })] }), _jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Submitting...' : 'Submit Feedback' })] }))] }));
};
