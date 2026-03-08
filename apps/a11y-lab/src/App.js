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
const react_1 = __importStar(require("react"));
const A11yHeatmapOverlay_1 = require("./components/A11yHeatmapOverlay");
const ContrastBudgeter_1 = require("./components/ContrastBudgeter");
const FocusOrderPanel_1 = require("./components/FocusOrderPanel");
const useKeyboardTrapDetector_1 = require("./hooks/useKeyboardTrapDetector");
const screenReaderScripts_1 = require("./scripts/screenReaderScripts");
const focusOrder_1 = require("./scripts/focusOrder");
const guards_1 = require("./telemetry/guards");
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
    const [heatmapEnabled, setHeatmapEnabled] = (0, react_1.useState)(true);
    const [rtlEnabled, setRtlEnabled] = (0, react_1.useState)(false);
    const [textScale, setTextScale] = (0, react_1.useState)(1.1);
    const [axeViolations, setAxeViolations] = (0, react_1.useState)(null);
    const [focusOrder, setFocusOrder] = (0, react_1.useState)((0, focusOrder_1.computeFocusOrder)());
    const telemetryGuard = (0, react_1.useMemo)(() => new guards_1.TelemetryGuard(), []);
    const trap = (0, useKeyboardTrapDetector_1.useKeyboardTrapDetector)({
        threshold: 3,
        onTrap: (snapshot) => (0, screenReaderScripts_1.announce)(`Keyboard trap detected on ${snapshot.nodeLabel}`),
    });
    (0, react_1.useEffect)(() => {
        const cleanup = (0, screenReaderScripts_1.applyLiveRegionAnnouncer)();
        (0, screenReaderScripts_1.ensureSkipLink)();
        (0, screenReaderScripts_1.provideScreenReaderShortcuts)({ selectors: focusableSelectors });
        telemetryGuard.enforceNoAnalytics();
        return cleanup;
    }, [telemetryGuard]);
    (0, react_1.useEffect)(() => {
        document.documentElement.dir = rtlEnabled ? 'rtl' : 'ltr';
    }, [rtlEnabled]);
    (0, react_1.useEffect)(() => {
        document.documentElement.style.fontSize = `${Math.round(textScale * 100)}%`;
    }, [textScale]);
    (0, react_1.useEffect)(() => {
        setFocusOrder((0, focusOrder_1.computeFocusOrder)());
    }, [heatmapEnabled, textScale, rtlEnabled]);
    const runAxe = async () => {
        const axe = await Promise.resolve().then(() => __importStar(require('axe-core')));
        const results = await axe.default.run(document, {
            resultTypes: ['violations'],
            runOnly: ['wcag2a', 'wcag2aa'],
        });
        telemetryGuard.blockContentAnalytics(results);
        const critical = results.violations.filter((violation) => violation.impact === 'critical');
        setAxeViolations(critical.length);
        (0, screenReaderScripts_1.announce)(`Axe gate found ${critical.length} critical items`);
    };
    const textScaleLabel = `${Math.round(textScale * 100)}% text`;
    return (<main id="main" className="app-shell" aria-label="Accessibility automation lab">
      <div className="sr-only" id="live-region" aria-live="polite"/>
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
            <input type="checkbox" checked={heatmapEnabled} onChange={(event) => setHeatmapEnabled(event.target.checked)}/>
            A11y heatmap
          </label>
          <label>
            <input type="checkbox" checked={rtlEnabled} onChange={(event) => setRtlEnabled(event.target.checked)}/>
            RTL stress
          </label>
          <label>
            <input type="range" aria-label="text scale" min="1" max="1.4" step="0.05" value={textScale} onChange={(event) => setTextScale(Number(event.target.value))}/>
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
          {axeViolations !== null && (<p aria-live="polite">Critical violations: {axeViolations}</p>)}
        </div>
        <div className="card">
          <h3>Contrast budgeter</h3>
          <p>WCAG AA/AAA guardrails with live contrast ratios.</p>
          <ContrastBudgeter_1.ContrastBudgeter palette={palette} minimumRatio={4.5}/>
        </div>
        <div className="card">
          <h3>Keyboard trap detector</h3>
          <p>Tabs are sampled for focus loops to prevent traps.</p>
          {trap ? (<div className="alert" role="alert">
              Trap detected at {trap.nodeLabel} · {trap.recentTabStops} consecutive Tab hits.
            </div>) : (<p>No traps detected during this session.</p>)}
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
          <button className="button secondary" type="button" onClick={() => setFocusOrder((0, focusOrder_1.computeFocusOrder)())}>
            Refresh map
          </button>
        </div>
        <FocusOrderPanel_1.FocusOrderPanel steps={focusOrder}/>
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

      <A11yHeatmapOverlay_1.A11yHeatmapOverlay enabled={heatmapEnabled}/>
    </main>);
}
exports.default = App;
