"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markStepComplete = void 0;
const markStepComplete = (stepId) => {
    const progress = JSON.parse(localStorage.getItem('activation_progress') || '{}');
    if (!progress[stepId]) {
        progress[stepId] = true;
        localStorage.setItem('activation_progress', JSON.stringify(progress));
        window.dispatchEvent(new Event('activation_updated'));
    }
};
exports.markStepComplete = markStepComplete;
