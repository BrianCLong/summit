import { usePreferences } from "../context/PreferencesContext.jsx";

export default function AccessibilityToggle() {
  const { darkMode, highContrast, toggleDarkMode, toggleHighContrast } =
    usePreferences();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleDarkMode}
        aria-pressed={darkMode}
        aria-label="Toggle dark mode"
        className="px-2 py-1 border rounded focus:outline-none focus:ring"
      >
        <span aria-hidden="true">{darkMode ? "🌙" : "☀️"}</span>
        <span className="sr-only">
          {darkMode ? "Enable light mode" : "Enable dark mode"}
        </span>
      </button>
      <button
        type="button"
        onClick={toggleHighContrast}
        aria-pressed={highContrast}
        aria-label="Toggle high contrast mode"
        className="px-2 py-1 border rounded focus:outline-none focus:ring"
      >
        <span aria-hidden="true">⚡</span>
        <span className="sr-only">
          {highContrast ? "Disable high contrast" : "Enable high contrast"}
        </span>
      </button>
    </div>
  );
}
