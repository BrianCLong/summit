import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { I18nProviderProps } from '../types';
import { initI18n, getI18nInstance } from '../config/i18next';

/**
 * I18n Provider Component
 *
 * Wraps the application with i18next provider and handles initialization.
 *
 * @example
 * ```tsx
 * import { I18nProvider } from '@intelgraph/i18n';
 *
 * function App() {
 *   return (
 *     <I18nProvider defaultLocale="en-US" fallbackLocale="en-US">
 *       <YourApp />
 *     </I18nProvider>
 *   );
 * }
 * ```
 */
export function I18nProvider({
  children,
  defaultLocale = 'en-US',
  fallbackLocale = 'en-US',
  debug = false,
}: I18nProviderProps) {
  const [i18nInstance, setI18nInstance] = useState(() => getI18nInstance());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initialize i18next if not already initialized
    if (!i18nInstance.isInitialized) {
      initI18n({
        defaultLocale,
        fallbackLocale,
        debug,
      }).then((instance) => {
        if (mounted) {
          setI18nInstance(instance);
          setIsInitialized(true);
        }
      });
    } else {
      setIsInitialized(true);
    }

    return () => {
      mounted = false;
    };
  }, [defaultLocale, fallbackLocale, debug, i18nInstance]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div>Loading translations...</div>
      </div>
    );
  }

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}

/**
 * HOC to wrap a component with I18nProvider
 *
 * @example
 * ```tsx
 * const AppWithI18n = withI18n(App, {
 *   defaultLocale: 'en-US',
 *   fallbackLocale: 'en-US'
 * });
 * ```
 */
export function withI18n<P extends object>(
  Component: React.ComponentType<P>,
  config?: Omit<I18nProviderProps, 'children'>
) {
  return (props: P) => (
    <I18nProvider {...config}>
      <Component {...props} />
    </I18nProvider>
  );
}
