import { renderHook, act } from '@testing-library/react-hooks';
import { useHoldToTalk } from './useHoldToTalk';
import $ from 'jquery';

describe('useHoldToTalk', () => {
  let onStartMock: jest.Mock;
  let onEndMock: jest.Mock;
  let buttonElement: HTMLButtonElement;

  beforeEach(() => {
    onStartMock = jest.fn();
    onEndMock = jest.fn();
    buttonElement = document.createElement('button');
    document.body.appendChild(buttonElement);
  });

  afterEach(() => {
    document.body.removeChild(buttonElement);
  });

  it('calls onStart on mousedown and onEnd on mouseup', () => {
    const { result } = renderHook(() => useHoldToTalk(onStartMock, onEndMock));
    result.current.current = buttonElement;

    act(() => {
      $(buttonElement).trigger('mousedown');
    });
    expect(onStartMock).toHaveBeenCalledTimes(1);
    expect(onEndMock).not.toHaveBeenCalled();

    act(() => {
      $(window).trigger('mouseup');
    });
    expect(onEndMock).toHaveBeenCalledTimes(1);
  });

  it('calls onStart on touchstart and onEnd on touchend', () => {
    const { result } = renderHook(() => useHoldToTalk(onStartMock, onEndMock));
    result.current.current = buttonElement;

    act(() => {
      $(buttonElement).trigger('touchstart');
    });
    expect(onStartMock).toHaveBeenCalledTimes(1);
    expect(onEndMock).not.toHaveBeenCalled();

    act(() => {
      $(window).trigger('touchend');
    });
    expect(onEndMock).toHaveBeenCalledTimes(1);
  });

  it('calls onStart on pointerdown and onEnd on pointerup', () => {
    const { result } = renderHook(() => useHoldToTalk(onStartMock, onEndMock));
    result.current.current = buttonElement;

    act(() => {
      $(buttonElement).trigger('pointerdown');
    });
    expect(onStartMock).toHaveBeenCalledTimes(1);
    expect(onEndMock).not.toHaveBeenCalled();

    act(() => {
      $(window).trigger('pointerup');
    });
    expect(onEndMock).toHaveBeenCalledTimes(1);
  });

  it('cleans up event listeners on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useHoldToTalk(onStartMock, onEndMock),
    );
    result.current.current = buttonElement;

    act(() => {
      $(buttonElement).trigger('mousedown');
    });
    expect(onStartMock).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      $(buttonElement).trigger('mouseup'); // This should not trigger onEnd after unmount
    });
    expect(onEndMock).not.toHaveBeenCalled();
  });
});
