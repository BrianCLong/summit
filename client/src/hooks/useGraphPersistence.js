import { useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

/**
 * Hook to persist graph state to localStorage with debouncing.
 * This prevents blocking the main thread with synchronous IO during rapid state updates
 * (e.g., dragging sliders, color pickers).
 *
 * @param {Object} graphState - The graph state object from Redux
 * @param {string} graphState.layout
 * @param {Object} graphState.layoutOptions
 * @param {Object} graphState.featureToggles
 * @param {Object} graphState.nodeTypeColors
 * @param {number} delay - Debounce delay in ms (default 1000)
 */
export const useGraphPersistence = (graphState, delay = 1000) => {
  const debouncedSave = useMemo(
    () =>
      debounce((layout, layoutOptions, featureToggles, nodeTypeColors) => {
        try {
          localStorage.setItem('graphLayout', layout);
          localStorage.setItem('graphLayoutOptions', JSON.stringify(layoutOptions));
          localStorage.setItem('graphFeatureToggles', JSON.stringify(featureToggles));
          localStorage.setItem('graphNodeTypeColors', JSON.stringify(nodeTypeColors));
        } catch (e) {
          console.warn('Failed to save graph preferences to localStorage', e);
        }
      }, delay),
    [delay],
  );

  useEffect(() => {
    debouncedSave(
      graphState.layout,
      graphState.layoutOptions,
      graphState.featureToggles,
      graphState.nodeTypeColors
    );

    // Cancel any pending save on unmount
    return () => {
      debouncedSave.cancel();
    };
  }, [
    graphState.layout,
    graphState.layoutOptions,
    graphState.featureToggles,
    graphState.nodeTypeColors,
    debouncedSave,
  ]);
};
