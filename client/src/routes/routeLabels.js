const staticRouteLabels = {
  '/': 'Home',
  '/login': 'Login',
  '/demo': 'Demo Walkthrough',
};

export const buildRouteLabels = (navigationItems) =>
  navigationItems.reduce(
    (acc, item) => {
      acc[item.path] = item.label;
      return acc;
    },
    { ...staticRouteLabels },
  );

export const resolveDemoFlag = () => {
  if (typeof window !== 'undefined' && window.__INTELGRAPH_DEMO_MODE) {
    return window.__INTELGRAPH_DEMO_MODE;
  }

  return process.env?.VITE_DEMO_MODE || '';
};

export { staticRouteLabels };
