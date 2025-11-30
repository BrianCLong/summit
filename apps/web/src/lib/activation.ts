export const markStepComplete = (stepId: string) => {
  const progress = JSON.parse(localStorage.getItem('activation_progress') || '{}');
  if (!progress[stepId]) {
    progress[stepId] = true;
    localStorage.setItem('activation_progress', JSON.stringify(progress));
    window.dispatchEvent(new Event('activation_updated'));
  }
};
