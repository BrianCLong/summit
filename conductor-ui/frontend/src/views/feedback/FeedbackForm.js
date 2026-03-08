"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackForm = void 0;
// conductor-ui/frontend/src/views/feedback/FeedbackForm.tsx
const react_1 = __importStar(require("react"));
// Mock API
const submitFeedback = async (feedback) => {
    console.log('Submitting feedback:', feedback);
    await new Promise((res) => setTimeout(res, 800));
    return { id: `fb-${Math.random()}` };
};
const FeedbackForm = () => {
    const [message, setMessage] = (0, react_1.useState)('');
    const [category, setCategory] = (0, react_1.useState)('bug');
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [isSubmitted, setIsSubmitted] = (0, react_1.useState)(false);
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
    return (<div>
      <h1>Submit Feedback</h1>
      {isSubmitted ? (<p>Thank you for your feedback! We appreciate your input.</p>) : (<form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="feedback-message">Message:</label>
            <textarea id="feedback-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required></textarea>
          </div>
          <div>
            <label htmlFor="feedback-category">Category:</label>
            <select id="feedback-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="general">General Feedback</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>)}
    </div>);
};
exports.FeedbackForm = FeedbackForm;
