export const featureFlags = {
  savedViews: (import.meta.env.VITE_UI_SAVED_VIEWS ?? "true") !== "false",
};

export const SAVED_VIEWS_VERSION = 1;
