/// <reference types="vite/client" />

// Fix for React 18/19 type compatibility issues with react-router-dom and lucide-react
// This override resolves JSX component type conflicts between different @types/react versions

import type { ReactNode, ReactElement } from "react";

declare module "react" {
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES {}
}

declare global {
  namespace JSX {
    type ElementType = string | React.ComponentType<any>;
  }
}

export {};
