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
exports.FeedbackWidget = void 0;
// conductor-ui/frontend/src/components/feedback/FeedbackWidget.tsx
const react_1 = __importStar(require("react"));
// Mock API
const submitFeedback = async (feedback) => {
    console.log('Submitting feedback:', feedback);
    await new Promise((res) => setTimeout(res, 500));
    return { id: `fb-${Math.random()}` };
};
const FeedbackWidget = () => {
    const [feedback, setFeedback] = (0, react_1.useState)('');
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [isSubmitted, setIsSubmitted] = (0, react_1.useState)(false);
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
    return (<div className="feedback-widget">
      {isSubmitted ? (<p>Thank you for your feedback!</p>) : (<form onSubmit={handleSubmit}>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Have feedback? Let us know!" required/>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>)}
    </div>);
};
exports.FeedbackWidget = FeedbackWidget;
