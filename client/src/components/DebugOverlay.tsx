import React, { useState, useEffect } from 'react';
import GoldenPathValidator from './golden-path/GoldenPathValidator';

/**
 * DebugOverlay component
 * Displays current route, user context, and Golden Path validation status.
 * Can be toggled with a keyboard shortcut (e.g., Ctrl+Backtick).
 */
const DebugOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  // We can try to use location if Router is available, but TestApp doesn't seem to have a Router at root.
  // It might be inside a provider or not used. We'll use window.location as fallback.

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Toggle on Ctrl + ` (Backtick)
      if (e.ctrlKey && e.key === '`') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    // Simple breadcrumb tracking via history api patching or polling
    // Since we are outside Router context potentially, we use a simple listener
    const updateBreadcrumb = () => {
       const path = window.location.pathname;
       setBreadcrumbs(prev => {
           const newItem = `${new Date().toLocaleTimeString()} - ${path}`;
           if (prev[prev.length - 1] === newItem) return prev;
           return [...prev.slice(-4), newItem];
       });
    };

    updateBreadcrumb();
    window.addEventListener('popstate', updateBreadcrumb);
    // Determine if we can hook into pushState? A bit invasive.
    // We'll just update on interval for simplicity in this overlay
    const interval = setInterval(updateBreadcrumb, 1000);

    return () => {
        window.removeEventListener('popstate', updateBreadcrumb);
        clearInterval(interval);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '80vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#00ff00',
      fontFamily: 'monospace',
      padding: '16px',
      borderRadius: '8px',
      zIndex: 9999,
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      border: '1px solid #333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong>🕵️ Debug Overlay</strong>
        <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Current Path:</strong> {window.location.pathname}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Breadcrumbs:</strong>
        <ul style={{ paddingLeft: '15px', margin: '5px 0' }}>
          {breadcrumbs.map((b, i) => <li key={i} style={{ fontSize: '0.85em' }}>{b}</li>)}
        </ul>
      </div>

      <div style={{ borderTop: '1px solid #444', paddingTop: '10px' }}>
        <strong>Golden Path Status:</strong>
        <div style={{ marginTop: '5px', backgroundColor: '#fff', padding: '5px', borderRadius: '4px' }}>
             <GoldenPathValidator />
        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;
