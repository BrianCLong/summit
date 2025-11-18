/**
 * React 19 Compatibility Type Definitions
 *
 * This file patches type incompatibilities between React 19 and third-party libraries
 * that haven't updated their type definitions yet. The main issue is React 19's
 * updated ReactNode type that includes 'bigint', which older libraries don't support.
 */

import 'react'

declare module 'react' {
  // Override JSX element type checking to be more permissive
  namespace JSX {
    interface IntrinsicAttributes {
      [key: string]: any
    }
  }
}

// Patch for lucide-react icons compatibility
declare module 'lucide-react' {
  import { ForwardRefExoticComponent, SVGProps, RefAttributes } from 'react'

  export type LucideProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & RefAttributes<SVGSVGElement>
  export type LucideIcon = ForwardRefExoticComponent<LucideProps>
}

// Patch for react-router-dom compatibility
declare module 'react-router-dom' {
  export * from 'react-router-dom/dist/index'
}

// Patch for @heroicons/react compatibility
declare module '@heroicons/react/24/outline' {
  import { ComponentType, SVGProps } from 'react'
  const content: { [key: string]: ComponentType<SVGProps<SVGSVGElement>> }
  export = content
}

declare module '@heroicons/react/24/solid' {
  import { ComponentType, SVGProps } from 'react'
  const content: { [key: string]: ComponentType<SVGProps<SVGSVGElement>> }
  export = content
}

// Patch for cmdk (Command component)
declare module 'cmdk' {
  export * from 'cmdk/dist/index'
}

// Patch for Apollo Client - re-export React hooks from main module
declare module '@apollo/client' {
  export * from '@apollo/client/core'
  export * from '@apollo/client/react'
}

// Global type utilities for React 19 compatibility
declare global {
  namespace React {
    // Allow any component type to be used as JSX element
    type ComponentType<P = any> = React.ComponentClass<P> | React.FunctionComponent<P> | React.ForwardRefExoticComponent<P>
  }
}

export {}
