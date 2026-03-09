import { renderHook } from '@testing-library/react';
import { useGraphPersistence } from '../useGraphPersistence';

describe('useGraphPersistence', () => {
  let setItemSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('debounces localStorage updates', () => {
    const initialProps = {
      layout: 'cola',
      layoutOptions: { value: 1 },
      featureToggles: { toggle: true },
      nodeTypeColors: { type: 'red' },
    };

    const { rerender } = renderHook(
      (props) => useGraphPersistence(props),
      { initialProps }
    );

    // Should not save immediately
    expect(setItemSpy).not.toHaveBeenCalled();

    // Fast forward less than debounce time
    jest.advanceTimersByTime(500);
    expect(setItemSpy).not.toHaveBeenCalled();

    // Fast forward past debounce time
    jest.advanceTimersByTime(500); // Total 1000
    expect(setItemSpy).toHaveBeenCalledTimes(4); // 4 keys are set

    // Verify correct values
    expect(setItemSpy).toHaveBeenCalledWith('graphLayout', 'cola');
    expect(setItemSpy).toHaveBeenCalledWith('graphLayoutOptions', JSON.stringify({ value: 1 }));
  });

  it('coalesces rapid updates', () => {
    const { rerender } = renderHook(
        (props) => useGraphPersistence(props),
        {
            initialProps: {
                layout: 'cola',
                layoutOptions: { value: 1 },
                featureToggles: {},
                nodeTypeColors: {},
            }
        }
      );

      // Update 1
      rerender({
        layout: 'cola',
        layoutOptions: { value: 2 },
        featureToggles: {},
        nodeTypeColors: {},
      });

      // Update 2
      rerender({
        layout: 'cola',
        layoutOptions: { value: 3 },
        featureToggles: {},
        nodeTypeColors: {},
      });

      // Should not have called yet
      expect(setItemSpy).not.toHaveBeenCalled();

      // Fast forward
      jest.advanceTimersByTime(1000);

      // Should have called once (for the last state)
      expect(setItemSpy).toHaveBeenCalledTimes(4); // 4 keys
      expect(setItemSpy).toHaveBeenCalledWith('graphLayoutOptions', JSON.stringify({ value: 3 }));
  });
});
