import React, { PropsWithChildren } from 'react';
import { render, act as rtlAct } from '@testing-library/react';

type RenderHookResult<T> = {
  result: { current: T };
  unmount: () => void;
  rerender: () => void;
};

export function renderHook<T>(cb: () => T): RenderHookResult<T> {
  const result: { current: T | undefined } = { current: undefined };

  function HookContainer() {
    result.current = cb();
    return null;
  }

  const { unmount, rerender } = render(React.createElement(HookContainer));
  return {
    result: result as { current: T },
    unmount,
    rerender: () => rerender(React.createElement(HookContainer)),
  };
}

export const act = rtlAct;

