import { useEffect } from 'react';
import { computeFocusOrder } from '../scripts/focusOrder';

type Props = {
  enabled: boolean;
};

const focusableSelector =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]';

export function A11yHeatmapOverlay({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) {
      removeOverlays();
      return undefined;
    }

    const overlayHost = document.createElement('div');
    overlayHost.setAttribute('data-a11y-heatmap', 'true');
    overlayHost.style.position = 'fixed';
    overlayHost.style.inset = '0';
    overlayHost.style.pointerEvents = 'none';
    overlayHost.style.zIndex = '2147483646';
    document.body.appendChild(overlayHost);

    const focusable = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector));
    const focusOrder = computeFocusOrder();

    focusable.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const marker = document.createElement('div');
      marker.setAttribute('role', 'presentation');
      marker.setAttribute('data-a11y-heatmap-marker', 'true');
      marker.style.position = 'absolute';
      marker.style.left = `${rect.left + window.scrollX}px`;
      marker.style.top = `${rect.top + window.scrollY}px`;
      marker.style.width = `${rect.width}px`;
      marker.style.height = `${rect.height}px`;
      marker.style.borderRadius = '10px';
      marker.style.border = '2px solid rgba(14, 165, 233, 0.7)';
      marker.style.background = 'linear-gradient(90deg, rgba(14,165,233,0.14), rgba(16,185,129,0.18))';
      marker.style.boxShadow = '0 0 0 1px rgba(14, 165, 233, 0.6)';
      marker.style.color = '#0f172a';
      marker.style.fontSize = '12px';
      marker.style.display = 'flex';
      marker.style.alignItems = 'center';
      marker.style.justifyContent = 'center';
      marker.style.pointerEvents = 'none';
      marker.style.backdropFilter = 'blur(1px)';
      marker.textContent = `${index + 1}`;
      overlayHost.appendChild(marker);
    });

    focusOrder.forEach((step) => {
      const label = document.createElement('div');
      label.setAttribute('data-a11y-heatmap-marker', 'true');
      label.style.position = 'fixed';
      label.style.left = '12px';
      label.style.bottom = `${12 + step.index * 24}px`;
      label.style.padding = '2px 6px';
      label.style.background = '#0ea5e9';
      label.style.color = '#ffffff';
      label.style.borderRadius = '8px';
      label.style.fontSize = '12px';
      label.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.25)';
      label.textContent = `${step.index}. ${step.nodeLabel}`;
      overlayHost.appendChild(label);
    });

    return () => removeOverlays();
  }, [enabled]);

  return null;
}

function removeOverlays() {
  document.querySelector('[data-a11y-heatmap]')?.remove();
  document.querySelectorAll('[data-a11y-heatmap-marker]').forEach((marker) => marker.remove());
}
