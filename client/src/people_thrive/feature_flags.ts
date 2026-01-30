/**
 * Feature flags for the People Thrive subsystem.
 * Default: All features are OFF unless explicitly enabled.
 */

export const FEATURE_FLAGS = {
  PEOPLE_THRIVE_UI: import.meta.env.VITE_PEOPLE_THRIVE_UI === 'true' || false,
  PEOPLE_THRIVE_INCIDENTS: import.meta.env.VITE_PEOPLE_THRIVE_INCIDENTS === 'true' || false,
};
