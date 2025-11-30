import React, { useEffect, useMemo, useState } from 'react';
import { A11yHeatmapOverlay } from './components/A11yHeatmapOverlay';
import { ContrastBudgeter } from './components/ContrastBudgeter';
import { FocusOrderPanel } from './components/FocusOrderPanel';
import { useKeyboardTrapDetector } from './hooks/useKeyboardTrapDetector';
import {
  announce,
  applyLiveRegionAnnouncer,
  ensureSkipLink,
  provideScreenReaderShortcuts,
} from './scripts/screenReaderScripts';
import { computeFocusOrder } from './scripts/focusOrder';
import { TelemetryGuard } from './telemetry/guards';

const palette = [
  { name: 'Primary CTA', foreground: '#0f172a', background: '#0ea5e9' },
  { name: 'Surface', foreground: '#0f172a', background: '#ffffff' },
  { name: 'Muted', foreground: '#475569', background: '#e2e8f0' },
];

const focusableSelectors = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
];

function App() {
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [rtlEnabled, setRtlEnabled] = useState(false);
  const [textScale, setTextScale] = useState(1.1);
  const [axeViolations, setAxeViolations] = useState<number | null>(null);
  const [focusOrder, setFocusOrder] = useState(computeFocusOrder());
  const telemetryGuard = useMemo(() => new TelemetryGuard(), []);

  const trap = useKeyboardTrapDetector({
    threshold: 3,
    onTrap: (snapshot) => announce(`Keyboard trap detected on ${snapshot.nodeLabel}`),
  });

  useEffect(() => {
    const cleanup = applyLiveRegionAnnouncer();
    ensureSkipLink();
    provideScreenReaderShortcuts({ selectors: focusableSelectors });
    telemetryGuard.enforceNoAnalytics();
    return cleanup;
  }, [telemetryGuard]);

  useEffect(() => {
    document.documentElement.dir = rtlEnabled ? 'rtl' : 'ltr';
  }, [rtlEnabled]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${Math.round(textScale * 100)}%`;
  }, [textScale]);

  useEffect(() => {
    setFocusOrder(computeFocusOrder());
  }, [heatmapEnabled, textScale, rtlEnabled]);

  const runAxe = async () => {
    const axe = await import('axe-core');
    const results = await axe.default.run(document, {
      resultTypes: ['violations'],
      runOnly: ['wcag2a', 'wcag2aa'],
    });
    telemetryGuard.blockContentAnalytics(results);
    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    setAxeViolations(critical.length);
    announce(`Axe gate found ${critical.length} critical items`);
  };

  const textScaleLabel = `${Math.round(textScale * 100)}% text`; 

  return (
    <main id="main" className="app-shell" aria-label="Accessibility automation lab">
      <div className="sr-only" id="live-region" aria-live="polite" />
      <div className="header">
        <div>
          <p className="badge" aria-label="accessibility lab">
            A11y lab · axe + keyboard + SR drills
          </p>
          <h1>Accessibility Lab</h1>
          <p>Automated a11y gates with privacy guards, plus human-in-the-loop checklists.</p>
        </div>
        <div className="toggle" role="group" aria-label="view options">
          <label>
            <input
              type="checkbox"
              checked={heatmapEnabled}
              onChange={(event) => setHeatmapEnabled(event.target.checked)}
            />
            A11y heatmap
          </label>
          <label>
            <input
              type="checkbox"
              checked={rtlEnabled}
              onChange={(event) => setRtlEnabled(event.target.checked)}
            />
            RTL stress
          </label>
          <label>
            <input
              type="range"
              aria-label="text scale"
              min="1"
              max="1.4"
              step="0.05"
              value={textScale}
              onChange={(event) => setTextScale(Number(event.target.value))}
            />
            <span aria-live="polite">{textScaleLabel}</span>
          </label>
        </div>
      </div>

      <div className="control-grid" aria-label="automation stack">
        <div className="card">
          <h3>axe-core gate</h3>
          <p>Run axe in-page to block critical issues before merges.</p>
          <button className="button" onClick={runAxe} type="button">
            Run axe analysis
          </button>
          {axeViolations !== null && (
            <p aria-live="polite">Critical violations: {axeViolations}</p>
          )}
        </div>
        <div className="card">
          <h3>Contrast budgeter</h3>
          <p>WCAG AA/AAA guardrails with live contrast ratios.</p>
          <ContrastBudgeter palette={palette} minimumRatio={4.5} />
        </div>
        <div className="card">
          <h3>Keyboard trap detector</h3>
          <p>Tabs are sampled for focus loops to prevent traps.</p>
          {trap ? (
            <div className="alert" role="alert">
              Trap detected at {trap.nodeLabel} · {trap.recentTabStops} consecutive Tab hits.
            </div>
          ) : (
            <p>No traps detected during this session.</p>
          )}
          <p>
            Accessible targets: {focusOrder.length} · Tracking {focusableSelectors.join(', ')}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="header" style={{ gap: '0.5rem' }}>
          <div>
            <h3>Focus order map</h3>
            <p>Exports tab order and labels for quick audits.</p>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => setFocusOrder(computeFocusOrder())}
          >
            Refresh map
          </button>
        </div>
        <FocusOrderPanel steps={focusOrder} />
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Assistive scripts</h3>
        <p>
          Live region updates, skip links, and input labels are injected for screen readers; telemetry is
          scrubbed to avoid content analytics.
        </p>
        <ul>
          <li>Text scale stress: {textScaleLabel}</li>
          <li>Direction: {rtlEnabled ? 'RTL' : 'LTR'}</li>
          <li>Telemetry guard: {telemetryGuard.analyticsEnabled ? 'disabled' : 'blocked'}</li>
        </ul>
      </div>

      <A11yHeatmapOverlay enabled={heatmapEnabled} />
    </main>
  );
}

export default App;
